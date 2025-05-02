import pytest
from unittest.mock import patch, MagicMock, AsyncMock
import tempfile
import os
import pandas as pd
import shutil

@pytest.mark.asyncio
async def test_process_comments_with_empty_comment():
    """Test batch processing with an empty comment to hit line 325"""
    import rag
    
    # Create temporary directory and files
    temp_dir = tempfile.mkdtemp()
    project_dir = os.path.join(temp_dir, "test_project")
    os.makedirs(project_dir, exist_ok=True)
    
    export_path = os.path.join(project_dir, "data_export.csv")
    status_path = os.path.join(project_dir, "status.json")
    
    # Create test CSV with an empty comment
    df = pd.DataFrame({
        "comment": [""],  # Empty comment to trigger line 325
        "ClassifiedCategory": [""]
    })
    df.to_csv(export_path, index=False)
    
    try:
        # Setup mocks for dependencies
        with patch('rag.has_rag_dependencies', True), \
             patch('rag.vector_store', MagicMock()), \
             patch('rag.comment_category_chain', MagicMock()), \
             patch('error_utils.update_status_file'):
            
            # Process the batch
            await rag.process_comments_with_rag(export_path, batch_size=1)
            
            # Read the resulting CSV to verify the empty comment was processed
            result_df = pd.read_csv(export_path)
            
            # The empty comment should be classified as "OK" with 100 confidence
            assert result_df["ClassifiedCategory"].iloc[0] == "OK"
            assert float(result_df["ClassifiedConfidence"].iloc[0]) == 100
            
    finally:
        # Clean up
        shutil.rmtree(temp_dir)