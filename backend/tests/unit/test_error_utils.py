import pytest
import error_utils as err
import pandas as pd
import tempfile
import os
import shutil
import json

def test_api_error():
    """Test API error generation"""
    # Simple case
    error = err.api_error("Test error")
    assert error["success"] is False
    assert error["message"] == "Test error"
    
    # With status code and details
    error = err.api_error("Test error", status_code=404, details={"code": "NOT_FOUND"})
    assert error["success"] is False
    assert error["message"] == "Test error"
    assert error["code"] == "NOT_FOUND"

def test_api_error_different_formats():
    """Test different API error formats"""
    error1 = err.api_error("Error message", status_code=404)
    assert error1["success"] is False
    assert error1["message"] == "Error message"
    
    details = {
        "code": "RESOURCE_NOT_FOUND",
        "field": "project_id",
        "suggestion": "Try with a valid project ID"
    }
    
    error2 = err.api_error("Resource not found", status_code=404, details=details)
    assert error2["success"] is False
    assert error2["message"] == "Resource not found"
    assert error2["code"] == "RESOURCE_NOT_FOUND"
    assert error2["field"] == "project_id"
    assert error2["suggestion"] == "Try with a valid project ID"

def test_rag_error():
    """Test RAG error generation"""
    error = err.rag_error("Test RAG error")
    assert error["category"] == "Error"
    assert error["confidence"] == 0
    assert error["reasoning"] == "Test RAG error"

def test_update_dataframe_error():
    """Test dataframe error updating"""
    # Create test dataframe
    df = pd.DataFrame({
        "id": [1, 2, 3],
        "comment": ["Test 1", "Test 2", "Test 3"]
    })
    
    # Update with error
    err.update_dataframe_error(df, "Test error")
    
    # Assertions
    assert "ProcessingError" in df.columns
    assert (df["ProcessingError"] == "Test error").all()
    
    # Test with custom column
    err.update_dataframe_error(df, "Custom error", column="CustomError")
    assert "CustomError" in df.columns
    assert (df["CustomError"] == "Custom error").all()

def test_update_status_file():
    """Test status file updating"""
    # Create a temporary directory
    temp_dir = tempfile.mkdtemp()
    status_path = os.path.join(temp_dir, "status.json")
    
    # Update status file
    err.update_status_file(status_path, "in_progress", progress=50, has_errors=False)
    
    # Check file was created
    assert os.path.exists(status_path)
    
    # Read and verify content
    with open(status_path, 'r') as f:
        status_data = json.load(f)
    
    assert status_data["status"] == "in_progress"
    assert status_data["progress"] == 50
    assert status_data["has_errors"] is False
    
    # Update with error
    err.update_status_file(status_path, "error", progress=80, has_errors=True, error_message="Test error")
    
    # Read and verify updated content
    with open(status_path, 'r') as f:
        status_data = json.load(f)
    
    assert status_data["status"] == "error"
    assert status_data["progress"] == 80
    assert status_data["has_errors"] is True
    assert status_data["error_message"] == "Test error"
    
    # Clean up
    import shutil
    shutil.rmtree(temp_dir)

def test_update_status_file_errors():
    """Test error handling in update_status_file"""
    # Test with invalid path
    invalid_path = "/nonexistent/directory/status.json"
    
    # Should log error but not raise exception
    err.update_status_file(invalid_path, "test")
    
    # Test with read-only directory if possible
    if os.name != 'nt':
        try:
            temp_dir = tempfile.mkdtemp()
            status_path = os.path.join(temp_dir, "status.json")
            
            # Make directory read-only
            os.chmod(temp_dir, 0o555)
            
            # Should handle permission error
            err.update_status_file(status_path, "test")
        finally:
            os.chmod(temp_dir, 0o755)
            shutil.rmtree(temp_dir)

def test_update_status_file_overwrites():
    """Test that update_status_file overwrites specific fields"""
    temp_dir = tempfile.mkdtemp()
    
    try:
        status_path = os.path.join(temp_dir, "status.json")
        
        # Create initial status
        initial_status = {
            "status": "in_progress",
            "progress": 50,
            "has_errors": False,
            "update_time": "2023-04-15T12:00:00",
            "custom_field": "should be preserved"
        }
        
        with open(status_path, 'w') as f:
            json.dump(initial_status, f)
        
        # Update only status and progress
        err.update_status_file(status_path, "completed", progress=100)
        
        with open(status_path, 'r') as f:
            updated = json.load(f)
        
        assert updated["status"] == "completed"
        assert updated["progress"] == 100
        assert updated["has_errors"] is False
        assert updated["custom_field"] == "should be preserved"
        assert "update_time" in updated
        assert updated["update_time"] != "2023-04-15T12:00:00"
        
    finally:
        shutil.rmtree(temp_dir)

def test_update_dataframe_error_exception():
    """Test exception handling in update_dataframe_error"""
    # Create a test dataframe that will cause an error when modified
    df = pd.DataFrame()  # Empty dataframe
    
    # Mock the df.__setitem__ method to raise an exception
    original_setitem = pd.DataFrame.__setitem__
    
    try:
        # Replace __setitem__ with a function that raises an exception
        def mock_setitem(self, key, value):
            raise Exception("Test exception")
        
        pd.DataFrame.__setitem__ = mock_setitem
        
        # This should trigger the exception but not crash
        err.update_dataframe_error(df, "Test error")
        
        # If we reach here, the function handled the exception as expected
        assert True
    finally:
        # Restore the original method
        pd.DataFrame.__setitem__ = original_setitem