import pytest
from unittest.mock import patch, MagicMock, AsyncMock
import rag
import agent
import json
from langchain.schema import AIMessage

@pytest.mark.asyncio
async def test_rag_and_agent_compatibility():
    """Test that RAG and Agent classifications are compatible"""
    # Test comment
    test_comment = "This service is terrible, I'm very disappointed."
    
    # Create mock vector_store
    mock_vector_store = MagicMock()
    mock_docs_with_scores = [
        (MagicMock(page_content="Similar terrible service", metadata={"id": "1", "category": "Complaint"}), 0.9),
        (MagicMock(page_content="Very disappointed", metadata={"id": "2", "category": "Complaint"}), 0.8)
    ]
    
    # Key fix 1: Mock asyncio.to_thread instead of directly mocking similarity_search_with_score method
    with patch('asyncio.to_thread') as mock_to_thread:
        # Configure mock to correctly handle different calls
        def side_effect_func(*args, **kwargs):
            # Check the first parameter to determine which function is being called
            if args and args[0] == mock_vector_store.similarity_search_with_score:
                # This is vector_store.similarity_search_with_score call
                return mock_docs_with_scores
            elif args and callable(args[0]) and hasattr(args[0], 'invoke'):
                # This is llm_chain.invoke call
                json_response = {
                    "category": "Complaint", 
                    "confidence": 90, 
                    "reasoning": "Test reasoning", 
                    "keywords": ["terrible", "disappointed"]
                }
                # Create an AIMessage object to simulate LLM response
                return AIMessage(content=json.dumps(json_response))
            # Return None for other cases
            return None
            
        # Set side_effect to return different results based on call
        mock_to_thread.side_effect = side_effect_func
        
        # Create mock LLM chain
        mock_chain = MagicMock()
        
        # Mock Agent
        mock_agent = MagicMock()
        mock_agent.process_comment = AsyncMock(return_value={
            "category": "Complaint",
            "confidence": 85,
            "reasoning": "The comment expresses strong negative sentiment",
            "keywords": ["terrible", "disappointed"],
            "reasoning_chain": []
        })
        
        # Temporarily replace global agent
        original_agent = agent.comment_agent
        agent.comment_agent = mock_agent
        
        try:
            # 1. Test RAG processing
            similar_comments, classification = await rag.process_comment_with_rag(
                test_comment,
                mock_vector_store,
                mock_chain
            )
            
            # 2. Test Agent processing
            agent_result = await agent.process_comment_with_agent(test_comment)
            
            # Assert RAG results
            assert classification["category"] == "Complaint"
            assert classification["confidence"] >= 80
            
            # Assert Agent results
            assert agent_result["category"] == "Complaint"
            assert agent_result["confidence"] >= 80
            
            # Verify compatibility
            assert classification["category"] == agent_result["category"]
            
        finally:
            # Restore original agent
            agent.comment_agent = original_agent