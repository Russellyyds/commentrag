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


def test_comment_not_found_returns_error(tmp_path):
    """
    When requesting a non-existent comment_id, the API should return success=False
    with an error message and status code 200
    """
    df = pd.DataFrame({
        "comment_id": [1, 2],
        "comment": ["a", "b"]
    })
    prepare_csv(tmp_path, "proj_not_found", df)

    resp = client.get("/projects/proj_not_found/comments/3")
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("success") is False
    assert body.get("message", "").startswith("Comment with ID 3 not found")


def test_fallback_to_any_text_column(tmp_path):
    """
    When no standard text column is found, it should fall back to any column with object type
    that's not entirely empty, and return that text
    """
    df = pd.DataFrame({
        "id": [1],
        "foo": ["fallback text"],
        "Other": [123]
    })
    prepare_csv(tmp_path, "proj_fallback", df)

    resp = client.get("/projects/proj_fallback/comments/1?include_similar=false")
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("comment") == "fallback text"


def test_no_text_column_returns_error(tmp_path):
    """
    When no usable text column exists, the API should return success=False 
    with an error message and status code 200
    """
    df = pd.DataFrame({
        "id": [1],
        "num": [10]
    })
    prepare_csv(tmp_path, "proj_no_text", df)

    resp = client.get("/projects/proj_no_text/comments/1")
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("success") is False
    assert "No suitable comment text column found" in body.get("message", "")


def test_comment_id_try_exception(tmp_path, monkeypatch):
    """
    Force an exception in the try block before index fallback, triggering
    the except branch and returning err.api_error
    """
    # Use a column name not in the id_columns list to ensure comment_row is empty
    df = pd.DataFrame({
        "foo": [1]
    })
    prepare_csv(tmp_path, "proj_exc", df)
    # Monkeypatch __len__ method to make len(df) throw an exception
    monkeypatch.setattr(pd.DataFrame, "__len__", lambda self: (_ for _ in ()).throw(Exception("boom")))

    resp = client.get("/projects/proj_exc/comments/1")
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("success") is False
    assert "Comment with ID 1 not found" in body.get("message", "")