import os
import io
import pytest
import pandas as pd
from fastapi.testclient import TestClient
import main

@pytest.fixture(autouse=True)
def temp_upload_dir(monkeypatch, tmp_path):
    """
    将 UPLOAD_DIR 指向一个临时目录，避免污染实际环境。
    """
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    monkeypatch.setattr(main, "UPLOAD_DIR", str(upload_dir))
    return upload_dir

client = TestClient(main.app)

def test_error_reading_existing_data(monkeypatch, temp_upload_dir):
    """
    模拟项目目录中已存在一个损坏的 data_export.csv，
    pd.read_csv 读取时抛错，应进入读取已有数据的异常分支，
    最终正常上传并返回 total_comments=1。
    """
    project_id = "existing_proj"
    proj_dir = temp_upload_dir / project_id
    proj_dir.mkdir()
    (proj_dir / "data_export.csv").write_text("not,a,valid,csv")
    files = [("files", ("test.csv", b"col1\nvalue1\n", "text/csv"))]
    response = client.post(
        "/comments/upload",
        data={"project_id": project_id},
        files=files
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["total_comments"] == 1

def test_error_processing_files(monkeypatch, temp_upload_dir):
    monkeypatch.setattr(main.pd, "concat", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("concat fail")))
    files = [("files", ("test.csv", b"col1\nvalue1\n", "text/csv"))]
    response = client.post("/comments/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["total_comments"] == 0

def test_outer_exception(monkeypatch, temp_upload_dir):
    """
    模拟 uuid.uuid4 在最开始就抛异常，
    应直接进入最外层异常分支，返回 success=False。
    """
    def fake_uuid():
        raise RuntimeError("uuid fail")
    monkeypatch.setattr(main.uuid, "uuid4", fake_uuid)
    files = [("files", ("test.csv", b"col1\nvalue1\n", "text/csv"))]
    response = client.post("/comments/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert data["message"].startswith("Error uploading files")
