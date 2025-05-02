import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock

from main import app

# Mock RAG and Agent service initialization
@pytest.fixture(scope="module")
def client():
    # Mock successful service initialization
    with patch('rag.has_rag_dependencies', True), \
         patch('rag.vector_store', MagicMock()), \
         patch('rag.comment_category_chain', MagicMock()), \
         patch('agent.has_agent_dependencies', True), \
         patch('agent.comment_agent', MagicMock()):
        
        # Ensure FastAPI startup events are triggered
        with TestClient(app) as client:
            yield client

@pytest.mark.api
class TestAPIEndpoints:
    def test_rag_endpoint(self, client):
        # Mock process_comment_with_rag return values
        with patch('rag.process_comment_with_rag', AsyncMock()) as mock_rag:
            mock_rag.return_value = (
                [{"id": "1", "comment": "Similar comment", "category": "OK", "similarity": 0.85}],
                {"category": "OK", "confidence": 90, "reasoning": "This is a positive comment"}
            )
            
            # Send request
            response = client.post("/rag", json={"comment": "This is a test comment"})
            
            # Assertions
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True