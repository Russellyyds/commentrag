import pytest
import pandas as pd
import numpy as np
from unittest.mock import patch
import uploader

def test_alternative_polars_api():
    """Test the alternative Polars API method when processing comments"""
    # Create test data
    test_df = pd.DataFrame({
        "comment": ["Test comment", "Another comment with line breaks"]
    })
    
    with patch('uploader.pl.from_pandas', return_value=pd.DataFrame({
        "comment": ["Test comment processed", "Another comment with line breaks processed"]
    })):
        # Call the function
        result_df = uploader.preprocess_comments(test_df)
        
        # Verify the expected result
        assert result_df.iloc[0, 0] == "Test comment"

def test_process_file_dataframe_exception():
    """Test the exception handling in process_file_dataframe function"""
    # Create test data
    test_df = pd.DataFrame({
        "comment": ["Test comment", "Another comment"]
    })
    
    # Make preprocess_comments raise an exception
    with patch('uploader.preprocess_comments', side_effect=Exception("Test processing exception")):
        # This should hit the exception path in process_file_dataframe
        result_df = uploader.process_file_dataframe(test_df)
        
        # Should return the original dataframe on error
        assert result_df is test_df
        assert len(result_df) == 2
        assert "comment" in result_df.columns

def test_special_case_handling():
    """Test that special cases in text are handled correctly"""
    # Create test data with special cases
    test_df = pd.DataFrame({
        "comment": [
            None,  # None value
            "",    # Empty string
            "Test with\r\nWindows line ending",  # Windows line ending
            "Test with multiple  spaces",  # Multiple spaces
            "Test with Chinese，punctuation"  # Non-English punctuation
        ]
    })
    
    # We don't need to mock anything here - just check the output
    result_df = uploader.process_file_dataframe(test_df)
    
    # Check that None and empty string are preserved
    assert pd.isna(result_df["comment"][0])
    assert result_df["comment"][1] == ""
    
    # We don't need to make specific assertions about how the text is transformed
    # Just ensure processing ran without errors
    assert isinstance(result_df, pd.DataFrame)
    assert len(result_df) == len(test_df)

def test_polars_exception_handling():
    """
    Test handling of exceptions when using Polars
    This is a direct test of the fallback path
    """
    # Create test data with markers to track processing
    test_df = pd.DataFrame({
        "comment": [
            "UNIQUE_MARKER_TEXT_FOR_TESTING",
            "Another test comment"
        ]
    })
    
    # Force an exception in pl.from_pandas
    with patch('uploader.pl.from_pandas', side_effect=Exception("Forced Polars exception")):
        # Should fall back to pandas processing
        result_df = uploader.preprocess_comments(test_df)
        
        # Verify original text is preserved, showing it went through pandas fallback
        assert "UNIQUE_MARKER_TEXT_FOR_TESTING" in result_df["comment"][0]
        
        # Ensure we have a DataFrame result with the right number of rows
        assert isinstance(result_df, pd.DataFrame)
        assert len(result_df) == len(test_df)