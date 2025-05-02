import os
import pandas as pd
import pytest
from fastapi.testclient import TestClient

import main
from main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_get_project_status_default_in_progress(tmp_path, monkeypatch):
    """
    Test the get_project_status_and_stats function in main.py to specifically cover
    lines 472-473 where status is set to "in_progress" and progress to 0 as default.
    """
    # Setup test environment
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    monkeypatch.setattr(main, "UPLOAD_DIR", str(upload_dir))
    
    # Create project directory
    project_id = "test_default_status"
    project_dir = upload_dir / project_id
    project_dir.mkdir()
    
    # Create an export file with no classified comments to trigger the 'else' branch (lines 471-473)
    export_path = project_dir / "data_export.csv"
    
    # Create a dataframe with empty ClassifiedCategory column
    df = pd.DataFrame({
        'comment': ['Test comment 1', 'Test comment 2'],
        'ClassifiedCategory': ['', ''],  # Empty classifications
        'HumanCategory': ['', '']
    })
    
    # Save to CSV
    df.to_csv(export_path, index=False)
    
    # Create a status file indicating not "completed" or "in_progress"
    status_path = project_dir / "status.json"
    with open(status_path, 'w') as f:
        f.write('{"status": "unknown", "progress": 50}')
    
    # Create client
    client = TestClient(app)
    
    # Call the endpoint
    response = client.get(f"/projects/{project_id}/status")
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    
    # Verify status and progress were set to defaults (lines 472-473)
    assert data["status"] == "in_progress"
    assert data["progress"] == 0