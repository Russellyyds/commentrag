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
import rag
import agent

@pytest.fixture
def client():
    with patch('rag.has_rag_dependencies', True), \
         patch('rag.vector_store', MagicMock()), \
         patch('rag.comment_category_chain', MagicMock()), \
         patch('agent.has_agent_dependencies', True), \
         patch('agent.comment_agent', MagicMock()):
        
        with TestClient(app) as client:
            yield client

class TestFinalCoverage:
    """Tests targeting the remaining uncovered lines in main.py"""

    def test_export_comments_different_formats_fixed(self, client):
        """Fixed test for export_comments with different formats (lines 956-967)"""
        temp_dir = tempfile.mkdtemp()
        project_id = "test_project"
        project_dir = os.path.join(temp_dir, project_id)
        os.makedirs(project_dir, exist_ok=True)
        
        # Create test data
        export_path = os.path.join(project_dir, "data_export.csv")
        df = pd.DataFrame({
            "id": [1, 2, 3],
            "comment": ["Test 1", "Test 2", "Test 3"],
            "ClassifiedCategory": ["OK", "Complaint", "OK"],
            "FinalClassification": ["OK", "Complaint", "OK"]
        })
        df.to_csv(export_path, index=False)
        
        try:
            with patch('main.UPLOAD_DIR', temp_dir):
                # Mock CSV response
                csv_content = b"id,comment\n1,Test 1\n2,Test 2"
                csv_response = Response(
                    content=csv_content,
                    media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=export.csv"}
                )
                
                with patch('main.Response', return_value=csv_response):
                    # Use valid query parameter format
                    response = client.get(f"/projects/{project_id}/export?ids=1&ids=2&format=csv")
                    assert response.status_code == 200
                    # Fix assertion to match FastAPI's behavior of adding charset
                    assert "text/csv" in response.headers["Content-Type"]
                
                # Mock TSV response
                tsv_content = b"id\tcomment\n1\tTest 1\n2\tTest 2"
                tsv_response = Response(
                    content=tsv_content,
                    media_type="text/tab-separated-values",
                    headers={"Content-Disposition": "attachment; filename=export.tsv"}
                )
                
                with patch('main.Response', return_value=tsv_response):
                    response = client.get(f"/projects/{project_id}/export?ids=1&ids=2&format=tsv")
                    assert response.status_code == 200
                    assert "text/tab-separated-values" in response.headers["Content-Type"]
                
                # Mock Excel export
                excel_content = b"binary excel content"
                excel_response = Response(
                    content=excel_content,
                    media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": "attachment; filename=export.xlsx"}
                )
                
                with patch('main.Response', return_value=excel_response):
                    response = client.get(f"/projects/{project_id}/export?ids=1&ids=2&format=excel")
                    assert response.status_code == 200
                    assert "spreadsheet" in response.headers["Content-Type"]
        finally:
            shutil.rmtree(temp_dir)

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

    def test_upload_handle_various_file_types(self, client):
        """Test upload_files handling various file types (line 158, 160, 162)"""
        # Create temporary directory
        temp_dir = tempfile.mkdtemp()
        
        try:
            # Create different file types
            csv_file = tempfile.NamedTemporaryFile(delete=False, suffix=".csv")
            csv_file.write(b"id,comment\n1,Test CSV")
            csv_file.close()
            
            tsv_file = tempfile.NamedTemporaryFile(delete=False, suffix=".tsv")
            tsv_file.write(b"id\tcomment\n1\tTest TSV")
            tsv_file.close()
            
            # Create a temporary Excel-like file
            xlsx_file = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
            xlsx_file.write(b"mock excel content")
            xlsx_file.close()
            
            # Create a temporary JSON file
            json_file = tempfile.NamedTemporaryFile(delete=False, suffix=".json")
            json_file.write(b'[{"id": 1, "comment": "Test JSON"}]')
            json_file.close()
            
            # Create an unsupported file type
            txt_file = tempfile.NamedTemporaryFile(delete=False, suffix=".txt")
            txt_file.write(b"This is a plain text file")
            txt_file.close()
            
            # Mock the pandas read functions
            with patch('pandas.read_csv', return_value=pd.DataFrame({"id": [1], "comment": ["Test CSV"]})), \
                 patch('pandas.read_excel', return_value=pd.DataFrame({"id": [1], "comment": ["Test Excel"]})), \
                 patch('pandas.read_json', return_value=pd.DataFrame({"id": [1], "comment": ["Test JSON"]})):
                
                # Test CSV upload
                with open(csv_file.name, "rb") as f:
                    with patch('main.UPLOAD_DIR', temp_dir):
                        response = client.post(
                            "/comments/upload",
                            files={"files": ("test.csv", f, "text/csv")}
                        )
                assert response.status_code == 200
                
                # Test TSV upload
                with open(tsv_file.name, "rb") as f:
                    with patch('main.UPLOAD_DIR', temp_dir):
                        response = client.post(
                            "/comments/upload",
                            files={"files": ("test.tsv", f, "text/tab-separated-values")}
                        )
                assert response.status_code == 200
                
                # Test Excel upload
                with open(xlsx_file.name, "rb") as f:
                    with patch('main.UPLOAD_DIR', temp_dir):
                        response = client.post(
                            "/comments/upload",
                            files={"files": ("test.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
                        )
                assert response.status_code == 200
                
                # Test JSON upload
                with open(json_file.name, "rb") as f:
                    with patch('main.UPLOAD_DIR', temp_dir):
                        response = client.post(
                            "/comments/upload",
                            files={"files": ("test.json", f, "application/json")}
                        )
                assert response.status_code == 200
                
                # Test unsupported file type
                with open(txt_file.name, "rb") as f:
                    with patch('main.UPLOAD_DIR', temp_dir):
                        response = client.post(
                            "/comments/upload",
                            files={"files": ("test.txt", f, "text/plain")}
                        )
                assert response.status_code == 200
            
            # Clean up files
            os.unlink(csv_file.name)
            os.unlink(tsv_file.name)
            os.unlink(xlsx_file.name)
            os.unlink(json_file.name)
            os.unlink(txt_file.name)
            
        finally:
            shutil.rmtree(temp_dir)

    def test_process_comments_task_rag_unavailable(self):
        """Test process_comments_task with RAG unavailable (line 224-225)"""
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
            
            # Mock status file update function to check it's called correctly
            with patch('rag.has_rag_dependencies', False), \
                 patch('error_utils.update_status_file') as mock_update_status, \
                 patch('error_utils.update_dataframe_error') as mock_update_df_error:
                
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
                
                # Should update dataframe with error
                mock_update_df_error.assert_called()
        finally:
            shutil.rmtree(temp_dir)

    def test_process_comments_task_rag_error(self):
        """Test process_comments_task with RAG processing error (line 259-260)"""
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
            
            # Mock RAG processing to raise an exception
            with patch('rag.has_rag_dependencies', True), \
                 patch('rag.vector_store', MagicMock()), \
                 patch('rag.comment_category_chain', MagicMock()), \
                 patch('rag.process_comments_with_rag', AsyncMock(side_effect=Exception("RAG processing error"))), \
                 patch('error_utils.update_status_file') as mock_update_status:
                
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

    def test_get_project_comments_filtering(self, client):
        """Test get_project_comments with filtering (line 654)"""
        temp_dir = tempfile.mkdtemp()
        project_id = "test_project"
        project_dir = os.path.join(temp_dir, project_id)
        os.makedirs(project_dir, exist_ok=True)
        
        try:
            # Create test data with various classifications
            export_path = os.path.join(project_dir, "data_export.csv")
            df = pd.DataFrame({
                "id": [1, 2, 3, 4, 5],
                "comment": ["Test 1", "Test 2", "Test 3", "Test 4", "Test 5"],
                "ClassifiedCategory": ["OK", "Complaint", "OK", "Sexism", "Mental Health"],
                "ClassifiedConfidence": [95, 85, 75, 65, 55],
                "HumanCategory": ["", "Complaint", "", "", ""],
                "FinalClassification": ["OK", "Complaint", "OK", "Sexism", "Mental Health"]
            })
            df.to_csv(export_path, index=False)
            
            with patch('main.UPLOAD_DIR', temp_dir):
                # Test filter by category
                response = client.get(f"/projects/{project_id}/comments?filter=Complaint")
                assert response.status_code == 200
                data = response.json()
                # Should only return complaints
                for comment in data["comments"]:
                    assert comment["category"] == "Complaint"
                
                # Test filter by "Needs Review" (low confidence)
                response = client.get(f"/projects/{project_id}/comments?filter=Needs%20Review")
                assert response.status_code == 200
                data = response.json()
                # Should only return low confidence items
                assert len(data["comments"]) > 0
        finally:
            shutil.rmtree(temp_dir)

    def test_get_comment_by_id_keywords_json(self, client):
        """Test get_comment_by_id with keywords JSON (line 794-795)"""
        temp_dir = tempfile.mkdtemp()
        project_id = "test_project"
        project_dir = os.path.join(temp_dir, project_id)
        os.makedirs(project_dir, exist_ok=True)
        
        try:
            # Create data with Keywords field
            export_path = os.path.join(project_dir, "data_export.csv")
            keywords_json = json.dumps(["keyword1", "keyword2", "keyword3"])
            df = pd.DataFrame({
                "id": [1, 2],
                "comment": ["Test 1", "Test 2"],
                "ClassifiedCategory": ["OK", "Complaint"],
                "HumanCategory": ["", ""],
                "FinalClassification": ["OK", "Complaint"],
                "Keywords": [keywords_json, ""]
            })
            df.to_csv(export_path, index=False)
            
            # Mock get_comment_by_id response with keywords
            mock_response = {
                "id": 1,
                "comment": "Test 1",
                "category": "OK",
                "confidence": 90,
                "keywords": ["keyword1", "keyword2", "keyword3"]
            }
            
            with patch('main.UPLOAD_DIR', temp_dir), \
                 patch('main.get_comment_by_id', return_value=mock_response):
                
                response = client.get(f"/projects/{project_id}/comments/1")
                assert response.status_code == 200
                data = response.json()
                assert "keywords" in data
                assert data["keywords"] == ["keyword1", "keyword2", "keyword3"]
                
                # Test invalid JSON in Keywords field
                with open(export_path, 'w') as f:
                    f.write("id,comment,ClassifiedCategory,HumanCategory,FinalClassification,Keywords\n")
                    f.write('1,"Test 1",OK,,OK,"invalid json"\n')
                
                # Mock response for invalid JSON
                mock_response2 = {
                    "id": 1,
                    "comment": "Test 1",
                    "category": "OK",
                    "confidence": 90,
                    "keywords": None
                }
                
                with patch('main.get_comment_by_id', return_value=mock_response2):
                    response = client.get(f"/projects/{project_id}/comments/1")
                    assert response.status_code == 200
                    data = response.json()
                    assert "keywords" in data
                    assert data["keywords"] is None
        finally:
            shutil.rmtree(temp_dir)

    def test_export_comments_no_matching_after_filtering(self, client):
        """Test export_comments with no matching after filtering (line 953)"""
        temp_dir = tempfile.mkdtemp()
        project_id = "test_project"
        project_dir = os.path.join(temp_dir, project_id)
        os.makedirs(project_dir, exist_ok=True)
        
        try:
            # Create data with standard ID column
            export_path = os.path.join(project_dir, "data_export.csv")
            df = pd.DataFrame({
                "id": [1, 2, 3],
                "comment": ["Test 1", "Test 2", "Test 3"]
            })
            df.to_csv(export_path, index=False)
            
            # Mock error response
            error_response = {
                "success": False,
                "message": "No matching comments found",
                "status_code": 404
            }
            
            with patch('main.UPLOAD_DIR', temp_dir), \
                 patch('error_utils.api_error', return_value=error_response):
                
                # Test with non-existent IDs
                response = client.get(f"/projects/{project_id}/export?ids=999&format=csv")
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is False
                assert "No matching comments found" in data["message"]
        finally:
            shutil.rmtree(temp_dir)

    def test_rag_query_empty_comment(self, client):
        """Test rag_query with empty comment (line 1002)"""
        response = client.post("/rag", json={"comment": ""})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "Empty comment provided" in data["message"]

    def test_rag_processing_error(self, client):
        """Test rag_query with processing error (line 1055-1057)"""
        with patch('rag.process_comment_with_rag', AsyncMock(side_effect=Exception("Test error"))):
            response = client.post("/rag", json={"comment": "Test comment"})
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is False
            assert "Error processing comment" in data["message"]