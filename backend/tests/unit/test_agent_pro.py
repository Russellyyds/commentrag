import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import asyncio
import time
import os
from agent import CommentAnalysisAgent, AgentTool, logger, process_comment_with_agent
import agent

# Setup fixture for API key
@pytest.fixture
def mock_openai_env():
    with patch.dict(os.environ, {"OPENAI_API_KEY": "test-api-key"}):
        yield

# Test line 531: Converting message-like object in initial_reasoning
@pytest.mark.asyncio
async def test_initial_reasoning_with_message_object(mock_openai_env):
    """Test initial_reasoning with a message-like object (line 531)"""
    # Create the agent
    test_agent = CommentAnalysisAgent(api_key="test_key")
    
    # Create a message-like object with content attribute
    class MessageWithContent:
        def __init__(self, content):
            self.content = content
    
    message = MessageWithContent("Message content for testing")
    
    # Create a mock for main_llm and its ainvoke method
    test_agent.main_llm = AsyncMock()
    test_agent.main_llm.ainvoke.return_value = "Test reasoning response"
    
    # Store the original prompt to verify content extraction
    original_ainvoke = test_agent.main_llm.ainvoke
    
    # Create a wrapper to capture the prompt
    async def capture_prompt(prompt):
        # Store the prompt for verification
        capture_prompt.last_prompt = prompt
        return await original_ainvoke(prompt)
    
    capture_prompt.last_prompt = None
    test_agent.main_llm.ainvoke = capture_prompt
    
    # Call the method with our message object
    result = await test_agent.initial_reasoning(message, ["Category1", "Category2"])
    
    # Verify response 
    assert result == "Test reasoning response"
    
    # Verify the content was extracted from the message object (line 531)
    assert capture_prompt.last_prompt is not None
    assert "Message content for testing" in capture_prompt.last_prompt
    assert "MessageWithContent" not in capture_prompt.last_prompt  # Object itself is not in prompt