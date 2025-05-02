import os
import json
import pytest
from fastapi.testclient import TestClient
import main
import error_utils as err
import pandas as pd
import asyncio

# Fixture to isolate UPLOAD_DIR for tests
def pytest_configure(config):
    import tempfile

@pytest.fixture(autouse=True)
def temp_upload_dir(monkeypatch, tmp_path):
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    monkeypatch.setattr(main, "UPLOAD_DIR", str(upload_dir))
    return upload_dir

client = TestClient(main.app)


def test_process_comments_error_creating_status_file(caplog):
    """
    Trigger FileNotFoundError when creating status.json (directory missing),
    should log "Error creating status file" and return success.
    """
    caplog.set_level("ERROR", logger=err.logger.name)
    response = client.post(
        "/comments/process",
        json={"fileIds": ["any_id"], "project_id": "missing_dir"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert any("Error creating status file" in rec.message for rec in caplog.records)


@pytest.mark.asyncio
async def test_process_comments_task_error_updating_final(tmp_path, caplog, monkeypatch):
    """
    Simulate failure in update_final_classification,
    should log "Error updating FinalClassification" and status.json updated to error.
    """
    caplog.set_level("ERROR", logger=err.logger.name)
    # Prepare project directory and CSV
    project_dir = tmp_path / "uploads" / "proj"
    project_dir.mkdir(parents=True)
    export_path = project_dir / "data_export.csv"
    export_path.write_text("col\nvalue\n")
    status_path = project_dir / "status.json"

    # Monkey-patch RAG dependencies to proceed to final classification
    monkeypatch.setattr(main.rag, "has_rag_dependencies", True)
    monkeypatch.setattr(main.rag, "vector_store", object())
    monkeypatch.setattr(main.rag, "comment_category_chain", object())
    async def fake_process(path, batch):
        return
    monkeypatch.setattr(main.rag, "process_comments_with_rag", fake_process)

    # Force update_final_classification to raise
    def fail_update(df):
        raise RuntimeError("fail classification")
    monkeypatch.setattr(main, "update_final_classification", fail_update)

    # Execute task
    await main.process_comments_task(str(export_path), str(project_dir))

    # Verify error logged
    assert any("Error updating FinalClassification: fail classification" in rec.message for rec in caplog.records)
    # Verify status file updated to error state
    status = json.loads(status_path.read_text())
    assert status["status"] == "error"
    assert status.get("error_message") == "Error updating final classification: fail classification"


def test_get_project_progress_outer_exception(caplog, monkeypatch):
    """
    Simulate os.path.exists raising, should trigger outer exception branch in get_project_progress.
    """
    caplog.set_level("ERROR", logger=err.logger.name)
    # Make exists throw
    monkeypatch.setattr(main.os.path, "exists", lambda p: (_ for _ in ()).throw(RuntimeError("exists fail")))

    response = client.get("/projects/foo/progress")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "Error getting project progress: exists fail" in data["message"]
    assert any("Error getting project progress: exists fail" in rec.message for rec in caplog.records)
