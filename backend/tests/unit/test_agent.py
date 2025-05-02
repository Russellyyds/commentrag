import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from agent import CommentAnalysisAgent, process_comment_with_agent, initialize_agent, AgentTool
import json

@pytest.mark.asyncio
async def test_check_sensitive_keywords():
    """Test keyword checking functionality"""
    # Create mock LLM
    mock_main_llm = MagicMock()
    
    # Set up mock ainvoke method
    mock_main_llm.ainvoke = AsyncMock()
    mock_main_llm.ainvoke.return_value = """```json
{
  "profanity": 7,
  "identity": 0,
  "violence": 3,
  "harassment": 2,
  "mental_health": 0,
  "adult": 0,
  "detected_terms": ["terrible", "worst"]
}
```"""
    
    # Create test agent
    test_agent = CommentAnalysisAgent(
        api_key="test_key",
        max_tools=3,
        max_reasoning_steps=5,
        timeout=30
    )
    
    # Replace LLM with mock
    test_agent.main_llm = mock_main_llm
    
    # Call the function
    result = await test_agent.check_sensitive_keywords("This service is terrible, worst ever.")
    
    # Assertions
    assert result["status"] == "success"
    assert result["concern_level"] == "medium"
    assert result["results"]["profanity"] == 7
    assert "terrible" in result["results"]["detected_terms"]

@pytest.mark.asyncio
async def test_tool_selection():
    """Test the tool selection logic"""
    # Create test agent
    test_agent = CommentAnalysisAgent(
        api_key="test_key",
        max_tools=3,
        max_reasoning_steps=5,
        timeout=30
    )
    
    # Mock LLM response
    test_agent.main_llm = MagicMock()
    test_agent.main_llm.ainvoke = AsyncMock()
    test_agent.main_llm.ainvoke.return_value = """```json
{"tools": ["analyze_sentiment", "check_keywords"]}
```"""
    
    # Call the function
    tools = await test_agent.select_tools("I'm very angry about this service.")
    
    # Assertions
    assert AgentTool.ANALYZE_SENTIMENT in tools
    assert AgentTool.CHECK_KEYWORDS in tools
    assert AgentTool.RETRIEVE_SIMILAR in tools  # Should be added automatically
    assert len(tools) <= test_agent.max_tools  # Should respect max tools limit

@pytest.mark.asyncio
async def test_process_comment_timeout():
    """Test error handling in process_comment"""
    # Create test agent with short timeout
    test_agent = CommentAnalysisAgent(
        api_key="test_key",
        max_tools=3,
        max_reasoning_steps=5,
        timeout=0.1  # Very short timeout
    )
    
    # Mock LLMs with AsyncMock
    test_agent.main_llm = AsyncMock()
    test_agent.creative_llm = AsyncMock()
    test_agent.main_llm.ainvoke.side_effect = Exception("Test error")
    
    # Call the function
    result = await test_agent.process_comment("This should fail")
    
    # Assertions - just check that we get an error response
    assert result["category"] == "Error"
    assert result["confidence"] == 0
    assert "error" in result["reasoning"].lower() or "failed" in result["reasoning"].lower()

@pytest.mark.asyncio
async def test_analyze_sentiment():
    """Test sentiment analysis functionality"""
    # Create mock LLM
    mock_main_llm = MagicMock()
    
    # Set up mock ainvoke method
    mock_main_llm.ainvoke = AsyncMock()
    mock_main_llm.ainvoke.return_value = """```json
{
  "overall_sentiment": "negative",
  "sentiment_score": -75,
  "emotional_tones": ["anger", "frustration"],
  "subject_sentiment": "The person feels negatively about the service received"
}
```"""
    
    # Create test agent
    test_agent = CommentAnalysisAgent(
        api_key="test_key",
        max_tools=3,
        max_reasoning_steps=5,
        timeout=30
    )
    
    # Replace LLM with mock
    test_agent.main_llm = mock_main_llm
    
    # Call the function
    result = await test_agent.analyze_sentiment("I'm very angry about this terrible service.")
    
    # Assertions
    assert result["status"] == "success"
    assert "negative" in result["message"]
    assert result["results"]["overall_sentiment"] == "negative"
    assert result["results"]["sentiment_score"] == -75
    assert "anger" in result["results"]["emotional_tones"]

@pytest.mark.asyncio
async def test_extract_entities():
    """Test entity extraction functionality"""
    # Create mock LLM
    mock_main_llm = MagicMock()
    
    # Set up mock ainvoke method
    mock_main_llm.ainvoke = AsyncMock()
    mock_main_llm.ainvoke.return_value = """```json
{
  "people": ["John", "Sarah"],
  "organizations": ["Acme Corp"],
  "locations": ["New York"],
  "topics": ["customer service", "refund"],
  "key_phrases": ["terrible experience", "demanded refund"]
}
```"""
    
    # Create test agent
    test_agent = CommentAnalysisAgent(
        api_key="test_key",
        max_tools=3,
        max_reasoning_steps=5,
        timeout=30
    )
    
    # Replace LLM with mock
    test_agent.main_llm = mock_main_llm
    
    # Call the function
    result = await test_agent.extract_entities("I had a terrible experience with John and Sarah at Acme Corp in New York. I demanded a refund for the poor customer service.")
    
    # Assertions
    assert result["status"] == "success"
    assert "people" in result["results"]
    assert "John" in result["results"]["people"]
    assert "Acme Corp" in result["results"]["organizations"]
    assert "New York" in result["results"]["locations"]
    assert "customer service" in result["results"]["topics"]

@pytest.mark.asyncio
async def test_translate_text():
    """Test translation functionality"""
    # Create mock LLM
    mock_main_llm = MagicMock()
    
    # Set up mock ainvoke method with different responses for different calls
    mock_main_llm.ainvoke = AsyncMock()
    
    # Configure the mock to return different values for different inputs
    async def mock_ainvoke(prompt):
        if "Identify the language" in prompt:
            return "spanish"
        elif "Translate the following text" in prompt:
            return "This is a test comment in English"
        return "Unexpected prompt"
    
    mock_main_llm.ainvoke.side_effect = mock_ainvoke
    
    # Create test agent
    test_agent = CommentAnalysisAgent(
        api_key="test_key",
        max_tools=3,
        max_reasoning_steps=5,
        timeout=30
    )
    
    # Replace LLM with mock
    test_agent.main_llm = mock_main_llm
    
    # Call the function
    result = await test_agent.translate_text("Este es un comentario de prueba en español")
    
    # Assertions
    assert result["status"] == "success"
    assert result["detected_language"] == "spanish"
    assert result["needs_translation"] == True
    assert result["translated_text"] == "This is a test comment in English"
    
    # Test English detection (no translation needed)
    # Reset mock
    async def mock_english_detect(prompt):
        if "Identify the language" in prompt:
            return "english"
        return "Unexpected prompt"
    
    mock_main_llm.ainvoke.side_effect = mock_english_detect
    
    # Call with English text
    result_eng = await test_agent.translate_text("This is already English")
    
    # Assertions
    assert result_eng["status"] == "success"
    assert result_eng["detected_language"] == "english"
    assert result_eng["needs_translation"] == False
    assert result_eng["translated_text"] == "This is already English"

@pytest.mark.asyncio
async def test_initial_reasoning():
    """Test initial reasoning function"""
    # Create mock LLM
    mock_main_llm = MagicMock()
    
    # Set up mock ainvoke method
    mock_main_llm.ainvoke = AsyncMock()
    mock_main_llm.ainvoke.return_value = "This comment appears to express dissatisfaction with a service. The tone is negative."
    
    # Create test agent
    test_agent = CommentAnalysisAgent(
        api_key="test_key",
        max_tools=3,
        max_reasoning_steps=5,
        timeout=30
    )
    
    # Replace LLM with mock
    test_agent.main_llm = mock_main_llm
    
    # Call the function
    result = await test_agent.initial_reasoning(
        "This service is terrible, I'm very disappointed.",
        ["OK", "Complaint", "Cultural"]
    )
    
    # Assertions
    assert "dissatisfaction" in result
    assert "negative" in result
    
    # Test error handling
    mock_main_llm.ainvoke.side_effect = Exception("Test error")
    
    # Call with error
    result_error = await test_agent.initial_reasoning(
        "Test comment",
        ["OK", "Complaint"]
    )
    
    # Assertions
    assert "Error" in result_error

@pytest.mark.asyncio
async def test_make_final_decision():
    """Test final decision making"""
    # Create mock LLM
    mock_main_llm = MagicMock()
    
    # Set up mock ainvoke method
    mock_main_llm.ainvoke = AsyncMock()
    mock_main_llm.ainvoke.return_value = """```json
{
  "category": "Complaint",
  "confidence": 90,
  "reasoning": "This comment clearly expresses dissatisfaction",
  "keywords": ["terrible", "disappointed"]
}
```"""
    
    # Create test agent
    test_agent = CommentAnalysisAgent(
        api_key="test_key",
        max_tools=3,
        max_reasoning_steps=5,
        timeout=30
    )
    
    # Replace LLM with mock
    test_agent.main_llm = mock_main_llm
    
    # Create test data
    comment_text = "This service is terrible, I'm very disappointed."
    categories = ["OK", "Complaint", "Cultural"]
    reasoning_chain = [
        {"step": "initial_analysis", "content": "This is negative"},
        {"step": "tool_selection", "selected_tools": ["analyze_sentiment"]}
    ]
    tool_results = {
        "analyze_sentiment": {
            "status": "success",
            "results": {"overall_sentiment": "negative"}
        }
    }
    
    # Call the function
    result = await test_agent.make_final_decision(
        comment_text,
        categories,
        reasoning_chain,
        tool_results
    )
    
    # Assertions
    assert result["category"] == "Complaint"
    assert result["confidence"] == 90
    assert "reasoning" in result
    assert "keywords" in result
    assert "terrible" in result["keywords"]
    assert "reasoning_chain" in result

@pytest.mark.asyncio
async def test_self_correction():
    """Test self-correction mechanism"""
    # Create mock LLM
    mock_main_llm = MagicMock()
    
    # Set up mock ainvoke method
    mock_main_llm.ainvoke = AsyncMock()
    mock_main_llm.ainvoke.return_value = """```json
{
  "category": "Cultural",
  "confidence": 60,
  "reasoning": "This appears to be a cultural misunderstanding",
  "keywords": ["cultural", "misunderstanding"]
}
```"""
    
    # Create test agent
    test_agent = CommentAnalysisAgent(
        api_key="test_key",
        max_tools=3,
        max_reasoning_steps=5,
        timeout=30
    )
    
    # Replace LLM with mock
    test_agent.main_llm = mock_main_llm
    
    # Create test data
    comment_text = "I don't understand why this is done this way, seems strange."
    categories = ["OK", "Complaint", "Cultural"]
    reasoning_chain = [
        {"step": "initial_analysis", "content": "This seems confusing"}
    ]
    tool_results = {}
    
    # Call the function
    result = await test_agent.self_correction(
        comment_text,
        categories,
        reasoning_chain,
        tool_results
    )
    
    # Assertions
    assert result["category"] == "Cultural"
    assert result["confidence"] == 60
    assert "reasoning" in result
    assert "keywords" in result
    assert "cultural" in result["keywords"]
    assert "reasoning_chain" in result
    assert result["reasoning_chain"][-1]["step"] == "self_correction"
    
    # Test complete failure case
    mock_main_llm.ainvoke.side_effect = Exception("Test error")
    
    # Call with error
    result_error = await test_agent.self_correction(
        comment_text,
        categories,
        reasoning_chain,
        tool_results
    )
    
    # Assertions
    assert result_error["category"] == "Error"
    assert result_error["confidence"] == 0
    assert "Failed to classify" in result_error["reasoning"]

@pytest.mark.asyncio
async def test_process_comment_with_agent():
    """Test the main process_comment_with_agent function"""
    # Create a mock agent
    mock_agent = MagicMock()
    mock_agent.process_comment = AsyncMock(return_value={
        "category": "Complaint",
        "confidence": 90,
        "reasoning": "Test reasoning",
        "keywords": ["test", "keywords"],
        "reasoning_chain": []
    })
    
    # Patch the global agent
    with patch('agent.comment_agent', mock_agent):
        # Call the function
        result = await process_comment_with_agent("Test comment")
        
        # Assertions
        assert result["category"] == "Complaint"
        assert result["confidence"] == 90
        assert "reasoning" in result
        
        # Test error case (no agent)
        with patch('agent.comment_agent', None):
            result_error = await process_comment_with_agent("Test comment")
            assert result_error["category"] == "Error"
            assert "not initialized" in result_error["reasoning"]

@pytest.mark.asyncio
async def test_initialize_agent():
    """Test agent initialization"""
    # Mock dependencies
    with patch('agent.has_agent_dependencies', True), \
         patch('os.getenv', return_value="fake-api-key"), \
         patch('agent.CommentAnalysisAgent', MagicMock()) as mock_agent_class:
        
        # Call the function
        result = await initialize_agent()
        
        # Assertions
        assert result is True
        
        # Test missing API key
        with patch('os.getenv', return_value=None):
            result_no_key = await initialize_agent()
            assert result_no_key is False
        
        # Test missing dependencies
        with patch('agent.has_agent_dependencies', False):
            result_no_deps = await initialize_agent()
            assert result_no_deps is False
            
        # Test initialization error
        mock_agent_class.side_effect = Exception("Test error")
        result_error = await initialize_agent()
        assert result_error is False

@pytest.mark.asyncio
async def test_agent_empty_comment():
    """Test agent handling of empty comments"""
    mock_agent = MagicMock()
    mock_agent.process_comment = AsyncMock(return_value={
        "category": "OK",
        "confidence": 100,
        "reasoning": "Empty comment",
        "keywords": [],
        "reasoning_chain": []
    })
    
    with patch('agent.comment_agent', mock_agent):
        result = await process_comment_with_agent("")
        assert result["category"] == "OK"
        assert result["confidence"] == 100

        result = await process_comment_with_agent("   ")
        assert result["category"] == "OK"
        assert result["confidence"] == 100

@pytest.mark.asyncio
async def test_agent_tool_execution_paths():
    """Test different tool execution paths"""
    with patch('agent.comment_agent') as mock_agent:
        mock_agent.process_comment = AsyncMock(return_value={
            "category": "OK",
            "confidence": 90,
            "reasoning": "Test reasoning",
            "keywords": [],
            "reasoning_chain": []
        })
        
        result = await process_comment_with_agent("Test comment")
        assert result["category"] == "OK"
        assert result["confidence"] == 90
        mock_agent.process_comment.assert_called_once_with("Test comment", None)

@pytest.mark.asyncio
async def test_process_comment_no_agent():
    """Test process_comment_with_agent when agent is not initialized"""
    with patch('agent.comment_agent', None):
        result = await process_comment_with_agent("Test comment")
        assert result["category"] == "Error"
        assert result["confidence"] == 0
        assert "not initialized" in result["reasoning"]
        assert "reasoning_chain" in result

@pytest.mark.asyncio
async def test_process_comment_with_exception():
    """Test process_comment_with_agent when an exception occurs"""
    with patch('agent.comment_agent', MagicMock()) as mock_agent, \
         patch('error_utils.logger.error') as mock_logger:
         
        mock_agent.process_comment = AsyncMock(side_effect=Exception("Test error"))
        await process_comment_with_agent("Test comment")
        
        mock_logger.assert_called()
        found_error = False
        for call_args in mock_logger.call_args_list:
            args, _ = call_args
            if len(args) > 0 and isinstance(args[0], str) and "Test error" in args[0]:
                found_error = True
                break
        assert found_error, "The test error was not properly logged"