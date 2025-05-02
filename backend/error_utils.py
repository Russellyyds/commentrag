import logging
import json
from typing import Dict, Any, Optional
import pandas as pd
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("app.log", mode='a', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def api_error(message: str, status_code: int = 500, details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Create standard format API error response
    """
    response = {
        "success": False,
        "message": message
    }
    
    if details:
        response.update(details)
    
    # Log error
    logger.error(f"API error ({status_code}): {message}")
    
    return response

def rag_error(message: str) -> Dict[str, Any]:
    """
    Create standard format RAG error response
    """
    logger.error(f"RAG error: {message}")
    
    return {
        "category": "Error",
        "confidence": 0,
        "reasoning": message
    }

def update_dataframe_error(df, error_message: str, column: str = "ProcessingError"):
    """
    Update error message to dataframe
    """
    try:
        df[column] = error_message
        logger.info(f"Updated dataframe error message to '{column}' column")
    except Exception as e:
        logger.error(f"Failed to update dataframe error message: {e}")

def update_status_file(status_path, status, progress=100, has_errors=False, error_message=""):
    """
    Helper function to update the status file
    
    Args:
        status_path: Path to the status.json file
        status: Status string (e.g., "in_progress", "completed", "error")
        progress: Progress percentage (0-100)
        has_errors: Boolean flag for errors
        error_message: Error description if has_errors is True
    """
    try:
        # Get current status if exists
        current_status = {}
        if os.path.exists(status_path):
            with open(status_path, 'r') as f:
                current_status = json.load(f)
        
        # Update fields
        current_status["status"] = status
        current_status["progress"] = progress
        current_status["has_errors"] = has_errors
        if error_message:
            current_status["error_message"] = error_message
        current_status["update_time"] = pd.Timestamp.now().isoformat()
        
        # Write back
        with open(status_path, 'w') as f:
            json.dump(current_status, f)
            
        logger.info(f"Updated status file: status={status}, progress={progress}%")
        
    except Exception as e:
        logger.error(f"Error updating status file: {e}")