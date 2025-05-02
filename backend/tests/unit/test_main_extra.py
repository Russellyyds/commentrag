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
    return str(csv_path)


def test_rag_endpoint_error_classification(monkeypatch):
    """
    Corresponds to main.py line 609:
    When rag.process_comment_with_rag returns classification={"category":"Error","confidence":0,...},
    it should return success=False with the classification and reasoning.
    """
    # Force RAG functionality to be available
    monkeypatch.setattr(main.rag, "has_rag_dependencies", True)
    monkeypatch.setattr(main.rag, "vector_store", object())
    monkeypatch.setattr(main.rag, "comment_category_chain", object())

    async def fake_process(comment, vs, chain, categories):
        return [], {"category": "Error", "confidence": 0, "reasoning": "Test error reason"}
    monkeypatch.setattr(main.rag, "process_comment_with_rag", fake_process)

    resp = client.post(
        "/rag",
        json={"comment": "some test comment"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is False
    assert data["message"] == "Test error reason"
    assert data["classification"]["category"] == "Error"
    assert data["classification"]["confidence"] == 0
    assert isinstance(data["answer"], list)


def test_get_comments_fallback_text_column(tmp_path):
    """
    Corresponds to main.py line 659:
    When the CSV file has no standard text column,
    it should fall back to find any column of object type that's not entirely empty.
    """
    project_id = "proj1"
    df = pd.DataFrame({
        "foo": ["A comment", "Another comment"],
        "ClassifiedCategory": ["X", "Y"],
        "ClassifiedConfidence": [50, 90]
    })
    prepare_csv(tmp_path, project_id, df)

    resp = client.get(f"/projects/{project_id}/comments?page=1&limit=2")
    assert resp.status_code == 200
    data = resp.json()
    assert data["pagination"]["total"] == 2
    assert data["comments"][0]["comment"] == "A comment"
    assert data["comments"][0]["confidence"] == pytest.approx(50.0)
    assert data["comments"][0]["category"] == "X"


def test_get_comments_page_out_of_bounds(tmp_path):
    """
    Corresponds to main.py line 691:
    When passing page < 1, page should be corrected to 1.
    """
    project_id = "proj2"
    df = pd.DataFrame({
        "comment": ["only one"],
        "ClassifiedCategory": ["Z"],
        "ClassifiedConfidence": [100]
    })
    prepare_csv(tmp_path, project_id, df)

    resp = client.get(f"/projects/{project_id}/comments?page=0&limit=1")
    assert resp.status_code == 200
    data = resp.json()
    assert data["pagination"]["page"] == 1
    assert data["pagination"]["totalPages"] == 1
    assert data["comments"][0]["comment"] == "only one"


def test_nan_comment_text_column(tmp_path):
    """
    Corresponds to main.py line 711:
    When the original CSV has NaN in the comment column, comment should be set to ""
    in the returned JSON
    """
    df = pd.DataFrame({
        "comment": [pd.NA, "hello world"],
        "ClassifiedCategory": ["A", "B"],
        "ClassifiedConfidence": [10, 20]
    })
    prepare_csv(tmp_path, "proj_nan", df)

    resp = client.get("/projects/proj_nan/comments")
    assert resp.status_code == 200
    data = resp.json()
    assert data["comments"][0]["comment"] == ""
    assert data["comments"][1]["comment"] == "hello world"


def test_human_category_override(tmp_path):
    """
    Corresponds to main.py line 730:
    When HumanCategory exists and is not empty, it should be used to fill category field
    with higher priority
    """
    df = pd.DataFrame({
        "comment": ["foo"],
        "ClassifiedCategory": ["X"],
        "ClassifiedConfidence": [50],
        "HumanCategory": ["HUMAN_OK"]
    })
    prepare_csv(tmp_path, "proj_human", df)

    resp = client.get("/projects/proj_human/comments")
    assert resp.status_code == 200
    data = resp.json()
    assert data["comments"][0]["category"] == "HUMAN_OK"


def test_confidence_parsing(tmp_path):
    """
    Corresponds to main.py line 739:
    - String numerical values should be converted to float
    - Values that can't be converted to float should default to 0
    """
    df = pd.DataFrame({
        "comment": ["c1", "c2"],
        "ClassifiedCategory": ["C1", "C2"],
        "ClassifiedConfidence": ["45.5", "bad"]
    })
    prepare_csv(tmp_path, "proj_conf", df)

    resp = client.get("/projects/proj_conf/comments")
    assert resp.status_code == 200
    data = resp.json()
    confidences = [item["confidence"] for item in data["comments"]]
    assert confidences[0] == pytest.approx(45.5)
    assert confidences[1] == 0