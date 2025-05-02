import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock
import os
import tempfile
import pandas as pd
import shutil

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

def test_upload_files_errors(client):
    """Test error handling in upload_files endpoint"""
    temp_dir = tempfile.mkdtemp()
    
    try:
        invalid_file = tempfile.NamedTemporaryFile(delete=False, suffix=".invalid")
        invalid_file.write(b"Invalid file content")
        invalid_file.close()
        
        with open(invalid_file.name, "rb") as f:
            with patch('main.UPLOAD_DIR', temp_dir):
                response = client.post(
                    "/comments/upload",
                    files={"files": ("invalid.file", f, "application/octet-stream")}
                )
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True
        
        os.unlink(invalid_file.name)
        
        project_id = "test_existing_project"
        project_dir = os.path.join(temp_dir, project_id)
        os.makedirs(project_dir, exist_ok=True)
        
        test_csv = tempfile.NamedTemporaryFile(delete=False, suffix=".csv")
        test_csv.write(b"id,comment\n1,Test comment")
        test_csv.close()
        
        with open(test_csv.name, "rb") as f:
            with patch('main.UPLOAD_DIR', temp_dir):
                response = client.post(
                    "/comments/upload",
                    files={"files": ("test.csv", f, "text/csv")},
                    data={"project_id": project_id}
                )
                assert response.status_code == 200
                data = response.json()
                assert data["project_id"] == project_id
        
        os.unlink(test_csv.name)
        
    finally:
        shutil.rmtree(temp_dir)

def test_get_project_comments_pagination(client):
    """Test pagination in get_project_comments endpoint"""
    project_id = "test_project"
    temp_dir = tempfile.mkdtemp()
    project_dir = os.path.join(temp_dir, project_id)
    os.makedirs(project_dir, exist_ok=True)
    
    try:
        df = pd.DataFrame({
            "id": list(range(1, 26)),
            "comment": [f"Test comment {i}" for i in range(1, 26)],
            "ClassifiedCategory": ["OK"] * 25,
            "ClassifiedConfidence": [90] * 25,
        })
        
        df.to_csv(os.path.join(project_dir, "data_export.csv"), index=False)
        
        with patch('main.UPLOAD_DIR', temp_dir):
            response1 = client.get(f"/projects/{project_id}/comments?page=1&limit=10")
            assert response1.status_code == 200
            data1 = response1.json()
            assert len(data1["comments"]) == 10
            assert data1["pagination"]["total"] == 25
            assert data1["pagination"]["page"] == 1
            
            response2 = client.get(f"/projects/{project_id}/comments?page=2&limit=10")
            assert response2.status_code == 200
            data2 = response2.json()
            assert len(data2["comments"]) == 10
            
            response3 = client.get(f"/projects/{project_id}/comments?page=3&limit=10")
            assert response3.status_code == 200
            data3 = response3.json()
            assert len(data3["comments"]) == 5
            
            response_invalid = client.get(f"/projects/{project_id}/comments?page=999&limit=10")
            assert response_invalid.status_code == 200
            data_invalid = response_invalid.json()
            assert data_invalid["pagination"]["page"] == 3
            
            response_filter = client.get(f"/projects/{project_id}/comments?filter=Needs%20Review")
            assert response_filter.status_code == 200
    
    finally:
        shutil.rmtree(temp_dir)

def test_project_progress_missing(client):
    """Test project progress when status file is missing"""
    temp_dir = tempfile.mkdtemp()
    
    try:
        with patch('main.UPLOAD_DIR', temp_dir):
            response = client.get("/projects/nonexistent/progress")
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is False
            assert "not found" in data["message"]
            
    finally:
        shutil.rmtree(temp_dir)

def test_process_comments_task_error():
    """Test the background task error handling"""
    temp_dir = tempfile.mkdtemp()
    project_id = "test_project"
    project_dir = os.path.join(temp_dir, project_id)
    os.makedirs(project_dir, exist_ok=True)
    
    try:
        export_path = os.path.join(project_dir, "data_export.csv")
        os.makedirs(export_path, exist_ok=True)
        
        with patch('main.UPLOAD_DIR', temp_dir), \
             patch('main.rag.has_rag_dependencies', False), \
             patch('error_utils.update_status_file') as mock_update_status:
            
            from main import process_comments_task
            import asyncio
            
            loop = asyncio.get_event_loop()
            loop.run_until_complete(process_comments_task(export_path, project_dir))
            
            mock_update_status.assert_called()
            error_call = False
            for call_args in mock_update_status.call_args_list:
                args, kwargs = call_args
                if args and args[1] == "error":
                    error_call = True
                    break
            assert error_call, "update_status_file should be called with 'error' status"
            
    finally:
        if os.path.exists(temp_dir):
            for root, dirs, files in os.walk(temp_dir, topdown=False):
                for name in files:
                    os.chmod(os.path.join(root, name), 0o777)
                for name in dirs:
                    os.chmod(os.path.join(root, name), 0o777)
            shutil.rmtree(temp_dir)