import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock, mock_open
import os
import tempfile
import pandas as pd
import json
import io
from fastapi import Response
import shutil

# Import directly from main file to avoid import errors
from main import app, update_final_classification, process_comments_task, update_status_file
# Import uploader for patching
import uploader

@pytest.fixture
def client():
    with patch('rag.has_rag_dependencies', True), \
         patch('rag.vector_store', MagicMock()), \
         patch('rag.comment_category_chain', MagicMock()), \
         patch('agent.has_agent_dependencies', True), \
         patch('agent.comment_agent', MagicMock()):
        
        with TestClient(app) as client:
            yield client

class TestMissingCoverage:
    """Tests targeting the missing coverage in main.py"""

    def test_update_final_classification(self):
        """Test update_final_classification function (line 105-106)"""
        # Test with empty DataFrame
        df = pd.DataFrame()
        # Create required columns first
        df["ClassifiedCategory"] = []
        df["ClassifiedConfidence"] = []
        df["HumanCategory"] = []
        df["FinalClassification"] = []
        
        result = update_final_classification(df)
        assert "FinalClassification" in result.columns

        # Test with DataFrame that has HumanCategory values
        df = pd.DataFrame({
            "ClassifiedCategory": ["A", "B", "C"],
            "HumanCategory": ["X", "", "Z"],
            "FinalClassification": ["", "", ""]
        })
        result = update_final_classification(df)
        assert result.at[0, "FinalClassification"] == "X"
        assert result.at[1, "FinalClassification"] == "B"
        assert result.at[2, "FinalClassification"] == "Z"

        # Test with DataFrame that has no HumanCategory but has ClassifiedCategory
        df = pd.DataFrame({
            "ClassifiedCategory": ["A", "B", "C"],
            "HumanCategory": ["", "", ""],
            "FinalClassification": ["", "", ""]
        })
        result = update_final_classification(df)
        assert result.at[0, "FinalClassification"] == "A"
        assert result.at[1, "FinalClassification"] == "B"
        assert result.at[2, "FinalClassification"] == "C"

    def test_upload_files_with_existing_project_id(self, client):
        """Test upload_files with existing project_id (line 144-148)"""
        # Create temporary directory and project
        temp_dir = tempfile.mkdtemp()
        project_id = "existing_project"
        project_dir = os.path.join(temp_dir, project_id)
        os.makedirs(project_dir, exist_ok=True)
        
        try:
            # Create a test file
            test_csv = tempfile.NamedTemporaryFile(delete=False, suffix=".csv")
            test_csv.write(b"id,comment\n1,Test comment")
            test_csv.close()
            
            # Test upload with existing project_id
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
            
            # Test with non-existing project_id 
            with open(test_csv.name, "rb") as f:
                with patch('main.UPLOAD_DIR', temp_dir):
                    response = client.post(
                        "/comments/upload",
                        files={"files": ("test.csv", f, "text/csv")},
                        data={"project_id": "nonexistent_project"}
                    )
                    
            assert response.status_code == 200
            data = response.json()
            assert data["project_id"] == "nonexistent_project"
            
            os.unlink(test_csv.name)
            
        finally:
            shutil.rmtree(temp_dir)

    def test_upload_files_preprocessing_error(self, client):
        """Test upload_files with preprocessing error (line 186-187)"""
        temp_dir = tempfile.mkdtemp()
        
        try:
            # Create a test file
            test_csv = tempfile.NamedTemporaryFile(delete=False, suffix=".csv")
            test_csv.write(b"id,comment\n1,Test comment")
            test_csv.close()
            
            # Test with preprocessing error
            with open(test_csv.name, "rb") as f:
                with patch('main.UPLOAD_DIR', temp_dir), \
                     patch('uploader.process_file_dataframe', side_effect=Exception("Preprocessing error")):
                    
                    response = client.post(
                        "/comments/upload",
                        files={"files": ("test.csv", f, "text/csv")}
                    )
                    
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True  # Should still succeed despite preprocessing error
            
            os.unlink(test_csv.name)
            
        finally:
            shutil.rmtree(temp_dir)

    def test_process_comments_no_file_ids(self, client):
        """Test process_comments with no file IDs (line 202-204)"""
        response = client.post(
            "/comments/process",
            json={"fileIds": [], "project_id": "test_project"}
        )
        
        assert response.status_code == 400
        assert "No file IDs provided" in response.json()["detail"]

    def test_process_comments_no_project_id(self, client):
        """Test process_comments with no project ID (line 212-214)"""
        response = client.post(
            "/comments/process",
            json={"fileIds": ["file1", "file2"]}
        )
        
        # Main.py returns a 200 status code with an error message in the body
        assert response.status_code == 200
        assert response.json()["success"] is False
        assert "No project ID provided" in response.json()["message"]

    def test_process_comments_task_file_not_found(self):
        """Test process_comments_task with file not found (line 233, 240-241)"""
        temp_dir = tempfile.mkdtemp()
        project_id = "test_project"
        project_dir = os.path.join(temp_dir, project_id)
        os.makedirs(project_dir, exist_ok=True)
        
        try:
            # Test with non-existent export path
            export_path = os.path.join(project_dir, "data_export.csv")
            
            with patch('error_utils.update_status_file') as mock_update_status:
                import asyncio
                loop = asyncio.get_event_loop()
                loop.run_until_complete(process_comments_task(export_path, project_dir))
                
                # Should call update_status_file with error status
                mock_update_status.assert_called()
                error_call = False
                for call_args in mock_update_status.call_args_list:
                    args, kwargs = call_args
                    if args and args[1] == "error":
                        error_call = True
                        break
                assert error_call, "update_status_file should be called with 'error' status"
                
        finally:
            shutil.rmtree(temp_dir)

    def test_process_comments_rag_update_error(self):
        """Test process_comments_task with error in update (line 295-296)"""
        temp_dir = tempfile.mkdtemp()
        project_id = "test_project"
        project_dir = os.path.join(temp_dir, project_id)
        os.makedirs(project_dir, exist_ok=True)
        
        try:
            # Create a data export file
            export_path = os.path.join(project_dir, "data_export.csv")
            df = pd.DataFrame({
                "id": [1, 2],
                "comment": ["Test 1", "Test 2"]
            })
            df.to_csv(export_path, index=False)
            
            # Mock rag.process_comments_with_rag to complete successfully
            with patch('rag.has_rag_dependencies', True), \
                 patch('rag.vector_store', MagicMock()), \
                 patch('rag.comment_category_chain', MagicMock()), \
                 patch('rag.process_comments_with_rag', AsyncMock()), \
                 patch('error_utils.update_status_file') as mock_update, \
                 patch('pandas.read_csv', side_effect=Exception("Error reading file")):
                
                import asyncio
                loop = asyncio.get_event_loop()
                loop.run_until_complete(process_comments_task(export_path, project_dir))
                
                # Should call update_status_file with error status
                mock_update.assert_called()
                error_call = False
                for call_args in mock_update.call_args_list:
                    args, kwargs = call_args
                    if args and args[1] == "error":
                        error_call = True
                        break
                assert error_call, "update_status_file should be called with 'error' status"
                
        finally:
            shutil.rmtree(temp_dir)

    def test_update_status_file(self):
        """Test update_status_file function (line 321-327)"""
        temp_dir = tempfile.mkdtemp()
        status_path = os.path.join(temp_dir, "status.json")
        
        try:
            # Test creating a new status file
            update_status_file(status_path, "in_progress", progress=50)
            
            # Verify file contents
            with open(status_path, 'r') as f:
                status_data = json.load(f)
                assert status_data["status"] == "in_progress"
                assert status_data["progress"] == 50
                assert "update_time" in status_data
            
            # Test updating existing file
            update_status_file(status_path, "completed", progress=100, has_errors=True, error_message="Test error")
            
            # Verify updated contents
            with open(status_path, 'r') as f:
                status_data = json.load(f)
                assert status_data["status"] == "completed"
                assert status_data["progress"] == 100
                assert status_data["has_errors"] is True
                assert status_data["error_message"] == "Test error"
            
            # Test error handling
            with patch('builtins.open', side_effect=Exception("File error")):
                with patch('error_utils.logger.error') as mock_logger:
                    update_status_file(status_path, "error")
                    mock_logger.assert_called()
                    
        finally:
            shutil.rmtree(temp_dir)

    def test_get_project_status_with_errors(self, client):
        """Test get_project_status_and_stats with errors (line 429-430, 434, 446)"""
        temp_dir = tempfile.mkdtemp()
        
        try:
            # Test with non-existent project
            with patch('main.UPLOAD_DIR', temp_dir):
                response = client.get("/projects/nonexistent_project/status")
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is False
                assert "not found" in data["message"]
            
            # Test with status file but no export file
            project_id = "test_project"
            project_dir = os.path.join(temp_dir, project_id)
            os.makedirs(project_dir, exist_ok=True)
            
            status_data = {
                "status": "in_progress",
                "progress": 0,
                "has_errors": False,
                "error_message": ""
            }
            
            with open(os.path.join(project_dir, "status.json"), 'w') as f:
                json.dump(status_data, f)
            
            with patch('main.UPLOAD_DIR', temp_dir):
                response = client.get(f"/projects/{project_id}/status")
                assert response.status_code == 200
                data = response.json()
                assert data["progress"] == 0
                assert data["is_processing"] is True
                
        finally:
            shutil.rmtree(temp_dir)

    def test_get_project_status_read_error(self, client):
        """Test get_project_status_and_stats with CSV read error (line 488-489)"""
        temp_dir = tempfile.mkdtemp()
        project_id = "test_project"
        project_dir = os.path.join(temp_dir, project_id)
        os.makedirs(project_dir, exist_ok=True)
        
        try:
            # Create a data export file
            export_path = os.path.join(project_dir, "data_export.csv")
            with open(export_path, 'w') as f:
                f.write("id,comment\n1,Test comment")
            
            # Test with CSV read error
            with patch('main.UPLOAD_DIR', temp_dir), \
                 patch('pandas.read_csv', side_effect=Exception("CSV read error")):
                response = client.get(f"/projects/{project_id}/status")
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is False
                assert "Error" in data["message"]
                
        finally:
            shutil.rmtree(temp_dir)

    def test_get_project_comments_no_export_file(self, client):
        """Test get_project_comments with no export file (line 618)"""
        temp_dir = tempfile.mkdtemp()
        
        try:
            with patch('main.UPLOAD_DIR', temp_dir):
                response = client.get("/projects/nonexistent_project/comments")
                assert response.status_code == 404
                
        finally:
            shutil.rmtree(temp_dir)

    def test_get_project_comments_no_text_column(self, client):
        """Test get_project_comments with no suitable text column (line 652-654)"""
        temp_dir = tempfile.mkdtemp()
        project_id = "test_project"
        project_dir = os.path.join(temp_dir, project_id)
        os.makedirs(project_dir, exist_ok=True)
        
        try:
            # Create a data export file with no comment/text column
            export_path = os.path.join(project_dir, "data_export.csv")
            df = pd.DataFrame({
                "id": [1, 2],
                "numeric_col": [10, 20]
            })
            df.to_csv(export_path, index=False)
            
            with patch('main.UPLOAD_DIR', temp_dir):
                response = client.get(f"/projects/{project_id}/comments")
                # API returns 200 status with error information in the body
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is False
                assert "No suitable comment text column found" in data["message"]
                
        finally:
            shutil.rmtree(temp_dir)

    def test_get_comment_by_id_read_error(self, client):
        """Test get_comment_by_id with read error (line 756-759)"""
        temp_dir = tempfile.mkdtemp()
        project_id = "test_project"
        project_dir = os.path.join(temp_dir, project_id)
        os.makedirs(project_dir, exist_ok=True)
        
        try:
            # Create a data export file
            export_path = os.path.join(project_dir, "data_export.csv")
            with open(export_path, 'w') as f:
                f.write("id,comment\n1,Test comment")
            
            # Test with read error
            with patch('main.UPLOAD_DIR', temp_dir), \
                 patch('pandas.read_csv', side_effect=Exception("Read error")):
                response = client.get(f"/projects/{project_id}/comments/1")
                assert response.status_code == 200
                data = response.json()
                assert "Error" in data["message"]
                
        finally:
            shutil.rmtree(temp_dir)

    def test_update_comment_category_read_error(self, client):
        """Test update_comment_category with read error (line 878-896)"""
        temp_dir = tempfile.mkdtemp()
        project_id = "test_project"
        project_dir = os.path.join(temp_dir, project_id)
        os.makedirs(project_dir, exist_ok=True)
        
        try:
            # Create a data export file
            export_path = os.path.join(project_dir, "data_export.csv")
            with open(export_path, 'w') as f:
                f.write("id,comment\n1,Test comment")
            
            # Test with read error
            with patch('main.UPLOAD_DIR', temp_dir), \
                 patch('pandas.read_csv', side_effect=Exception("Read error")):
                response = client.put(
                    f"/projects/{project_id}/comments/1",
                    json={"category": "OK"}
                )
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is False
                assert "Error" in data["message"]
                
        finally:
            shutil.rmtree(temp_dir)

    def test_export_comments_no_matching_comments(self, client):
        """Test export_comments with no matching comments (line 949, 953)"""
        temp_dir = tempfile.mkdtemp()
        project_id = "test_project"
        project_dir = os.path.join(temp_dir, project_id)
        os.makedirs(project_dir, exist_ok=True)
        
        try:
            # Create a data export file
            export_path = os.path.join(project_dir, "data_export.csv")
            df = pd.DataFrame({
                "id": [1, 2],
                "comment": ["Test 1", "Test 2"]
            })
            df.to_csv(export_path, index=False)
            
            # Test with non-matching IDs
            with patch('main.UPLOAD_DIR', temp_dir):
                response = client.get(f"/projects/{project_id}/export?ids=999&format=csv")
                # API returns 200 status with error message in body
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is False
                assert "No matching comments found" in data["message"]
                
        finally:
            shutil.rmtree(temp_dir)

    def test_export_comments_read_error(self, client):
        """Test export_comments with read error (line 982-983)"""
        temp_dir = tempfile.mkdtemp()
        project_id = "test_project"
        project_dir = os.path.join(temp_dir, project_id)
        os.makedirs(project_dir, exist_ok=True)
        
        try:
            # Create a data export file
            export_path = os.path.join(project_dir, "data_export.csv")
            with open(export_path, 'w') as f:
                f.write("id,comment\n1,Test comment")
            
            # Test with read error
            with patch('main.UPLOAD_DIR', temp_dir), \
                 patch('pandas.read_csv', side_effect=Exception("Read error")):
                response = client.get(f"/projects/{project_id}/export?ids=1&format=csv")
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is False
                assert "Error" in data["message"]
                
        finally:
            shutil.rmtree(temp_dir)

    def test_rag_query_empty_comment(self, client):
        """Test rag_query with empty comment (line 1002)"""
        response = client.post("/rag", json={"comment": ""})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "Empty comment provided" in data["message"]

    def test_rag_query_rag_not_available(self, client):
        """Test rag_query with RAG not available (line 1021, 1024)"""
        with patch('rag.has_rag_dependencies', False):
            response = client.post("/rag", json={"comment": "Test comment"})
            assert response.status_code == 503
            assert "not available" in response.json()["detail"]

    def test_rag_query_error(self, client):
        """Test rag_query with processing error (line 1055-1057)"""
        with patch('rag.process_comment_with_rag', AsyncMock(side_effect=Exception("Processing error"))):
            response = client.post("/rag", json={"comment": "Test comment"})
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is False
            assert "Error processing comment" in data["message"]

    def test_agent_analyze_empty_comment(self, client):
        """Test agent_analyze_comment with empty comment (line 1079-1081)"""
        response = client.post("/rag/agent", json={"comment": ""})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "Empty comment provided" in data["message"]

    def test_agent_analyze_agent_not_available(self, client):
        """Test agent_analyze_comment with agent not available (line 1090, 1098)"""
        with patch('agent.has_agent_dependencies', False):
            response = client.post("/rag/agent", json={"comment": "Test comment"})
            assert response.status_code == 503
            assert "not available" in response.json()["detail"]

    def test_agent_analyze_error(self, client):
        """Test agent_analyze_comment with processing error (line 1145-1146)"""
        with patch('agent.process_comment_with_agent', AsyncMock(side_effect=Exception("Processing error"))):
            response = client.post("/rag/agent", json={"comment": "Test comment"})
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is False
            assert "Error processing comment" in data["message"]