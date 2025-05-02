import pytest
import pandas as pd
from unittest.mock import patch
import uploader

def test_process_file_dataframe():
    """Test the process_file_dataframe function with a simple dataframe"""
    # Create test dataframe
    test_df = pd.DataFrame({
        "comment": ["Test comment", "Another\ncomment with\nlines", "Comment with_underscore"]
    })
    
    # Process the dataframe
    result_df = uploader.process_file_dataframe(test_df)
    
    # Assertions
    assert len(result_df) == len(test_df)
    assert "comment" in result_df.columns
    
def test_preprocess_comments():
    """Test comment preprocessing functionality"""
    # Create test dataframe with different formatting issues
    test_df = pd.DataFrame({
        "comment": [
            "Test with，Chinese，punctuation",  # Chinese commas
            "Line with\r\nWindows line endings",
            "Text with_underscore_pattern",
            "Text with\u3000full-width spaces",  # Unicode full-width space
            "Text with\x000Dcontrol\x000Acharacters"
        ]
    })
    
    # Process the dataframe
    result_df = uploader.preprocess_comments(test_df)
    
    # Assertions
    assert len(result_df) == len(test_df)
    assert "comment" in result_df.columns
    
    # Check Chinese punctuation was normalized
    assert "," in result_df["comment"][0]
    
    # Check line endings are normalized
    assert "\n" in result_df["comment"][1] and "\r\n" not in result_df["comment"][1]
    
    # Check underscore pattern was handled
    assert "_" not in result_df["comment"][2]
    
def test_preprocess_comments_polars_fallback():
    """Test the pandas fallback when Polars processing fails"""
    # Mock Polars to raise an exception
    with patch('uploader.pl.from_pandas', side_effect=Exception("Test exception")):
        test_df = pd.DataFrame({
            "comment": ["Test comment", "Another comment"]
        })
        
        # This should use the pandas fallback
        result_df = uploader.preprocess_comments(test_df)
        
        # Should still process the dataframe
        assert len(result_df) == len(test_df)
        assert "comment" in result_df.columns

def test_preprocess_comments_different_column_names():
    """Test preprocessing with different column names"""
    # Test with 'Content' column
    df_content = pd.DataFrame({
        "Content": ["Test with multiple  spaces", "Test with\ttabs"]
    })
    
    result = uploader.preprocess_comments(df_content)
    assert "Content" in result.columns
    assert " " in result["Content"][0]
    
    # Test with 'text' column
    df_text = pd.DataFrame({
        "text": ["Test with_underscores", "Test with\r\nlines"]
    })
    
    result = uploader.preprocess_comments(df_text)
    assert "text" in result.columns
    assert "_" not in result["text"][0]

def test_preprocess_comments_problematic_data():
    """Test preprocessing with problematic text data"""
    df = pd.DataFrame({
        "comment": [
            None,
            "",
            "Test with \u200B\u200Bzero-width spaces",
            "Test with \uFFFD replacement character"
        ]
    })
    
    result = uploader.preprocess_comments(df)
    assert pd.isna(result["comment"][0])
    assert result["comment"][1] == ""
    assert '\u200B' not in result["comment"][2]
    assert result["comment"][3]

def test_no_comment_column():
    """Test behavior when no standard comment column is found"""
    df = pd.DataFrame({
        "custom_column": ["Test comment", "Another test"]
    })
    
    result = uploader.preprocess_comments(df)
    assert "custom_column" in result.columns
    
    empty_df = pd.DataFrame({})
    result_empty = uploader.preprocess_comments(empty_df)
    assert len(result_empty.columns) == 0