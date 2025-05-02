import os
import pandas as pd
import pytest
from fastapi.testclient import TestClient

import main
import uploader
import error_utils as err

from fastapi import FastAPI

@pytest.fixture(autouse=True)
def isolate_upload_dir(tmp_path, monkeypatch):
    """
    For each test, redirect main.UPLOAD_DIR to a temporary folder
    and ensure it exists.
    """
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    monkeypatch.setattr(main, "UPLOAD_DIR", str(upload_dir))
    return upload_dir

def test_upload_files_logs_read_error(tmp_path, isolate_upload_dir, caplog, monkeypatch):
    """
    Simulate a case where data_export.csv already exists, but pd.read_csv(export_path)
    throws a PermissionError due to permission issues. Check that the process doesn't crash
    and logs the error properly.
    """
    caplog.set_level("ERROR", logger=err.logger.name)

    # 1) Manually create a project directory and a data_export.csv file under UPLOAD_DIR
    project_id = "proj123"
    project_dir = isolate_upload_dir / project_id
    project_dir.mkdir()
    export_path = project_dir / "data_export.csv"
    export_path.write_text("id,comment\n1,test line")  # Content doesn't matter

    # 2) Monkey-patch pd.read_csv: throw PermissionError when reading export_path, normal reading for other paths
    real_read_csv = pd.read_csv
    def fake_read_csv(path, *args, **kwargs):
        if os.path.abspath(path) == str(export_path):
            raise PermissionError("Permission denied")
        return real_read_csv(path, *args, **kwargs)
    monkeypatch.setattr(pd, "read_csv", fake_read_csv)

    # 3) Monkey-patch uploader.process_file_dataframe to return DataFrame as is
    monkeypatch.setattr(uploader, "process_file_dataframe", lambda df: df)

    # 4) Create a new CSV file and call the /comments/upload endpoint
    new_file = tmp_path / "new.csv"
    new_file.write_text("id,comment\n2,Hello\n3,World\n")
    client = TestClient(main.app)
    with open(new_file, "rb") as fp:
        resp = client.post(
            "/comments/upload",
            files={"files": ("new.csv", fp, "text/csv")},
            data={"project_id": project_id},
        )
    assert resp.status_code == 200
    body = resp.json()
    # The newly uploaded 2 rows should be processed normally
    assert body["success"] is True
    assert body["total_comments"] == 2

    # 5) Verify that the log contains "Error reading existing data_export.csv"
    assert any(
        "Error reading existing data_export.csv" in record.message
        for record in caplog.records
    )