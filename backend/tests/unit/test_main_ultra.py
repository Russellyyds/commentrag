import os
import json
import shutil
import pandas as pd
import pytest
from fastapi.testclient import TestClient
import main
from main import update_final_classification, update_status_file

# Create a TestClient for the FastAPI app
test_app = TestClient(main.app)

@pytest.fixture(autouse=True)
def setup_env(tmp_path, monkeypatch):
    # Override UPLOAD_DIR to a temporary directory
    upload_dir = tmp_path / "uploads"
    monkeypatch.setenv("UPLOAD_DIR", str(upload_dir))
    # Ensure the directory exists
    if upload_dir.exists():
        shutil.rmtree(upload_dir)
    upload_dir.mkdir()
    # Directly update main.UPLOAD_DIR to ensure it uses our test directory
    monkeypatch.setattr(main, "UPLOAD_DIR", str(upload_dir))
    return upload_dir

# ---------------------- Unit tests for helper functions ----------------------

def test_update_final_classification_basic():
    df = pd.DataFrame({
        "HumanCategory": ["A", "", None, ""],
        "ClassifiedCategory": ["", "B", "C", None],
    })
    result = update_final_classification(df.copy())
    # Expect HumanCategory when present, otherwise ClassifiedCategory, else empty
    assert result["FinalClassification"].tolist() == ["A", "B", "C", ""]


def test_update_status_file_creates_and_updates(tmp_path):
    status_file = tmp_path / "status.json"
    # Call update_status_file without existing file
    update_status_file(str(status_file), status="test", progress=42, has_errors=True, error_message="oops")
    data = json.loads(status_file.read_text())
    assert data["status"] == "test"
    assert data["progress"] == 42
    assert data["has_errors"] is True
    assert data["error_message"] == "oops"
    assert "update_time" in data


def test_update_status_file_handles_error(tmp_path, monkeypatch):
    # Create a status path in a non-existent directory
    non_existent_dir = tmp_path / "nonexistent_dir"
    status_path = non_existent_dir / "status.json"
    
    # Mock the logging function to capture errors
    error_messages = []
    def mock_error(message):
        error_messages.append(message)
    
    monkeypatch.setattr(main.err.logger, "error", mock_error)
    
    # Call the function which should handle the error
    main.update_status_file(str(status_path), "error", progress=50)
    
    # Verify error was logged
    assert any("Error updating status file" in msg for msg in error_messages)

# ---------------------- Tests for /comments/upload endpoint ----------------------

def test_upload_files_with_invalid_existing_csv(setup_env, monkeypatch):
    # Create a project directory
    project_id = "test_proj"
    project_dir = setup_env / project_id
    project_dir.mkdir()
    
    # Create an invalid CSV file
    export_path = project_dir / "data_export.csv"
    export_path.write_text("invalid,csv,content\nwith,no,proper,headers")
    
    # Corrupt the file to make it invalid CSV
    with open(export_path, 'a') as f:
        f.write("\x00\x01invalid binary content")
    
    # Create a simple CSV for upload
    test_csv = project_dir / "test.csv"
    test_csv.write_text("comment\nTest comment")
    
    # Upload the file, which should attempt to read the existing invalid CSV
    with open(test_csv, 'rb') as f:
        response = test_app.post(
            "/comments/upload",
            files={"files": ("test.csv", f, "text/csv")},
            data={"project_id": project_id}
        )
    
    # Test should pass even with the error reading the existing file
    assert response.status_code == 200
    assert response.json()["success"] is True

# ---------------------- Tests for /comments/process endpoint ----------------------

def test_process_comments_no_fileIds():
    response = test_app.post("/comments/process", json={"fileIds": [], "project_id": "proj"})
    assert response.status_code == 400
    assert response.json()["detail"] == "No file IDs provided"


def test_process_comments_no_project_id():
    # fileIds provided but no project_id
    response = test_app.post("/comments/process", json={"fileIds": ["id1"]})
    # Should return an api_error with success False
    body = response.json()
    assert body.get("success") is False
    assert "No project ID provided" in body.get("message", "")

# ---------------------- Tests for /projects/{project_id}/progress ----------------------

def test_get_project_progress_status_not_found():
    response = test_app.get("/projects/nonexistent/progress")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is False
    assert body["message"] == "Status file not found"


def test_get_project_progress_with_invalid_json(setup_env):
    # Create a project directory
    project_id = "test_progress"
    project_dir = setup_env / project_id
    project_dir.mkdir()
    
    # Create invalid JSON status file
    status_path = project_dir / "status.json"
    status_path.write_text("{invalid json content")
    
    response = test_app.get(f"/projects/{project_id}/progress")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is False
    assert "Error reading status file" in body["message"]

# ---------------------- Tests for /projects/{project_id}/reset ----------------------

def test_reset_project_without_confirm():
    response = test_app.post("/projects/any/reset", json={"confirm": False})
    assert response.status_code == 200
    body = response.json()
    assert body.get("success") is False
    assert "Confirmation required" in body.get("message", "")


def test_reset_project_with_confirm_and_existing_dir(setup_env):
    project_id = "proj1"
    upload_dir = setup_env
    proj_dir = upload_dir / project_id
    proj_dir.mkdir()
    # Create a dummy file inside
    (proj_dir / "dummy.txt").write_text("hello")
    
    response = test_app.post(f"/projects/{project_id}/reset", json={"confirm": True})
    
    assert response.status_code == 200
    body = response.json()
    assert body.get("success") is True
    # Directory should be removed - this is the line that was failing
    assert not proj_dir.exists()


def test_reset_project_with_nonexistent_dir(setup_env):
    # Try to reset a project that doesn't exist
    project_id = "nonexistent_proj"
    
    response = test_app.post(f"/projects/{project_id}/reset", json={"confirm": True})
    
    assert response.status_code == 200
    body = response.json()
    assert body.get("success") is True
    assert "no associated files were found" in body.get("message", "")

# ---------------------- Tests for /projects/{project_id}/comments when no data ----------------------

def test_get_project_comments_no_data():
    response = test_app.get("/projects/id/comments")
    assert response.status_code == 404

# ---------------------- Tests for /projects/{project_id}/status ----------------------

def test_get_project_status_and_stats_export_not_found():
    response = test_app.get("/projects/id/status")
    assert response.status_code == 200
    body = response.json()
    assert body.get("success") is False
    assert "Data export file not found" in body.get("message", "")


def test_get_project_status_with_in_progress(setup_env):
    # Create a project directory and status file showing "in_progress"
    project_id = "in_progress_project"
    project_dir = setup_env / project_id
    project_dir.mkdir()
    
    # Create status file with in_progress status
    status_path = project_dir / "status.json"
    status_data = {
        "status": "in_progress",
        "progress": 50,
        "has_errors": False,
        "error_message": "",
        "update_time": pd.Timestamp.now().isoformat()
    }
    with open(status_path, 'w') as f:
        json.dump(status_data, f)
    
    response = test_app.get(f"/projects/{project_id}/status")
    
    assert response.status_code == 200
    body = response.json()
    assert body.get("success") is True
    assert body.get("status") == "in_progress"
    assert body.get("is_processing") is True

# ---------------------- Tests for /rag endpoint ----------------------

def test_rag_empty_comment():
    response = test_app.post("/rag", json={"comment": ""})
    assert response.status_code == 200
    body = response.json()
    assert body.get("success") is False


def test_rag_unavailable(monkeypatch):
    # Simulate missing dependencies
    monkeypatch.setattr(main.rag, "has_rag_dependencies", False)
    monkeypatch.setattr(main.rag, "vector_store", None)
    monkeypatch.setattr(main.rag, "comment_category_chain", None)
    response = test_app.post("/rag", json={"comment": "test"})
    assert response.status_code == 503

# ---------------------- Tests for /rag/agent endpoint ----------------------

def test_agent_empty_comment():
    response = test_app.post("/rag/agent", json={"comment": " "})
    assert response.status_code == 200
    body = response.json()
    assert body.get("success") is False


def test_agent_unavailable(monkeypatch):
    monkeypatch.setattr(main.agent, "has_agent_dependencies", False)
    monkeypatch.setattr(main.agent, "comment_agent", None)
    response = test_app.post("/rag/agent", json={"comment": "test"})
    assert response.status_code == 503

# ---------------------- Tests for export endpoint ----------------------

def test_export_comments_invalid_format():
    response = test_app.get("/projects/id/export", params={"ids": [1], "format": "pdf"})
    assert response.status_code == 200
    body = response.json()
    assert body.get("success") is False


def test_export_comments_not_found():
    response = test_app.get("/projects/id/export", params={"ids": [1], "format": "csv"})
    assert response.status_code == 200
    body = response.json()
    assert body.get("success") is False