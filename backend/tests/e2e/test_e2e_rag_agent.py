import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock

from main import app

@pytest.mark.asyncio
async def test_rag_agent_api_flow():
    """
    Test the full RAG and Agent API flow:
    1. Use RAG endpoint to classify a comment
    2. Use Agent endpoint to analyze the same comment
    3. Compare results
    """
    # Sample comment
    test_comment = "This service is terrible, I'm very disappointed."
    
    # Mock RAG and Agent responses
    similar_comments = [
        {"id": "1", "comment": "Similar terrible service", "category": "Complaint", "similarity": 0.9},
        {"id": "2", "comment": "Very disappointed", "category": "Complaint", "similarity": 0.8}
    ]
    
    rag_classification = {
        "category": "Complaint",
        "confidence": 90,
        "reasoning": "The comment expresses strong negative sentiment about the service",
        "keywords": ["terrible", "disappointed"]
    }
    
    agent_classification = {
        "category": "Complaint",
        "confidence": 85,
        "reasoning": "The comment expresses strong negative sentiment",
        "keywords": ["terrible", "disappointed"],
        "reasoning_chain": []
    }
    
    # Mock the services
    with patch('rag.has_rag_dependencies', True), \
         patch('rag.vector_store', MagicMock()), \
         patch('rag.comment_category_chain', MagicMock()), \
         patch('agent.has_agent_dependencies', True), \
         patch('agent.comment_agent', MagicMock()), \
         patch('rag.process_comment_with_rag', AsyncMock(return_value=(similar_comments, rag_classification))), \
         patch('agent.process_comment_with_agent', AsyncMock(return_value=agent_classification)):
        
        # Use TestClient
        client = TestClient(app)
        
        # 1. Test RAG endpoint
        response = client.post("/rag", json={"comment": test_comment})
        
        assert response.status_code == 200
        rag_data = response.json()
        assert rag_data["success"] is True
        assert rag_data["classification"]["category"] == "Complaint"
        assert rag_data["answer"] == similar_comments
        
        # 2. Test Agent endpoint - this is a different endpoint with different response structure
        response = client.post("/rag/agent", json={"comment": test_comment})
        
        assert response.status_code == 200
        agent_data = response.json()
        assert agent_data["success"] is True
        assert agent_data["classification"]["category"] == "Complaint"
        
        # 3. Compare results from both endpoints
        assert rag_data["classification"]["category"] == agent_data["classification"]["category"]