import pandas as pd
import pytest
import json
from fastapi.testclient import TestClient
import main

client = TestClient(main.app)

@pytest.fixture(autouse=True)
def isolate_upload_dir(tmp_path, monkeypatch):
    # Redirect uploads to temp directory
    monkeypatch.setattr(main, "UPLOAD_DIR", str(tmp_path))
    yield


def prepare_csv(tmp_path, project_id, df: pd.DataFrame):
    # Create project dir and write CSV
    project_dir = tmp_path / project_id
    project_dir.mkdir()
    csv_path = project_dir / "data_export.csv"
    df.to_csv(csv_path, index=False)


def test_similar_commentid_parse_exception(tmp_path):
    """
    lines 877-878: If SimilarCommentId.split raises, should catch and proceed, returning empty similar_comments
    """
    df = pd.DataFrame({
        "id": [1],
        "comment": ["test comment"],
        "ClassifiedCategory": ["Cat"],
        "ClassifiedConfidence": [0],
        # Need to add FinalClassification to avoid error
        "FinalClassification": ["Cat"],
        # integer has no split -> triggers except
        "SimilarCommentId": [123]
    })
    prepare_csv(tmp_path, "proj_sim_parse", df)

    resp = client.get("/projects/proj_sim_parse/comments/1")
    assert resp.status_code == 200
    body = resp.json()
    # Normal comment text
    assert body.get("comment") == "test comment"
    # Should include similar_comments key as empty list
    assert "similar_comments" in body
    assert isinstance(body["similar_comments"], list)
    assert body["similar_comments"] == []


def test_similar_comments_build_exception(tmp_path, monkeypatch):
    """
    lines 900-901: If building similar comment entry throws (e.g., __str__ error), should catch and skip
    """
    # Create a normal DataFrame without the problematic BadStr class
    df = pd.DataFrame({
        "id": [1, 2],
        "comment": ["good", "bad"],
        "ClassifiedCategory": ["X", "X"],
        "ClassifiedConfidence": [10, 20],
        "FinalClassification": ["X", "X"]
    })
    prepare_csv(tmp_path, "proj_sim_build", df)
    
    # Mock the getattr function to throw when trying to get the comment
    # This simulates the __str__ error without requiring BadStr class
    original_getattr = getattr
    
    def mock_getattr(obj, name, *args, **kwargs):
        if name == "comment" and hasattr(obj, "Index") and obj.Index == 1:
            raise Exception("bad str")
        return original_getattr(obj, name, *args, **kwargs)
        
    monkeypatch.setattr("builtins.getattr", mock_getattr)

    resp = client.get("/projects/proj_sim_build/comments/1")
    assert resp.status_code == 200
    body = resp.json()
    # Primary comment unaffected
    assert body.get("comment") == "good"
    # similar_comments from fallback encountered error, so empty
    assert "similar_comments" in body
    assert isinstance(body["similar_comments"], list)
    assert body["similar_comments"] == []


def test_update_comment_index_exception(tmp_path, monkeypatch):
    """
    lines 949-950: For update endpoint, if __len__(df) throws, should catch and return api_error for missing comment
    """
    # DataFrame missing id columns
    df = pd.DataFrame({"foo": [1]})
    prepare_csv(tmp_path, "proj_update_exc", df)
    # Monkeypatch len to throw
    monkeypatch.setattr(pd.DataFrame, "__len__", lambda self: (_ for _ in ()).throw(Exception("boom")))

    resp = client.put(
        "/projects/proj_update_exc/comments/1",
        json={"category": "Z"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("success") is False
    assert "Comment with ID 1 not found" in body.get("message", "")