import pytest
import os
import pandas as pd
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock
import tempfile
import shutil

from main import app

@pytest.mark.asyncio
async def test_file_upload_and_process_flow_fixed():
    """
    End-to-end test for file upload and processing workflow with proper async handling
    """
    # Create a temporary test directory
    temp_upload_dir = tempfile.mkdtemp()
    
    # Create a test CSV file
    test_csv_content = "id,comment\n1,This is a test comment\n2,Another test comment"
    test_csv_path = os.path.join(temp_upload_dir, "test_data.csv")
    with open(test_csv_path, "w") as f:
        f.write(test_csv_content)
    
    try:
        # Mock RAG and Agent services
        with patch('main.UPLOAD_DIR', temp_upload_dir), \
             patch('rag.has_rag_dependencies', True), \
             patch('rag.vector_store', MagicMock()), \
             patch('rag.comment_category_chain', MagicMock()), \
             patch('agent.has_agent_dependencies', True), \
             patch('agent.comment_agent', MagicMock()), \
             patch('rag.process_comments_with_rag', AsyncMock()) as mock_process:
            
            # Simulate successful processing
            async def simulate_processing(export_path, batch_size):
                # Create a fully populated dataframe with all required columns
                df = pd.DataFrame({
                    "id": [1, 2],
                    "comment": ["This is a test comment", "Another test comment"],
                    "ClassifiedCategory": ["OK", "OK"],
                    "ClassifiedConfidence": [90.0, 90.0],
                    "HumanCategory": ["", ""],
                    "FinalClassification": ["OK", "OK"],
                    "Reason": ["Test classification", "Test classification"],
                    "ProcessingError": ["", ""],
                    "SimilarCommentId": ["", ""]
                })
                df.to_csv(export_path, index=False)
                return df
            
            mock_process.side_effect = simulate_processing
            
            # Use TestClient for synchronous endpoints
            client = TestClient(app)
            
            # Step 1: Upload file (synchronous endpoint)
            with open(test_csv_path, "rb") as f:
                response = client.post(
                    "/comments/upload",
                    files={"files": ("test_data.csv", f, "text/csv")}
                )
            
            assert response.status_code == 200
            upload_data = response.json()
            assert upload_data["success"] is True
            project_id = upload_data["project_id"]
            
            # Step 2: Process comments (synchronous endpoint that starts async task)
            response = client.post(
                "/comments/process",
                json={"fileIds": upload_data["fileIds"], "project_id": project_id}
            )
            
            assert response.status_code == 200
            process_data = response.json()
            assert process_data["success"] is True
            
            # Step 3: Check progress (synchronous endpoint)
            # First, create a status file to simulate processing
            project_dir = os.path.join(temp_upload_dir, project_id)
            os.makedirs(project_dir, exist_ok=True)
            
            data_export_path = os.path.join(project_dir, "data_export.csv")
            
            # Create a properly formatted data_export.csv file - all at once
            df = pd.DataFrame({
                "id": [1, 2],
                "comment": ["This is a test comment", "Another test comment"],
                "ClassifiedCategory": ["OK", "OK"],
                "ClassifiedConfidence": [90.0, 90.0],
                "HumanCategory": ["", ""],
                "FinalClassification": ["OK", "OK"],
                "Reason": ["Test classification", "Test classification"],
                "ProcessingError": ["", ""],
                "SimilarCommentId": ["", ""]
            })
            df.to_csv(data_export_path, index=False)
            
            # Create a status file
            with open(os.path.join(project_dir, "status.json"), "w") as f:
                f.write('{"status": "in_progress", "progress": 50, "has_errors": false}')
            
            # Check progress
            response = client.get(f"/projects/{project_id}/progress")
            
            assert response.status_code == 200
            progress_data = response.json()
            assert progress_data["status"] == "in_progress"
            
            # Update status to completed - no need to modify data_export.csv again
            with open(os.path.join(project_dir, "status.json"), "w") as f:
                f.write('{"status": "completed", "progress": 100, "has_errors": false}')
            
            # Step 5: Check status and stats after processing
            response = client.get(f"/projects/{project_id}/status")
            
            assert response.status_code == 200
            status_data = response.json()
            assert status_data["status"] == "completed"
            assert status_data["total_comments"] > 0
            
            # Step 6: Get comments
            response = client.get(f"/projects/{project_id}/comments")
            
            assert response.status_code == 200
            comments_data = response.json()
            assert len(comments_data["comments"]) > 0
            
    finally:
        # Clean up
        shutil.rmtree(temp_upload_dir)