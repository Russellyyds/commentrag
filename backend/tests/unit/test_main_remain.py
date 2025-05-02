import os
import pytest
from fastapi.testclient import TestClient

import main

@pytest.fixture
def tmp_upload_dir(tmp_path, monkeypatch):
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    monkeypatch.setattr(main, "UPLOAD_DIR", str(upload_dir))
    return upload_dir

def test_reset_project_rmdir_failure(tmp_upload_dir, monkeypatch, caplog):
    project_id = "proj3"
    batch_dir = tmp_upload_dir / project_id
    batch_dir.mkdir()
    (batch_dir / "foo.txt").write_text("bar")

    monkeypatch.setattr(os, "rmdir", lambda path: (_ for _ in ()).throw(OSError("无法删除目录")))

    caplog.set_level("ERROR")
    client = TestClient(main.app)
    resp = client.post(f"/projects/{project_id}/reset", json={"confirm": True})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "has been reset" in data["message"]

    assert batch_dir.exists()
    assert "Failed to remove directory" in caplog.text
