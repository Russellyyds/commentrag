# tests/unit/test_main_upload_processing_error.py
import os
import pandas as pd
import pytest
from fastapi.testclient import TestClient

import main
import error_utils as err

@pytest.fixture(autouse=True)
def isolate_upload_dir(tmp_path, monkeypatch):
    # Direct UPLOAD_DIR to a temporary directory, automatically created
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    monkeypatch.setattr(main, "UPLOAD_DIR", str(upload_dir))
    return upload_dir

def test_upload_files_processing_error_logged(tmp_path, isolate_upload_dir, caplog, monkeypatch):
    """
    Simulate pd.concat throwing an exception, triggering the outer try/except.
    Verify that the upload endpoint returns success, total_comments as 0,
    and the log contains "Error processing files".
    """
    # Capture ERROR logs from error_utils
    caplog.set_level("ERROR", logger=err.logger.name)

    # Prepare a new CSV file for upload
    new_file = tmp_path / "data.csv"
    new_file.write_text("col1,col2\nx,1\ny,2\n")

    # Monkeypatch pd.concat to throw an exception
    def fake_concat(*args, **kwargs):
        raise RuntimeError("concat failed for test")
    monkeypatch.setattr(pd, "concat", fake_concat)

    client = TestClient(main.app)
    with open(new_file, "rb") as fp:
        resp = client.post(
            "/comments/upload",
            files={"files": ("data.csv", fp, "text/csv")},
        )

    # The endpoint should still return 200 and success=True
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    # Since processing failed, the total comment count should be 0
    assert body["total_comments"] == 0

    # The log should include "Error processing files: concat failed for test"
    assert any(
        "Error processing files: concat failed for test" in record.message
        for record in caplog.records
    )