import os
import pandas as pd
import pytest
from fastapi.testclient import TestClient

import main

@pytest.fixture
def tmp_upload_dir(tmp_path, monkeypatch):
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    monkeypatch.setattr(main, "UPLOAD_DIR", str(upload_dir))
    return upload_dir

def test_get_project_status_categories_classified(tmp_upload_dir):
    project_id = "proj2"
    project_dir = tmp_upload_dir / project_id
    project_dir.mkdir()

    df = pd.DataFrame({
        "ClassifiedCategory": ["A", "", None, "B", "A"],
        "HumanCategory":      ["", "", "",   "", ""]
    })
    df.to_csv(project_dir / "data_export.csv", index=False)

    client = TestClient(main.app)
    resp = client.get(f"/projects/{project_id}/status")
    assert resp.status_code == 200
    result = resp.json()

    assert result["categories"] == {"A": 2, "Unclassified": 2, "B": 1}
