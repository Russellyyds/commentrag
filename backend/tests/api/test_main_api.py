import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock
import os
import tempfile
import pandas as pd

from main import app

@pytest.fixture
def client():
    with patch('rag.has_rag_dependencies', True), \
         patch('rag.vector_store', MagicMock()), \
         patch('rag.comment_category_chain', MagicMock()), \
         patch('agent.has_agent_dependencies', True), \
         patch('agent.comment_agent', MagicMock()):
        
        with TestClient(app) as client:
            yield client

def test_get_project_comments(client):
    """Test get project comments endpoint"""
    # Create a mock project
    project_id = "test_project"
    temp_dir = tempfile.mkdtemp()
    project_dir = os.path.join(temp_dir, project_id)
    os.makedirs(project_dir, exist_ok=True)
    
    # Create a data export file
    df = pd.DataFrame({
        "id": [1, 2, 3],
        "comment": ["Test comment 1", "Test comment 2", "Test comment 3"],
        "ClassifiedCategory": ["OK", "Complaint", "Cultural"],
        "ClassifiedConfidence": [90, 85, 80],
        "HumanCategory": ["", "Complaint", ""],
        "FinalClassification": ["OK", "Complaint", "Cultural"]
    })
    
    df.to_csv(os.path.join(project_dir, "data_export.csv"), index=False)
    
    # Mock the UPLOAD_DIR
    with patch('main.UPLOAD_DIR', temp_dir):
        # Test the endpoint
        response = client.get(f"/projects/{project_id}/comments?page=1&limit=10")
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert len(data["comments"]) == 3
        assert data["pagination"]["total"] == 3
        
        # Test with filtering
        response_filtered = client.get(f"/projects/{project_id}/comments?filter=Complaint")
        
        # Assertions
        assert response_filtered.status_code == 200
        filtered_data = response_filtered.json()
        assert len(filtered_data["comments"]) == 1
        assert filtered_data["comments"][0]["category"] == "Complaint"
    
    # Clean up
    import shutil
    shutil.rmtree(temp_dir)

def test_get_comment_by_id(client):
    """Test get comment by id endpoint"""
    # Create a mock project
    project_id = "test_project"
    temp_dir = tempfile.mkdtemp()
    project_dir = os.path.join(temp_dir, project_id)
    os.makedirs(project_dir, exist_ok=True)
    
    # Create a data export file
    df = pd.DataFrame({
        "id": [1, 2, 3],
        "comment": ["Test comment 1", "Test comment 2", "Test comment 3"],
        "ClassifiedCategory": ["OK", "Complaint", "Cultural"],
        "ClassifiedConfidence": [90, 85, 80],
        "HumanCategory": ["", "Complaint", ""],
        "FinalClassification": ["OK", "Complaint", "Cultural"],
        "Reason": ["Test reason 1", "Test reason 2", "Test reason 3"],
        "ProcessingError": ["", "", ""],
        "SimilarCommentId": ['{"id": 3, "comment": "Similar comment", "category": "Cultural", "similarity": 0.9}', "", ""]
    })
    
    df.to_csv(os.path.join(project_dir, "data_export.csv"), index=False)
    
    # Mock the UPLOAD_DIR
    with patch('main.UPLOAD_DIR', temp_dir):
        # Test the endpoint
        response = client.get(f"/projects/{project_id}/comments/1")
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        assert data["comment"] == "Test comment 1"
        assert data["category"] == "OK"
        assert data["confidence"] == 90
        assert data["reasoning"] == "Test reason 1"
        
        # Test with similar comments
        assert "similar_comments" in data
        
        # Test comment not found
        response_not_found = client.get(f"/projects/{project_id}/comments/999")
        assert "error" in response_not_found.json() or "success" in response_not_found.json() and not response_not_found.json()["success"]
    
    # Clean up
    import shutil
    shutil.rmtree(temp_dir)

def test_update_comment_category(client):
    """Test update comment category endpoint"""
    # Create a mock project
    project_id = "test_project"
    temp_dir = tempfile.mkdtemp()
    project_dir = os.path.join(temp_dir, project_id)
    os.makedirs(project_dir, exist_ok=True)
    
    # Create a data export file
    df = pd.DataFrame({
        "id": [1, 2, 3],
        "comment": ["Test comment 1", "Test comment 2", "Test comment 3"],
        "ClassifiedCategory": ["OK", "Complaint", "Cultural"],
        "ClassifiedConfidence": [90, 85, 80],
        "HumanCategory": ["", "", ""],
        "FinalClassification": ["OK", "Complaint", "Cultural"]
    })
    
    df.to_csv(os.path.join(project_dir, "data_export.csv"), index=False)
    
    # Mock the UPLOAD_DIR and get_comment_by_id
    with patch('main.UPLOAD_DIR', temp_dir), \
         patch('main.get_comment_by_id', AsyncMock(return_value={"id": 1, "comment": "Test comment 1", "category": "Sexism"})):
        
        # Test the endpoint
        response = client.put(
            f"/projects/{project_id}/comments/1",
            json={"category": "Sexism"}
        )
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Check that the file was updated
        updated_df = pd.read_csv(os.path.join(project_dir, "data_export.csv"))
        assert updated_df.loc[0, "HumanCategory"] == "Sexism"
        assert updated_df.loc[0, "FinalClassification"] == "Sexism"
    
    # Clean up
    import shutil
    shutil.rmtree(temp_dir)

def test_export_comments(client):
    """Test export comments endpoint"""
    # Create a mock project
    project_id = "test_project"
    temp_dir = tempfile.mkdtemp()
    project_dir = os.path.join(temp_dir, project_id)
    os.makedirs(project_dir, exist_ok=True)
    
    # Create a data export file
    df = pd.DataFrame({
        "id": [1, 2, 3],
        "comment": ["Test comment 1", "Test comment 2", "Test comment 3"],
        "ClassifiedCategory": ["OK", "Complaint", "Cultural"],
        "ClassifiedConfidence": [90, 85, 80],
        "HumanCategory": ["", "Complaint", ""],
        "FinalClassification": ["OK", "Complaint", "Cultural"]
    })
    
    df.to_csv(os.path.join(project_dir, "data_export.csv"), index=False)
    
    # Mock the UPLOAD_DIR
    with patch('main.UPLOAD_DIR', temp_dir):
        # Test the endpoint
        response = client.get(f"/projects/{project_id}/export?ids=1&ids=2&format=csv")
        
        # Assertions
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"
        assert b"Test comment 1" in response.content
        
        # Test excel format
        response_excel = client.get(f"/projects/{project_id}/export?ids=1&format=excel")
        assert response_excel.status_code == 200
        assert response_excel.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    
    # Clean up
    import shutil
    shutil.rmtree(temp_dir)

def test_agent_analyze_comment(client):
    """Test agent comment analysis endpoint"""
    # Mock agent response
    mock_result = {
        "category": "Complaint",
        "confidence": 85,
        "reasoning": "Test reasoning",
        "keywords": ["test", "keyword"],
        "reasoning_chain": [
            {"step": "initial_analysis", "content": "Test analysis"},
            {"step": "tool_selection", "selected_tools": ["analyze_sentiment"]},
            {"step": "tool_execution", "results": {
                "analyze_sentiment": {
                    "status": "success",
                    "message": "Test message",
                    "results": {"overall_sentiment": "negative"}
                }
            }}
        ]
    }
    
    with patch('agent.process_comment_with_agent', AsyncMock(return_value=mock_result)):
        # Test the endpoint
        response = client.post("/rag/agent", json={"comment": "This is a test comment"})
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["classification"]["category"] == "Complaint"
        assert data["classification"]["confidence"] == 85
        assert "reasoning_steps" in data