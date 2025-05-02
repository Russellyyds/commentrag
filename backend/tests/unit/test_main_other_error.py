# tests/test_main_additional_branches.py
import os
import json
import pytest
import pandas as pd
from fastapi.testclient import TestClient
import io
from unittest.mock import patch, MagicMock
import main
import error_utils as err

@pytest.fixture(autouse=True)
def temp_upload_dir(monkeypatch, tmp_path):
    """
    Redirect UPLOAD_DIR to a temp fixture directory
    """
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    monkeypatch.setattr(main, "UPLOAD_DIR", str(upload_dir))
    return upload_dir

client = TestClient(main.app)

# 472-473: /projects/{project_id}/status -> missing export file
def test_get_status_no_export_file(temp_upload_dir):
    project_id = "proj_no_file"
    resp = client.get(f"/projects/{project_id}/status")
    data = resp.json()
    assert data["success"] is False
    assert "Data export file not found" in data["message"]

# 496-498: /projects/{project_id}/status when status file is in_progress
def test_get_status_in_progress(temp_upload_dir):
    project_id = "proj_in_prog"
    proj_dir = temp_upload_dir / project_id
    proj_dir.mkdir()
    status = {"status": "in_progress", "progress": 0, "has_errors": False, "error_message": ""}
    (proj_dir / "status.json").write_text(json.dumps(status))
    resp = client.get(f"/projects/{project_id}/status")
    data = resp.json()
    assert data["status"] == "in_progress"
    assert data.get("is_processing") is True

# 560-561: reset without confirm -> should error
def test_reset_without_confirm(temp_upload_dir):
    project_id = "proj_reset"
    resp = client.post(f"/projects/{project_id}/reset", json={"confirm": False})
    data = resp.json()
    assert data["success"] is False
    assert "Confirmation required" in data["message"]

# 609: reset confirmed but no directory -> success
def test_reset_confirm_no_dir(temp_upload_dir):
    project_id = "proj_empty"
    resp = client.post(f"/projects/{project_id}/reset", json={"confirm": True})
    data = resp.json()
    assert data["success"] is True
    assert "no associated files" in data["message"].lower()

# 659: /rag empty comment -> Error
def test_rag_empty_comment():
    resp = client.post("/rag", json={"comment": ""})
    data = resp.json()
    assert data["success"] is False
    assert "Empty comment" in data["message"]

# 691: get_project_comments no file -> 404
def test_get_comments_no_file(temp_upload_dir):
    project_id = "proj_comments"
    resp = client.get(f"/projects/{project_id}/comments")
    assert resp.status_code == 404

# 711: get_comment_by_id no file -> api_error
def test_get_comment_by_id_no_file(temp_upload_dir):
    project_id = "proj_cmt"
    resp = client.get(f"/projects/{project_id}/comments/1")
    data = resp.json()
    assert data["success"] is False

# 723-730: get_comment_by_id invalid id -> api_error
def test_get_comment_by_id_not_found(temp_upload_dir):
    project_id = "proj_cmt2"
    d = temp_upload_dir / project_id
    d.mkdir()
    pd.DataFrame([{"comment": "hello"}]).to_csv(d / "data_export.csv", index=False)
    resp = client.get(f"/projects/{project_id}/comments/999")
    data = resp.json()
    assert data["success"] is False
    assert "not found" in data["message"].lower()

# 739: update_comment_category no file -> api_error
def test_update_comment_no_file(temp_upload_dir):
    project_id = "proj_upd"
    resp = client.put(f"/projects/{project_id}/comments/1", json={"category": "Test"})
    data = resp.json()
    assert data["success"] is False

# 763-764: update_comment invalid id -> api_error
def test_update_comment_invalid_id(temp_upload_dir):
    project_id = "proj_upd2"
    d = temp_upload_dir / project_id
    d.mkdir()
    pd.DataFrame([{"comment": "a"}]).to_csv(d / "data_export.csv", index=False)
    resp = client.put(f"/projects/{project_id}/comments/5", json={"category": "Cat"})
    data = resp.json()
    assert data["success"] is False

# 775: update_comment success path
def test_update_comment_success(temp_upload_dir):
    project_id = "proj_upd3"
    d = temp_upload_dir / project_id
    d.mkdir()
    pd.DataFrame([{"comment": "a", "ClassifiedConfidence": 0}]).to_csv(d / "data_export.csv", index=False)
    resp = client.put(f"/projects/{project_id}/comments/1", json={"category": "New"})
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["category"] == "New"

# 799-800: export_comments invalid format -> api_error
def test_export_comments_invalid_format(temp_upload_dir):
    resp = client.get("/projects/proj1/export?ids=1&format=xml")
    data = resp.json()
    assert data["success"] is False

# 813-815: export_comments missing file -> api_error
def test_export_comments_no_file(temp_upload_dir):
    resp = client.get("/projects/proj2/export?ids=1&format=csv")
    data = resp.json()
    assert data["success"] is False

# 818: export_comments no matching comments -> api_error
def test_export_comments_no_matches(temp_upload_dir):
    project_id = "proj3"
    d = temp_upload_dir / project_id
    d.mkdir()
    pd.DataFrame([{"id": 2, "comment": "ok"}]).to_csv(d / "data_export.csv", index=False)
    resp = client.get(f"/projects/{project_id}/export?ids=1&format=csv")
    data = resp.json()
    assert data["success"] is False

# 828-831: rag/agent empty -> Error
@pytest.mark.asyncio
async def test_rag_agent_empty_comment():
    resp = client.post("/rag/agent", json={"comment": ""})
    data = resp.json()
    assert data["success"] is False

# 838: export_comments CSV read error -> api_error - FIXED
def test_export_comments_read_csv_error(temp_upload_dir, monkeypatch):
    project_id = "proj4"
    d = temp_upload_dir / project_id
    d.mkdir()
    
    # First create the file so it passes the file existence check
    pd.DataFrame([{"id": 1, "comment": "test"}]).to_csv(d / "data_export.csv", index=False)
    
    # Then mock the read_csv function to fail
    original_read_csv = pd.read_csv
    def mock_read_csv(*args, **kwargs):
        raise RuntimeError("read fail")
    
    monkeypatch.setattr(pd, "read_csv", mock_read_csv)
    
    resp = client.get(f"/projects/{project_id}/export?ids=1&format=csv")
    data = resp.json()
    assert data["success"] is False
    assert "Error exporting comments" in data["message"]

# 877-878: get_project_comments read CSV failure -> api_error
def test_get_project_comments_csv_error(temp_upload_dir, monkeypatch):
    project_id = "proj5"
    d = temp_upload_dir / project_id
    d.mkdir()
    (d / "data_export.csv").write_text("comment\nhi\n")
    monkeypatch.setattr(pd, "read_csv", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("read fail")))
    resp = client.get(f"/projects/{project_id}/comments")
    data = resp.json()
    assert data["success"] is False
    assert "Error retrieving comments" in data["message"]

# 900-901: get_comment_by_id CSV parse error -> api_error
def test_get_comment_by_id_csv_error(temp_upload_dir, monkeypatch):
    project_id = "proj6"
    d = temp_upload_dir / project_id
    d.mkdir()
    pd.DataFrame([{"comment": "ok"}]).to_csv(d / "data_export.csv", index=False)
    # first read ok, second read fail
    orig = pd.read_csv
    def fake_read(path, *args, **kwargs):
        if "data_export.csv" in str(path):
            raise RuntimeError("parse fail")
        return orig(path, *args, **kwargs)
    monkeypatch.setattr(pd, "read_csv", fake_read)
    resp = client.get(f"/projects/{project_id}/comments/1")
    data = resp.json()
    assert data["success"] is False
    assert "Error retrieving comment" in data["message"]

# 924: update_comment_category to_csv error -> api_error
def test_update_comment_to_csv_error(temp_upload_dir, monkeypatch):
    project_id = "proj7"
    d = temp_upload_dir / project_id
    d.mkdir()
    pd.DataFrame([{"comment": "x"}]).to_csv(d / "data_export.csv", index=False)
    # monkeypatch DataFrame.to_csv
    import pandas as real_pd
    monkeypatch.setattr(real_pd.DataFrame, "to_csv", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("to_csv fail")))
    resp = client.put(f"/projects/{project_id}/comments/1", json={"category": "Y"})
    data = resp.json()
    assert data["success"] is False
    assert "Error updating comment" in data["message"]

# 958: rag/agent processing exception -> 500-like error
@pytest.mark.asyncio
async def test_rag_agent_processing_error(monkeypatch):
    # valid comment but simulate agent error
    monkeypatch.setattr(main.agent, "has_agent_dependencies", True)
    monkeypatch.setattr(main.agent, "comment_agent", object())
    monkeypatch.setattr(main.agent, "process_comment_with_agent", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("agent fail")))
    resp = client.post("/rag/agent", json={"comment": "hey"})
    data = resp.json()
    assert data["success"] is False
    assert "Error processing comment with agent" in data["message"]