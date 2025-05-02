import pandas as pd
import pytest
from fastapi.testclient import TestClient
import main

client = TestClient(main.app)

@pytest.fixture(autouse=True)
def isolate_upload_dir(tmp_path, monkeypatch):
    """
    Redirect UPLOAD_DIR to a temporary directory to avoid writing to the real file system
    """
    monkeypatch.setattr(main, "UPLOAD_DIR", str(tmp_path))
    yield


def prepare_csv(tmp_path, project_id, df: pd.DataFrame):
    """
    Create project_id directory under tmp_path and write data_export.csv
    """
    project_dir = tmp_path / project_id
    project_dir.mkdir()
    csv_path = project_dir / "data_export.csv"
    df.to_csv(csv_path, index=False)


def test_category_prefers_human_over_classified(tmp_path):
    """
    Corresponds to main.py line 829: When HumanCategory exists and is not empty, 
    should return HumanCategory
    """
    df = pd.DataFrame({
        "id": [1],
        "comment": ["test comment"],
        "ClassifiedCategory": ["Classified_X"],
        "HumanCategory": ["Human_Y"],
        "ClassifiedConfidence": ["50"]
    })
    prepare_csv(tmp_path, "proj_human_priority", df)

    resp = client.get("/projects/proj_human_priority/comments/1?include_similar=false")
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("category") == "Human_Y"


def test_category_uses_classified_when_no_human(tmp_path):
    """
    Corresponds to main.py line 831: When only ClassifiedCategory exists and 
    HumanCategory is empty or doesn't exist, should return ClassifiedCategory
    """
    df = pd.DataFrame({
        "id": [1],
        "comment": ["another comment"],
        "ClassifiedCategory": ["Classified_Z"],
        # HumanCategory column doesn't exist
        "ClassifiedConfidence": ["80"]
    })
    prepare_csv(tmp_path, "proj_classified_fallback", df)

    resp = client.get("/projects/proj_classified_fallback/comments/1?include_similar=false")
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("category") == "Classified_Z"


def test_confidence_exception_leaves_default(tmp_path):
    """
    Corresponds to main.py line 838: When ClassifiedConfidence can't be converted to float,
    should keep default confidence=0
    """
    df = pd.DataFrame({
        "id": [1],
        "comment": ["bad confidence"],
        "ClassifiedCategory": ["Cat_E"],
        # Using dict type, float() will raise an exception
        "ClassifiedConfidence": [{"x": 1}]
    })
    prepare_csv(tmp_path, "proj_conf_exception", df)

    resp = client.get("/projects/proj_conf_exception/comments/1?include_similar=false")
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("confidence") == 0