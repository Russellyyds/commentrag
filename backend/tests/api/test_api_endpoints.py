import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import os
import tempfile
import json

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

def test_get_project_progress(client):
    """Test project progress endpoint"""
    # Create a mock project
    project_id = "test_project"
    temp_dir = tempfile.mkdtemp()
    project_dir = os.path.join(temp_dir, project_id)
    os.makedirs(project_dir, exist_ok=True)
    
    # Create a status file
    status_data = {
        "status": "in_progress",
        "progress": 50,
        "has_errors": False,
        "error_message": "",
        "update_time": "2023-04-15T12:00:00"
    }
    
    with open(os.path.join(project_dir, "status.json"), "w") as f:
        json.dump(status_data, f)
    
    # Mock the UPLOAD_DIR
    with patch('main.UPLOAD_DIR', temp_dir):
        # Test the endpoint
        response = client.get(f"/projects/{project_id}/progress")
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "in_progress"
        assert data["progress"] == 50
        
    # Clean up
    import shutil
    shutil.rmtree(temp_dir)

def test_get_project_status_and_stats(client):
    """Test project status and stats endpoint"""
    # Create a mock project
    project_id = "test_project"
    temp_dir = tempfile.mkdtemp()
    project_dir = os.path.join(temp_dir, project_id)
    os.makedirs(project_dir, exist_ok=True)
    
    # Create a data export file
    with open(os.path.join(project_dir, "data_export.csv"), "w") as f:
        f.write("id,comment,ClassifiedCategory,ClassifiedConfidence,HumanCategory,FinalClassification\n")
        f.write("1,Test comment,OK,90,,OK\n")
        f.write("2,Test comment 2,Complaint,85,Complaint,Complaint\n")
    
    # Create a status file
    status_data = {
        "status": "completed",
        "progress": 100,
        "has_errors": False,
        "error_message": "",
        "update_time": "2023-04-15T12:00:00"
    }
    
    with open(os.path.join(project_dir, "status.json"), "w") as f:
        json.dump(status_data, f)
    
    # Mock the UPLOAD_DIR
    with patch('main.UPLOAD_DIR', temp_dir):
        # Test the endpoint
        response = client.get(f"/projects/{project_id}/status")
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["total_comments"] == 2
        assert data["processed_count"] == 2
        assert data["reviewed_count"] == 1
        
    # Clean up
    import shutil
    shutil.rmtree(temp_dir)

def test_reset_project(client):
    """Test reset project endpoint"""
    # Create a mock project
    project_id = "test_project"
    temp_dir = tempfile.mkdtemp()
    project_dir = os.path.join(temp_dir, project_id)
    os.makedirs(project_dir, exist_ok=True)
    
    # Create a sample file
    with open(os.path.join(project_dir, "test_file.txt"), "w") as f:
        f.write("Test content")
    
    # Mock the UPLOAD_DIR
    with patch('main.UPLOAD_DIR', temp_dir):
        # Test the endpoint with confirmation=true
        response = client.post(f"/projects/{project_id}/reset", json={"confirm": True})
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify directory was removed
        assert not os.path.exists(project_dir)
    
    # Clean up
    if os.path.exists(temp_dir):
        import shutil
        shutil.rmtree(temp_dir)