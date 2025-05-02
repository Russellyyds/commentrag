import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call
import os
import tempfile
import json
import pandas as pd
import shutil
from langchain.schema import AIMessage

import rag
import error_utils as err

@pytest.mark.asyncio
async def test_rag_missing_dependencies():
    """Test behaviors when RAG dependencies are missing"""
    with patch('rag.has_rag_dependencies', False):
        # Test initialize_rag with missing dependencies
        result = await rag.initialize_rag()
        assert result is False
        assert rag.vector_store is None
        assert rag.comment_category_chain is None

@pytest.mark.asyncio
async def test_process_comments_dependencies_missing():
    """Test process_comments_with_rag when dependencies are missing"""
    # Create temp directory and file
    temp_dir = tempfile.mkdtemp()
    export_path = os.path.join(temp_dir, "data_export.csv")
    
    # Create test CSV
    df = pd.DataFrame({"comment": ["Test"]})
    df.to_csv(export_path, index=False)
    
    try:
        # Test with missing dependencies
        with patch('rag.has_rag_dependencies', False), \
             patch('rag.vector_store', None), \
             patch('rag.comment_category_chain', None), \
             patch('error_utils.update_status_file') as mock_update_status:
            
            with pytest.raises(RuntimeError) as excinfo:
                await rag.process_comments_with_rag(export_path)
            
            assert "RAG functionality is not available" in str(excinfo.value)
            mock_update_status.assert_called()
    finally:
        shutil.rmtree(temp_dir)

@pytest.mark.asyncio
async def test_classify_comment_with_llm_parsing_failures():
    """Test handling of various LLM response parsing failures"""
    similar_comments = [{"id": "1", "comment": "Test", "category": "OK", "similarity": 0.9}]
    mock_llm_chain = MagicMock()
    
    # Test case 1: Missing category field
    with patch('asyncio.to_thread') as mock_to_thread:
        mock_to_thread.return_value = AIMessage(content=json.dumps({
            "confidence": 90,
            "reasoning": "Test reasoning"
        }))
        
        result = await rag.classify_comment_with_llm(
            "Test comment",
            similar_comments,
            mock_llm_chain
        )
        
        assert result["category"] == "Error"
        assert "Missing category field" in result["reasoning"]
    
    # Test case 2: Invalid confidence value
    with patch('asyncio.to_thread') as mock_to_thread:
        mock_to_thread.return_value = AIMessage(content=json.dumps({
            "category": "OK",
            "confidence": "high", # Not a number
            "reasoning": "Test reasoning"
        }))
        
        result = await rag.classify_comment_with_llm(
            "Test comment",
            similar_comments,
            mock_llm_chain
        )
        
        assert result["category"] == "Error"
        assert "Invalid confidence value" in result["reasoning"]
    
    # Test case 3: Missing reasoning (should be added automatically)
    with patch('asyncio.to_thread') as mock_to_thread:
        mock_to_thread.return_value = AIMessage(content=json.dumps({
            "category": "OK",
            "confidence": 90
            # No reasoning field
        }))
        
        result = await rag.classify_comment_with_llm(
            "Test comment",
            similar_comments,
            mock_llm_chain
        )
        
        assert result["category"] == "OK"
        assert "confidence" in result
        assert "reasoning" in result
        assert result["reasoning"] == "Reasoning not provided by LLM"
    
    # Test case 4: Non-AIMessage response format
    with patch('asyncio.to_thread') as mock_to_thread:
        mock_to_thread.return_value = "This is not a valid JSON response"
        
        result = await rag.classify_comment_with_llm(
            "Test comment",
            similar_comments,
            mock_llm_chain
        )
        
        assert result["category"] == "Error"
        assert "Invalid response format" in result["reasoning"]

@pytest.mark.asyncio
async def test_process_comments_with_rag_missing_columns():
    """Test process_comments_with_rag with missing columns"""
    # Create temp directory and file
    temp_dir = tempfile.mkdtemp()
    project_dir = os.path.join(temp_dir, "test_project")
    os.makedirs(project_dir, exist_ok=True)
    
    export_path = os.path.join(project_dir, "data_export.csv")
    status_path = os.path.join(project_dir, "status.json")
    
    # Create test CSV with minimal columns
    df = pd.DataFrame({
        "comment": ["Test comment 1", "Test comment 2"]
    })
    df.to_csv(export_path, index=False)
    
    try:
        # Test with dependencies present
        with patch('rag.has_rag_dependencies', True), \
             patch('rag.vector_store', MagicMock()), \
             patch('rag.comment_category_chain', MagicMock()), \
             patch('rag.process_comment_with_rag', AsyncMock(
                 return_value=([{"id": "1", "comment": "Similar", "category": "OK", "similarity": 0.9}],
                               {"category": "OK", "confidence": 90, "reasoning": "Test"})
             )), \
             patch('error_utils.update_status_file') as mock_update_status:
            
            await rag.process_comments_with_rag(export_path, batch_size=2)
            
            # Read the result - should have added missing columns
            result_df = pd.read_csv(export_path)
            
            # Check that required columns were added
            assert "ClassifiedCategory" in result_df.columns
            assert "ClassifiedConfidence" in result_df.columns
            assert "HumanCategory" in result_df.columns
            assert "FinalClassification" in result_df.columns
            assert "Reason" in result_df.columns
            assert "ProcessingError" in result_df.columns
            assert "SimilarCommentId" in result_df.columns
            
            # All rows should be processed successfully
            assert (result_df["ClassifiedCategory"] == "OK").all()
            assert (result_df["ClassifiedConfidence"] == 90).all()
    
    finally:
        # Clean up
        shutil.rmtree(temp_dir)

@pytest.mark.asyncio
async def test_process_comments_with_rag_find_comment_column():
    """Test finding comment column logic in process_comments_with_rag"""
    # Create temp directory and file
    temp_dir = tempfile.mkdtemp()
    project_dir = os.path.join(temp_dir, "test_project")
    os.makedirs(project_dir, exist_ok=True)
    
    export_path = os.path.join(project_dir, "data_export.csv")
    status_path = os.path.join(project_dir, "status.json")
    
    # Create test CSV with non-standard column name
    df = pd.DataFrame({
        "message_text": ["This is a test comment", "Another test message"],
        "ClassifiedCategory": ["", ""]
    })
    df.to_csv(export_path, index=False)
    
    try:
        # Test with dependencies present
        with patch('rag.has_rag_dependencies', True), \
             patch('rag.vector_store', MagicMock()), \
             patch('rag.comment_category_chain', MagicMock()), \
             patch('rag.process_comment_with_rag', AsyncMock(
                 return_value=([{"id": "1", "comment": "Similar", "category": "OK", "similarity": 0.9}],
                               {"category": "OK", "confidence": 90, "reasoning": "Test"})
             )), \
             patch('error_utils.update_status_file') as mock_update_status:
            
            await rag.process_comments_with_rag(export_path, batch_size=2)
            
            # Read the result
            result_df = pd.read_csv(export_path)
            
            # All rows should be processed
            assert (result_df["ClassifiedCategory"] == "OK").all()
            assert (result_df["ClassifiedConfidence"] == 90).all()
    
    finally:
        # Clean up
        shutil.rmtree(temp_dir)

@pytest.mark.asyncio
async def test_process_comments_with_rag_no_unprocessed_comments():
    """Test process_comments_with_rag when no unprocessed comments remain"""
    # Create temp directory and file
    temp_dir = tempfile.mkdtemp()
    project_dir = os.path.join(temp_dir, "test_project")
    os.makedirs(project_dir, exist_ok=True)
    
    export_path = os.path.join(project_dir, "data_export.csv")
    status_path = os.path.join(project_dir, "status.json")
    
    # Create test CSV with all comments already processed
    df = pd.DataFrame({
        "comment": ["Test comment 1", "Test comment 2"],
        "ClassifiedCategory": ["OK", "Complaint"],
        "ClassifiedConfidence": [90, 85],
        "HumanCategory": ["", ""],
        "FinalClassification": ["", ""],
        "Reason": ["Test reason 1", "Test reason 2"],
        "ProcessingError": ["", ""],
        "SimilarCommentId": ["", ""]
    })
    df.to_csv(export_path, index=False)
    
    try:
        # Test with dependencies present
        with patch('rag.has_rag_dependencies', True), \
             patch('rag.vector_store', MagicMock()), \
             patch('rag.comment_category_chain', MagicMock()), \
             patch('rag.process_comment_with_rag', AsyncMock()), \
             patch('error_utils.update_status_file') as mock_update_status:
            
            await rag.process_comments_with_rag(export_path)
            
            # Should mark as completed without processing
            mock_update_status.assert_called_with(status_path, "completed", progress=100)
            
            # process_comment_with_rag should not be called
            rag.process_comment_with_rag.assert_not_called()
    
    finally:
        # Clean up
        shutil.rmtree(temp_dir)

@pytest.mark.asyncio
async def test_process_comments_batch_error_handling():
    """Test handling of errors within a batch in process_comments_with_rag"""
    # Create temp directory and file
    temp_dir = tempfile.mkdtemp()
    project_dir = os.path.join(temp_dir, "test_project")
    os.makedirs(project_dir, exist_ok=True)
    
    export_path = os.path.join(project_dir, "data_export.csv")
    status_path = os.path.join(project_dir, "status.json")
    
    # Create test CSV
    df = pd.DataFrame({
        "comment": ["Test 1", "Test 2", "Test 3"],
        "ClassifiedCategory": ["", "", ""]
    })
    df.to_csv(export_path, index=False)
    
    try:
        # Setup AsyncMock to fail on second item only
        async def mock_process(comment_text, vector_store, llm_chain, default_categories):
            if "Test 2" in comment_text:
                raise Exception("Test error on comment 2")
            return (
                [{"id": "1", "comment": "Similar", "category": "OK", "similarity": 0.9}],
                {"category": "OK", "confidence": 90, "reasoning": "Test"}
            )
        
        # Test with error in one comment
        with patch('rag.has_rag_dependencies', True), \
             patch('rag.vector_store', MagicMock()), \
             patch('rag.comment_category_chain', MagicMock()), \
             patch('rag.process_comment_with_rag', AsyncMock(side_effect=mock_process)), \
             patch('error_utils.update_status_file') as mock_update_status:
            
            await rag.process_comments_with_rag(export_path, batch_size=1)
            
            # Read the result
            result_df = pd.read_csv(export_path)
            
            # First and third comments should be processed
            assert result_df.loc[0, "ClassifiedCategory"] == "OK"
            assert result_df.loc[2, "ClassifiedCategory"] == "OK"
            
            # Second comment should have error
            assert "Error" in result_df.loc[1, "ClassifiedCategory"]
            assert result_df.loc[1, "ProcessingError"] is not None
    
    finally:
        # Clean up
        shutil.rmtree(temp_dir)

@pytest.mark.asyncio
async def test_initialize_rag_chromadb_collection_exists():
    """Test initializing RAG with existing chromadb collection"""
    # Mock dependencies
    mock_client = MagicMock()
    mock_collection = MagicMock()
    mock_client.get_collection.return_value = mock_collection
    
    with patch('os.getenv', return_value="fake-api-key"), \
         patch('os.makedirs', return_value=None), \
         patch('rag.OpenAIEmbeddings', return_value=MagicMock()), \
         patch('rag.chromadb.PersistentClient', return_value=mock_client), \
         patch('rag.Chroma', return_value=MagicMock()), \
         patch('rag.ChatOpenAI', return_value=MagicMock()), \
         patch('rag.ChatPromptTemplate.from_template', return_value=MagicMock()):
        
        # Call the function
        result = await rag.initialize_rag()
        
        # Assertions
        assert result is True
        mock_client.get_collection.assert_called_with(name="comments_vectors")
        mock_client.create_collection.assert_not_called()

@pytest.mark.asyncio
async def test_initialize_rag_chromadb_collection_not_exists():
    """Test initializing RAG when chromadb collection doesn't exist"""
    # Mock dependencies
    mock_client = MagicMock()
    mock_collection = MagicMock()
    mock_client.get_collection.side_effect = ValueError("Collection not found")
    mock_client.create_collection.return_value = mock_collection
    
    with patch('os.getenv', return_value="fake-api-key"), \
         patch('os.makedirs', return_value=None), \
         patch('rag.OpenAIEmbeddings', return_value=MagicMock()), \
         patch('rag.chromadb.PersistentClient', return_value=mock_client), \
         patch('rag.Chroma', return_value=MagicMock()), \
         patch('rag.ChatOpenAI', return_value=MagicMock()), \
         patch('rag.ChatPromptTemplate.from_template', return_value=MagicMock()):
        
        # Call the function
        result = await rag.initialize_rag()
        
        # Assertions
        assert result is True
        mock_client.get_collection.assert_called_with(name="comments_vectors")
        mock_client.create_collection.assert_called_with(name="comments_vectors")

@pytest.mark.asyncio
async def test_initialize_rag_exception():
    """Test exception handling in initialize_rag"""
    with patch('os.getenv', return_value="fake-api-key"), \
         patch('os.makedirs', return_value=None), \
         patch('rag.OpenAIEmbeddings', side_effect=Exception("Test error")):
        
        # Call the function
        result = await rag.initialize_rag()
        
        # Assertions
        assert result is False
        assert rag.vector_store is None
        assert rag.comment_category_chain is None

@pytest.mark.asyncio
async def test_keywords_addition_long_comment():
    """Test addition of keywords field for longer comments"""
    similar_comments = [{"id": "1", "comment": "Test", "category": "OK", "similarity": 0.9}]
    mock_llm_chain = MagicMock()
    
    # Test with comment longer than 10 chars but no keywords in response
    with patch('asyncio.to_thread') as mock_to_thread:
        mock_to_thread.return_value = AIMessage(content=json.dumps({
            "category": "Complaint",
            "confidence": 90,
            "reasoning": "The comment is negative"
            # No keywords field
        }))
        
        result = await rag.classify_comment_with_llm(
            "This is a longer comment that should get keywords",
            similar_comments,
            mock_llm_chain
        )
        
        assert result["category"] == "Complaint"
        assert "keywords" in result
        assert isinstance(result["keywords"], list)
        assert len(result["keywords"]) == 0  # Empty array but still present