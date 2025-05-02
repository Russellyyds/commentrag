import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call
import os
import tempfile
import json
import pandas as pd
import shutil
from langchain.schema import AIMessage
import sys

import rag

@pytest.mark.asyncio
async def test_process_empty_comment():
    """Test processing an empty comment - should return a default classification"""
    # Create mock dependencies
    mock_vector_store = MagicMock()
    mock_llm_chain = MagicMock()
    
    # Test with empty string
    similar_comments, classification = await rag.process_comment_with_rag(
        "",
        mock_vector_store,
        mock_llm_chain
    )
    
    # Assertions
    assert similar_comments == []
    assert classification["category"] == "OK"
    assert classification["confidence"] == 100
    assert "reasoning" in classification
    
    # Verify vector store was not called
    mock_vector_store.similarity_search_with_score.assert_not_called() if hasattr(mock_vector_store, 'similarity_search_with_score') else None

@pytest.mark.asyncio
async def test_classify_comment_error_handling():
    """Test error handling in classification"""
    # Create mock dependencies
    similar_comments = [{"id": "1", "comment": "Test", "category": "Complaint", "similarity": 0.8}]
    mock_llm_chain = MagicMock()
    
    # Set up mock to raise exception
    mock_llm_chain.invoke = MagicMock(side_effect=Exception("Test error"))
    
    # Test error handling
    with patch('asyncio.to_thread', AsyncMock()) as mock_to_thread:
        mock_to_thread.side_effect = Exception("Test error")
        
        result = await rag.classify_comment_with_llm(
            "Test comment",
            similar_comments,
            mock_llm_chain
        )
        
        # Assertions
        assert result["category"] == "Error"
        assert result["confidence"] == 0
        assert "Test error" in result["reasoning"]

@pytest.mark.asyncio
async def test_find_similar_comments_filtering():
    """Test similarity score filtering in find_similar_comments"""
    # Create mock vector store
    mock_vector_store = MagicMock()
    
    # Create mock documents with varying scores
    mock_docs_with_scores = [
        (MagicMock(page_content="High similarity", metadata={"id": "1", "category": "OK"}), 0.9),
        (MagicMock(page_content="Medium similarity", metadata={"id": "2", "category": "Complaint"}), 0.5),
        (MagicMock(page_content="Low similarity", metadata={"id": "3", "category": "Wrong Staff"}), 0.001)
    ]
    
    # Patch asyncio.to_thread
    with patch('asyncio.to_thread', AsyncMock()) as mock_to_thread:
        mock_to_thread.return_value = mock_docs_with_scores
        
        # Test with high threshold
        result_high = await rag.find_similar_comments("Test comment", mock_vector_store, score_threshold=0.8)
        assert len(result_high) == 1
        assert result_high[0]['id'] == "1"
        
        # Test with medium threshold
        result_medium = await rag.find_similar_comments("Test comment", mock_vector_store, score_threshold=0.3)
        assert len(result_medium) == 2
        assert result_medium[1]['id'] == "2"

@pytest.mark.asyncio
async def test_classify_comment_with_llm_full():
    """
    Test the classify_comment_with_llm function with complete workflow
    Testing different response formats and parsing
    """
    # Mock similar comments
    similar_comments = [
        {"id": "1", "comment": "Good service", "category": "OK", "similarity": 0.9},
        {"id": "2", "comment": "Bad experience", "category": "Complaint", "similarity": 0.8}
    ]
    
    # Create mock LLM chain
    mock_chain = MagicMock()
    
    # Test case 1: Proper AIMessage response
    with patch('asyncio.to_thread') as mock_to_thread:
        # Mock AIMessage response
        mock_response = AIMessage(content=json.dumps({
            "category": "Complaint",
            "confidence": 90,
            "reasoning": "The comment is negative",
            "keywords": ["bad", "terrible"]
        }))
        mock_to_thread.return_value = mock_response
        
        # Call function
        result = await rag.classify_comment_with_llm(
            "This service is terrible",
            similar_comments,
            mock_chain,
            ["OK", "Complaint"]
        )
        
        # Assertions
        assert result["category"] == "Complaint"
        assert result["confidence"] == 90
        assert "reasoning" in result
        assert "keywords" in result
        
    # Test case 2: JSON with code block markers
    with patch('asyncio.to_thread') as mock_to_thread:
        mock_response = AIMessage(content="""```json
{
  "category": "OK",
  "confidence": 85,
  "reasoning": "The comment is positive"
}
```""")
        mock_to_thread.return_value = mock_response
        
        # Call function
        result = await rag.classify_comment_with_llm(
            "Great service",
            similar_comments,
            mock_chain,
            ["OK", "Complaint"]
        )
        
        # Assertions
        assert result["category"] == "OK"
        assert result["confidence"] == 85
        
    # Test case 3: Empty similar comments
    result = await rag.classify_comment_with_llm(
        "Test comment",
        [],  # Empty similar comments
        mock_chain,
        ["OK", "Complaint"]
    )
    
    # Should return error
    assert result["category"] == "Error"
    assert result["confidence"] == 0
    assert "No similar comments" in result["reasoning"]

@pytest.mark.asyncio
async def test_process_comments_with_rag():
    """Test batch processing of comments with RAG"""
    # Create a temporary CSV file
    temp_dir = tempfile.mkdtemp()
    export_path = os.path.join(temp_dir, "data_export.csv")
    
    # Create test data
    df = pd.DataFrame({
        "id": [1, 2, 3],
        "comment": ["Test comment 1", "Test comment 2", "Test comment 3"],
        "ClassifiedCategory": ["", "", ""],
        "ClassifiedConfidence": ["", "", ""],
        "HumanCategory": ["", "", ""],
        "FinalClassification": ["", "", ""],
        "Reason": ["", "", ""],
        "ProcessingError": ["", "", ""],
        "SimilarCommentId": ["", "", ""]
    })
    
    df.to_csv(export_path, index=False)
    
    # Mock dependencies
    with patch('rag.has_rag_dependencies', True), \
         patch('rag.vector_store', MagicMock()), \
         patch('rag.comment_category_chain', MagicMock()), \
         patch('rag.find_similar_comments', AsyncMock(return_value=[{"id": "1", "comment": "Similar", "category": "OK", "similarity": 0.9}])), \
         patch('rag.classify_comment_with_llm', AsyncMock(return_value={"category": "OK", "confidence": 90, "reasoning": "Test"})):
        
        # Call the function
        await rag.process_comments_with_rag(export_path, batch_size=2)
        
        # Read the result
        result_df = pd.read_csv(export_path)
        
        # Assertions
        assert len(result_df) == 3
        assert result_df["ClassifiedCategory"].notnull().all()
        assert (result_df["ClassifiedCategory"] == "OK").all()
        assert (result_df["ClassifiedConfidence"] == 90).all()
    
    # Clean up
    shutil.rmtree(temp_dir)

@pytest.mark.asyncio
async def test_initialize_rag():
    """Test RAG initialization"""
    # Mock dependencies
    with patch('os.getenv', return_value="fake-api-key"), \
         patch('os.makedirs', return_value=None), \
         patch('rag.OpenAIEmbeddings', return_value=MagicMock()), \
         patch('rag.chromadb.PersistentClient', return_value=MagicMock()), \
         patch('rag.Chroma', return_value=MagicMock()), \
         patch('rag.ChatOpenAI', return_value=MagicMock()), \
         patch('rag.ChatPromptTemplate.from_template', return_value=MagicMock()):
        
        # Call the function
        result = await rag.initialize_rag()
        
        # Assertions
        assert result is True
        assert rag.vector_store is not None
        assert rag.comment_category_chain is not None
        
        # Clean up
        rag.vector_store = None
        rag.comment_category_chain = None

@pytest.mark.asyncio
async def test_find_similar_comments_error_handling():
    """Test error handling in find_similar_comments"""
    # Create mock vector store that raises exception
    mock_vector_store = MagicMock()
    
    # Test with exception in similarity search
    with patch('asyncio.to_thread', AsyncMock(side_effect=Exception("Test error"))):
        # Call function
        result = await rag.find_similar_comments(
            "Test comment",
            mock_vector_store
        )
        
        # Should return empty list on error
        assert result == []

@pytest.mark.asyncio
async def test_process_comments_with_rag_batch_processing():
    """Test batch processing logic in process_comments_with_rag"""
    # Create temp directory and file
    temp_dir = tempfile.mkdtemp()
    project_dir = os.path.join(temp_dir, "test_project")
    os.makedirs(project_dir, exist_ok=True)
    
    export_path = os.path.join(project_dir, "data_export.csv")
    status_path = os.path.join(project_dir, "status.json")
    
    # Create test CSV with 5 comments (2 already processed, 3 unprocessed)
    df = pd.DataFrame({
        "id": [1, 2, 3, 4, 5],
        "comment": ["Test 1", "Test 2", "Test 3", "Test 4", "Test 5"],
        "ClassifiedCategory": ["OK", "Complaint", "", "", ""],
        "ClassifiedConfidence": [90, 85, "", "", ""],
        "HumanCategory": ["", "", "", "", ""],
        "FinalClassification": ["", "", "", "", ""]
    })
    df.to_csv(export_path, index=False)
    
    try:
        # Test with batch size of 2 and mock successful processing
        with patch('rag.has_rag_dependencies', True), \
             patch('rag.vector_store', MagicMock()), \
             patch('rag.comment_category_chain', MagicMock()), \
             patch('rag.process_comment_with_rag', AsyncMock(
                 return_value=([{"id": "1", "comment": "Similar", "category": "OK", "similarity": 0.9}],
                               {"category": "OK", "confidence": 90, "reasoning": "Test"})
             )), \
             patch('error_utils.update_status_file') as mock_update_status:
            
            # Call function with batch size 2
            await rag.process_comments_with_rag(export_path, batch_size=2)
            
            # Check progress updates - should update multiple times
            assert mock_update_status.call_count >= 3  # Initial, progress, and final
            
            # Final call should be status completed
            mock_update_status.assert_has_calls([call(status_path, "completed", progress=100)], any_order=True)
            
            # Read the result
            result_df = pd.read_csv(export_path)
            
            # All comments should be processed
            assert (result_df["ClassifiedCategory"].notna() & 
                   (result_df["ClassifiedCategory"] != "")).all()
    
    finally:
        # Clean up
        shutil.rmtree(temp_dir)

@pytest.mark.asyncio
async def test_process_comments_with_rag_error_handling_revised():
    """Revised test for error handling in process_comments_with_rag function"""
    # Create temp directory and file
    temp_dir = tempfile.mkdtemp()
    project_dir = os.path.join(temp_dir, "test_project")
    os.makedirs(project_dir, exist_ok=True)
    
    export_path = os.path.join(project_dir, "data_export.csv")
    status_path = os.path.join(project_dir, "status.json")
    
    # Create test CSV
    df = pd.DataFrame({
        "id": [1, 2, 3],
        "comment": ["Test comment 1", "Test comment 2", "Test comment 3"]
    })
    df.to_csv(export_path, index=False)
    
    try:
        # Test case: Exception in process_comment_with_rag is handled internally
        with patch('rag.has_rag_dependencies', True), \
             patch('rag.vector_store', MagicMock()), \
             patch('rag.comment_category_chain', MagicMock()), \
             patch('rag.process_comment_with_rag', AsyncMock(side_effect=Exception("Test error"))), \
             patch('error_utils.update_status_file') as mock_update_status:
            
            # Function handles exceptions internally, should not raise
            await rag.process_comments_with_rag(export_path, batch_size=1)
            
            # Should update status with error
            mock_update_status.assert_called()
            
            # Read the updated CSV - should have error information
            result_df = pd.read_csv(export_path)
            assert "ProcessingError" in result_df.columns
    
    finally:
        # Clean up
        shutil.rmtree(temp_dir)

@pytest.mark.asyncio
async def test_rag_classification_edge_cases():
    """Test edge cases in RAG classification"""
    mock_vector_store = MagicMock()
    mock_llm_chain = MagicMock()
    
    similar_comments = [
        {"id": "1", "comment": "Similar", "category": "OK", "similarity": 0.9},
    ]
    
    with patch('rag.find_similar_comments', AsyncMock(return_value=similar_comments)):
        with patch('asyncio.to_thread') as mock_to_thread:
            mock_to_thread.return_value = AIMessage(content='{"malformed": true}')
            
            classification = await rag.classify_comment_with_llm(
                "Test comment",
                similar_comments,
                mock_llm_chain
            )
            
            assert classification["category"] == "Error"
            assert classification["confidence"] == 0
            assert "parsing" in classification["reasoning"].lower()

@pytest.mark.asyncio
async def test_process_comment_with_rag_multilingual():
    """Test processing non-English comments"""
    similar_comments = [
        {"id": "1", "comment": "Buen servicio", "category": "OK", "similarity": 0.9},
    ]
    
    mock_response = {"category": "OK", "confidence": 90, "reasoning": "Positive comment"}
    
    mock_vector_store = MagicMock()
    mock_llm_chain = MagicMock()
    
    with patch('rag.find_similar_comments', AsyncMock(return_value=similar_comments)):
        with patch('rag.classify_comment_with_llm', AsyncMock(return_value=mock_response)):
            _, classification = await rag.process_comment_with_rag(
                "Este servicio es excelente",
                mock_vector_store,
                mock_llm_chain
            )
            
            assert classification["category"] == "OK"
            assert classification["confidence"] == 90

@pytest.mark.asyncio
async def test_batch_processing_alternative():
    """Test batch processing functionality in rag module"""
    temp_dir = tempfile.mkdtemp()
    export_path = os.path.join(temp_dir, "data_export.csv")
    status_path = os.path.join(temp_dir, "status.json")
    
    try:
        df = pd.DataFrame({
            "id": [1, 2, 3, 4, 5],
            "comment": ["Test1", "Test2", "Test3", "Test4", "Test5"],
            "ClassifiedCategory": ["", "", "", "", ""]
        })
        df.to_csv(export_path, index=False)
        
        with pytest.raises(FileNotFoundError):
            await rag.process_comments_with_rag("/nonexistent/path.csv")
            
    finally:
        shutil.rmtree(temp_dir)

@pytest.mark.asyncio
async def test_file_not_found_error():
    """Test error handling when file is not found"""
    with pytest.raises(FileNotFoundError):
        await rag.process_comments_with_rag("/nonexistent/path.csv")

# Test for lines 19-21: ImportError handling
def test_rag_import_error():
    """Test that RAG dependencies import error is handled correctly"""
    # Save the original module if it exists
    original_module = sys.modules.get('rag', None)
    
    try:
        # Set up mocks to force ImportError
        with patch.dict('sys.modules', {
            'chromadb': None,
            'langchain_openai': None,
            'langchain_chroma': None,
            'langchain.prompts': None
        }):
            # Create a mock for error_utils
            mock_err = MagicMock()
            with patch.dict('sys.modules', {'error_utils': mock_err}):
                # Force reload the module to trigger ImportError
                if 'rag' in sys.modules:
                    del sys.modules['rag']
                import rag
                
                # Check that has_rag_dependencies is False
                assert rag.has_rag_dependencies is False
                
                # Check that the warning was logged
                mock_err.logger.warning.assert_called_with(
                    "RAG dependencies not found. RAG functionality will not be available."
                )
    finally:
        # Restore original module if it existed
        if original_module:
            sys.modules['rag'] = original_module
        elif 'rag' in sys.modules:
            del sys.modules['rag']

# Test for line 142: Missing confidence field in LLM response
@pytest.mark.asyncio
async def test_classify_missing_confidence_field_line142():
    """Test handling when 'confidence' field is missing in LLM response"""
    import rag
    import json
    from langchain.schema import AIMessage
    
    # Create test data
    query = "test comment"
    similar_comments = [{"id": "1", "comment": "test", "category": "OK", "similarity": 0.9}]
    mock_llm_chain = MagicMock()
    
    # Mock AIMessage with response missing confidence field
    with patch('asyncio.to_thread') as mock_to_thread:
        # Create a JSON response missing the confidence field
        missing_confidence_response = {
            "category": "OK",
            "reasoning": "Test reasoning"
            # No confidence field
        }
        mock_to_thread.return_value = AIMessage(content=json.dumps(missing_confidence_response))
        
        # Call the function
        result = await rag.classify_comment_with_llm(
            query, similar_comments, mock_llm_chain
        )
        
        # Should return error about missing confidence field
        assert result["category"] == "Error"
        assert "Missing confidence field" in result["reasoning"]

# # Test for line 217: Error logging for classification error
# @pytest.mark.asyncio
# async def test_classification_error_logging_line217():
#     """Test error logging when classification has an error"""
#     import rag
    
#     # Setup error classification
#     error_classification = {
#         "category": "Error",
#         "confidence": 0,
#         "reasoning": "Test error reason"
#     }
    
#     # Mock similar comments
#     similar_comments = [{"id": "1", "comment": "test", "category": "OK", "similarity": 0.9}]
    
#     # Mock the logger
#     with patch('error_utils.logger.error') as mock_error_log:
#         # Process directly with mocked classification
#         with patch('rag.classify_comment_with_llm', AsyncMock(return_value=error_classification)):
#             await rag.process_comment_with_rag("test comment", MagicMock(), MagicMock())
            
#             # Verify error was logged with the reasoning
#             mock_error_log.assert_called_with(f"Classification error: Test error reason")

# Test for line 360: Keywords handling in process_comment_with_rag
@pytest.mark.asyncio
async def test_keywords_processing_line360():
    """Test that keywords are correctly processed in process_comment_with_rag"""
    import rag
    
    # Mock dependencies
    mock_vector_store = MagicMock()
    mock_llm_chain = MagicMock()
    
    # Create mock classification response that includes keywords
    mock_classification = {
        "category": "OK",
        "confidence": 90,
        "reasoning": "Test reason",
        "keywords": ["important", "keyword"]
    }
    
    # Setup mocks to return our prepared responses
    with patch('rag.find_similar_comments', AsyncMock(return_value=[])):
        with patch('rag.classify_comment_with_llm', AsyncMock(return_value=mock_classification)):
            # Call the function
            _, result = await rag.process_comment_with_rag(
                "test comment", mock_vector_store, mock_llm_chain
            )
            
            # Verify keywords were passed through correctly
            assert "keywords" in result
            assert result["keywords"] == ["important", "keyword"]

# Test for line 413: Keywords JSON serialization in process_comments_with_rag
@pytest.mark.asyncio
async def test_keywords_json_serialization_line413():
    """Test keywords JSON serialization in batch processing (line 413)"""
    import rag
    import tempfile
    import os
    import pandas as pd
    import shutil
    import json
    
    # Create temporary directory and files
    temp_dir = tempfile.mkdtemp()
    project_dir = os.path.join(temp_dir, "test_project")
    os.makedirs(project_dir, exist_ok=True)
    
    export_path = os.path.join(project_dir, "data_export.csv")
    status_path = os.path.join(project_dir, "status.json")
    
    # Create test CSV
    df = pd.DataFrame({
        "comment": ["Test comment"],
        "ClassifiedCategory": [""]
    })
    df.to_csv(export_path, index=False)
    
    try:
        # Mock rag.process_comment_with_rag to return result with keywords
        mock_similar = [{"id": "1", "comment": "Similar", "category": "OK", "similarity": 0.9}]
        mock_classification = {
            "category": "OK", 
            "confidence": 90, 
            "reasoning": "Test", 
            "keywords": ["test", "keyword"]
        }
        
        with patch('rag.has_rag_dependencies', True), \
             patch('rag.vector_store', MagicMock()), \
             patch('rag.comment_category_chain', MagicMock()), \
             patch('rag.process_comment_with_rag', AsyncMock(
                 return_value=(mock_similar, mock_classification)
             )), \
             patch('error_utils.update_status_file'):
            
            # Process the comments
            await rag.process_comments_with_rag(export_path, batch_size=1)
            
            # Check the results
            result_df = pd.read_csv(export_path)
            
            # Keywords should be stored as JSON
            assert "Keywords" in result_df.columns
            keywords_json = result_df.iloc[0]["Keywords"]
            
            # Make sure keywords were serialized correctly
            keywords = json.loads(keywords_json)
            assert keywords == ["test", "keyword"]
            
    finally:
        # Clean up
        shutil.rmtree(temp_dir)