import os
import uuid
import json
import pandas as pd
from typing import List, Optional
import aiofiles
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import rag
import error_utils as err
import agent
import warnings
from pydantic import BaseModel

warnings.filterwarnings("ignore")


# Load environment variables
load_dotenv()

# Upload directory
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Initialize connections
@asynccontextmanager
async def lifespan(app: FastAPI):
    await rag.initialize_rag()
    await agent.initialize_agent()
    yield
    pass

# Initialize app
app = FastAPI(
    title="Comment Analysis API",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class CommentBody(BaseModel):
    comment: str

class UpdateCategoryRequest(BaseModel):
    category: str

class ProcessRequest(BaseModel):
    fileIds: List[str]
    project_id: Optional[str] = None

class ResetProjectRequest(BaseModel):
    confirm: bool = False

@app.get("/cache/stats")
async def get_cache_stats():
    """Get embedding cache statistics"""
    if not hasattr(rag, "get_cache_stats"):
        return {
            "success": False,
            "message": "Cache functionality not available",
            "has_cache": False
        }
    
    return await rag.get_cache_stats()

@app.post("/cache/clear")
async def clear_cache():
    """Clear expired entries from the embedding cache"""
    if not hasattr(rag, "clear_cache"):
        return {
            "success": False,
            "message": "Cache functionality not available"
        }
    
    return await rag.clear_cache()

def update_final_classification(df):
    """
    Update FinalClassification column values following rules:
    - If HumanCategory has a value, use HumanCategory
    - Otherwise, use ClassifiedCategory
    """
    # Ensure required columns exist and have correct data type
    if "FinalClassification" not in df.columns:
        df["FinalClassification"] = ""
    else:
        # Explicitly convert to string/object type to avoid dtype warnings
        df["FinalClassification"] = df["FinalClassification"].astype('object')
    
    # Make sure other columns are also string type
    if "HumanCategory" in df.columns:
        df["HumanCategory"] = df["HumanCategory"].astype('object')
    if "ClassifiedCategory" in df.columns:
        df["ClassifiedCategory"] = df["ClassifiedCategory"].astype('object')
    
    # Apply logic rules
    mask_human = df["HumanCategory"].notna() & (df["HumanCategory"] != "")
    
    # When HumanCategory has value, use it
    df.loc[mask_human, "FinalClassification"] = df.loc[mask_human, "HumanCategory"]
    
    # When HumanCategory is empty but ClassifiedCategory has value, use ClassifiedCategory
    mask_classified = (~mask_human) & df["ClassifiedCategory"].notna() & (df["ClassifiedCategory"] != "")
    df.loc[mask_classified, "FinalClassification"] = df.loc[mask_classified, "ClassifiedCategory"]
    
    return df

# Endpoints
@app.post("/comments/upload")
async def upload_files(
    files: List[UploadFile] = File(...),
    project_id: Optional[str] = Form(None)  # Added optional project_id form field
):
    """Handle file uploads for comment data, supporting existing project ID"""
    try:
        # Use provided project_id if available, otherwise generate a new one
        if project_id:
            # Validate the provided project_id
            project_dir = os.path.join(UPLOAD_DIR, project_id)
            if not os.path.exists(project_dir):
                err.logger.warning(f"Invalid project_id provided: {project_id}, creating new directory")
                os.makedirs(project_dir, exist_ok=True)
        else:
            # Generate a new project_id
            project_id = str(uuid.uuid4())
            # Create directory for this project
            project_dir = os.path.join(UPLOAD_DIR, project_id)
            os.makedirs(project_dir, exist_ok=True)
        
        uploaded_files = []
        file_ids = []
        
        for file in files:
            file_id = str(uuid.uuid4())
            file_ids.append(file_id)
            
            # Save the file
            file_path = os.path.join(project_dir, file.filename)
            async with aiofiles.open(file_path, "wb") as out_file:
                content = await file.read()
                await out_file.write(content)
            
            uploaded_files.append({
                "id": file_id,
                "filename": file.filename,
                "path": file_path
            })
        
        # Process uploaded files to create or update data_export.csv
        total_comments = 0
        try:
            all_data = []
            
            # Check if data_export.csv already exists
            export_path = os.path.join(project_dir, "data_export.csv")
            raw_export_path = os.path.join(project_dir, "data_export_raw.csv")
            processed_path = os.path.join(project_dir, "data_export_processed.csv")
            existing_df = None
            if os.path.exists(export_path):
                try:
                    existing_df = pd.read_csv(export_path)
                    err.logger.info(f"Read existing data_export.csv with {len(existing_df)} records")
                except Exception as e:
                    err.logger.error(f"Error reading existing data_export.csv: {e}")
            
            # Read all newly uploaded files
            for file_info in uploaded_files:
                file_path = file_info["path"]
                
                # Handle different file types
                if file_path.endswith('.csv'):
                    df = pd.read_csv(file_path)
                elif file_path.endswith('.tsv'):
                    df = pd.read_csv(file_path, sep='\t')
                elif file_path.endswith('.xls') or file_path.endswith('.xlsx'):
                    df = pd.read_excel(file_path)
                elif file_path.endswith('.json'):
                    df = pd.read_json(file_path)
                else:
                    # Skip unsupported file types
                    continue
                    
                all_data.append(df)
            
            # Combine all dataframes
            if all_data:
                # Combine new data
                new_combined_df = pd.concat(all_data, ignore_index=True)
                
                # Add required empty columns
                new_combined_df["ClassifiedCategory"] = ""
                new_combined_df["ClassifiedConfidence"] = ""
                new_combined_df["HumanCategory"] = ""
                new_combined_df["FinalClassification"] = ""
                new_combined_df["SimilarCommentId"] = ""
                new_combined_df["Reason"] = ""
                new_combined_df["ProcessingError"] = ""
                
                # If existing data exists, merge it with new data
                if existing_df is not None:
                    # Merge existing data and new data
                    combined_df = pd.concat([existing_df, new_combined_df], ignore_index=True)
                    err.logger.info(f"Merged existing data ({len(existing_df)} records) with new data ({len(new_combined_df)} records)")
                else:
                    # Just use new data
                    combined_df = new_combined_df
                
                # Save raw data before preprocessing
                combined_df.to_csv(raw_export_path, index=False)
                err.logger.info(f"Saved raw data to {raw_export_path}")
                
                # Import and use the uploader module for text preprocessing
                try:
                    import uploader
                    err.logger.info("Preprocessing comments with uploader module")
                    processed_df = uploader.process_file_dataframe(combined_df)
                    err.logger.info(f"Text preprocessing completed on {len(processed_df)} records")
                except Exception as preprocess_error:
                    err.logger.error(f"Error during text preprocessing: {preprocess_error}")
                    processed_df = combined_df  # Use original data if preprocessing fails
                
                # Save to data_export.csv
                processed_df.to_csv(processed_path, index=False)
                processed_df.to_csv(export_path, index=False)
                
                total_comments = len(processed_df)
                err.logger.info(f"Saved {total_comments} comments to {export_path}")
        except Exception as e:
            # Log error but continue (don't fail the upload)
            err.logger.error(f"Error processing files: {e}")
        
        return {
            "success": True,
            "message": f"{len(uploaded_files)} files uploaded successfully. {total_comments} comments found.",
            "project_id": project_id,
            "fileIds": file_ids,
            "files": uploaded_files,
            "total_comments": total_comments  # Add the comment count to the response
        }
    except Exception as e:
        return err.api_error(f"Error uploading files: {str(e)}")

@app.post("/comments/process")
async def process_comments(request: ProcessRequest, background_tasks: BackgroundTasks):
    """Process comments and update the data_export.csv file - Simplified"""
    file_ids = request.fileIds
    
    if not file_ids:
        raise HTTPException(status_code=400, detail="No file IDs provided")
    
    # Get project_id from request or environment
    project_id = request.project_id
    
    # If still no project_id, generate a new one (should not happen in normal flow)
    if not project_id:
        err.logger.warning(f"Generated new project_id {project_id} in process_comments")
        return err.api_error("No project ID provided", status_code=400)
    
    # Path to data_export.csv
    project_dir = os.path.join(UPLOAD_DIR, project_id)
    export_path = os.path.join(project_dir, "data_export.csv")
    
    # Create a status file to indicate processing has started
    status_path = os.path.join(project_dir, "status.json")
    try:
        status_data = {
            "status": "in_progress",
            "progress": 0,
            "has_errors": False,
            "error_message": "",
            "start_time": pd.Timestamp.now().isoformat()
        }
        with open(status_path, 'w') as f:
            json.dump(status_data, f)
    except Exception as e:
        err.logger.error(f"Error creating status file: {e}")
    
    # Start a background task to process the file
    background_tasks.add_task(process_comments_task, export_path, project_dir)
    
    # Return immediately with the project ID
    return {
        "success": True,
        "message": "Processing started",
        "project_id": project_id
    }

async def process_comments_task(export_path, project_dir):
    """Background task to process comments - Now using shared status update function"""
    status_path = os.path.join(project_dir, "status.json")
    auto_path = os.path.join(project_dir, "data_export_auto.csv")
    
    try:
        if not os.path.exists(export_path):
            err.logger.error(f"Data export file not found: {export_path}")
            # Update status to error
            err.update_status_file(status_path, "error", error_message="Data export file not found")
            return
        
        # Check if RAG is available
        if not rag.has_rag_dependencies or not rag.vector_store or not rag.comment_category_chain:
            error_message = "RAG functionality is not available. Required dependencies are missing or not properly initialized."
            err.logger.error(f"Error: {error_message}")
            
            # Update status to error
            err.update_status_file(status_path, "error", error_message=error_message)
            
            # Update the export file to indicate the error
            try:
                df = pd.read_csv(export_path)
                err.update_dataframe_error(df, error_message)
                df.to_csv(export_path, index=False)
            except Exception as file_error:
                err.logger.error(f"Error updating export file: {file_error}")
                
            return
        
        # Initialize status as "in_progress" with 0% progress
        err.update_status_file(status_path, "in_progress", progress=0)
        
        # If RAG is available, use it for processing with a batch size of 50
        df = pd.read_csv(export_path)
        batch_size = max(10, min(100, len(df) // 10))  # Dynamic batch size based on number of comments
        await rag.process_comments_with_rag(export_path, batch_size)
        
        # Process completed - update FinalClassification
        try:
            df = pd.read_csv(export_path)
            df = update_final_classification(df)
            df.to_csv(auto_path, index=False)
            df.to_csv(export_path, index=False)
            err.logger.info("FinalClassification updated successfully")
            
            # Update status to completed (100%)
            err.update_status_file(status_path, "completed", progress=100)
            
        except Exception as e:
            err.logger.error(f"Error updating FinalClassification: {e}")
            err.update_status_file(status_path, "error", error_message=f"Error updating final classification: {str(e)}")
        
    except Exception as e:
        err.logger.error(f"Error processing comments: {e}")
        err.update_status_file(status_path, "error", error_message=f"Error processing comments: {str(e)}")

def update_status_file(status_path, status, progress=100, has_errors=False, error_message=""):
    """Helper function to update the status file"""
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
            
    except Exception as e:
        err.logger.error(f"Error updating status file: {e}")

@app.get("/projects/{project_id}/progress")
async def get_project_progress(project_id: str):
    """Get simplified project processing progress endpoint, specifically for frontend polling"""
    try:
        # Get project directory and status file path
        project_dir = os.path.join(UPLOAD_DIR, project_id)
        status_path = os.path.join(project_dir, "status.json")
        
        # Check if status file exists
        if not os.path.exists(status_path):
            return {
                "success": False,
                "message": "Status file not found",
                "status": "unknown",
                "progress": 0,
                "has_errors": False,
                "error_message": ""
            }
        
        # Read status file
        try:
            with open(status_path, 'r') as f:
                status_data = json.load(f)
        except Exception as e:
            err.logger.error(f"Error reading status file: {e}")
            return {
                "success": False,
                "message": f"Error reading status file: {str(e)}",
                "status": "error",
                "progress": 0,
                "has_errors": True,
                "error_message": str(e)
            }
        
        # Return status data
        return {
            "success": True,
            "project_id": project_id,
            "status": status_data.get("status", "unknown"),
            "progress": status_data.get("progress", 0),
            "has_errors": status_data.get("has_errors", False),
            "error_message": status_data.get("error_message", ""),
            "update_time": status_data.get("update_time", "")
        }
    except Exception as e:
        err.logger.error(f"Error getting project progress: {e}")
        return {
            "success": False,
            "message": f"Error getting project progress: {str(e)}",
            "status": "error",
            "progress": 0,
            "has_errors": True,
            "error_message": str(e)
        }

@app.get("/projects/{project_id}/status")
async def get_project_status_and_stats(project_id: str):
    """Get project processing status and statistics - Simplified version, directly reading status file"""
    try:
        # Get project directory and export file paths
        project_dir = os.path.join(UPLOAD_DIR, project_id)
        export_path = os.path.join(project_dir, "data_export.csv")
        status_path = os.path.join(project_dir, "status.json")
        
        # Priority read status file
        status_data = {
            "status": "unknown",
            "progress": 0,
            "has_errors": False,
            "error_message": ""
        }
        
        if os.path.exists(status_path):
            try:
                with open(status_path, 'r') as f:
                    status_data = json.load(f)
            except Exception as e:
                err.logger.error(f"Error reading status file: {e}")
        
        # If status file indicates processing, return immediately
        if status_data.get("status") == "in_progress":
            return {
                "success": True,
                "project_id": project_id,
                "status": "in_progress",
                "progress": status_data.get("progress", 0),
                "has_errors": status_data.get("has_errors", False),
                "error_message": status_data.get("error_message", ""),
                "total_comments": 0,  # Processing, don't show comment count
                "is_processing": True
            }
            
        if not os.path.exists(export_path):
            return err.api_error(
                "Data export file not found. Process may not have started.",
                details={
                    "project_id": project_id,
                    "status": "error",
                    "progress": 0,
                    "has_errors": True,
                    "error_message": "Data export file not found"
                }
            )
        
        # Read CSV and calculate statistics
        df = pd.read_csv(export_path)
        total_comments = len(df)
        
        # Calculate classified comment count
        classified_count = int(df[df["ClassifiedCategory"].notna() & (df["ClassifiedCategory"] != "")].shape[0])
        
        # Determine processing status - if status file indicates completed, use that
        if status_data.get("status") == "completed":
            status = "completed"
            progress = 100
        elif classified_count > 0:
            status = "completed"
            progress = 100
        else:
            status = "in_progress"
            progress = 0
        
        # Get manual review progress
        reviewed_count = df[df["HumanCategory"].notna() & (df["HumanCategory"] != "")].shape[0]
        review_progress = 0
        if total_comments > 0:
            review_progress = (reviewed_count / total_comments) * 100
        
        # Get error information
        has_errors = status_data.get("has_errors", False)
        error_message = status_data.get("error_message", "")
        if "ProcessingError" in df.columns:
            if not has_errors:
                has_errors = bool(df["ProcessingError"].notna().any())
            if not error_message and has_errors:
                first_error = df.loc[df["ProcessingError"].notna() & (df["ProcessingError"] != ""), "ProcessingError"].iloc[0]
                error_message = first_error if isinstance(first_error, str) else "Unknown processing error"
        
        # Get category statistics
        categories = {}
        if "FinalClassification" in df.columns:
            category_counts = df["FinalClassification"].fillna("Unclassified").replace("", "Unclassified").value_counts().to_dict()
            categories = category_counts
        elif "ClassifiedCategory" in df.columns:
            category_counts = df["ClassifiedCategory"].fillna("Unclassified").replace("", "Unclassified").value_counts().to_dict()
            categories = category_counts
        
        # Get project file information
        files = []
        if os.path.exists(project_dir):
            for file_name in os.listdir(project_dir):
                if file_name != "data_export.csv" and file_name != "status.json":
                    file_path = os.path.join(project_dir, file_name)
                    if os.path.isfile(file_path):
                        files.append({
                            "name": file_name,
                            "size": os.path.getsize(file_path),
                            "last_modified": os.path.getmtime(file_path)
                        })
        
        # Return comprehensive status and statistics
        return {
            "success": True,
            "project_id": project_id,
            "status": status,
            "progress": progress,
            "total_comments": total_comments,
            "processed_count": classified_count,
            "reviewed_count": reviewed_count,
            "review_progress": review_progress,
            "has_errors": has_errors,
            "error_message": error_message,
            "categories": categories,
            "file_info": {
                "size": os.path.getsize(export_path),
                "last_modified": os.path.getmtime(export_path),
            },
            "uploaded_files": files,
            "uploaded_files_count": len(files)
        }
    except Exception as e:
        return err.api_error(
            f"Error getting project status and stats: {str(e)}",
            details={"project_id": project_id, "status": "error"}
        )

@app.post("/projects/{project_id}/reset")
async def reset_project(project_id: str, request: ResetProjectRequest):
    """Reset a project and delete associated batch files when confirmed"""
    if not request.confirm:
        return err.api_error("Confirmation required", status_code=400)
    
    try:
        # Since batch_id is the same as project_id, we can directly check for the directory
        batch_dir = os.path.join(UPLOAD_DIR, project_id)
        
        if os.path.exists(batch_dir) and os.path.isdir(batch_dir):
            # Delete all files in the directory
            for filename in os.listdir(batch_dir):
                file_path = os.path.join(batch_dir, filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)
            
            # Remove the directory itself - make sure this gets executed
            try:
                os.rmdir(batch_dir)
                err.logger.info(f"Removed project directory: {batch_dir}")
            except Exception as rmdir_error:
                err.logger.error(f"Failed to remove directory {batch_dir}: {rmdir_error}")
                # Continue with the response even if directory removal fails
                
            return {
                "success": True,
                "message": f"Project {project_id} has been reset and all associated files deleted"
            }
        else:
            return {
                "success": True,
                "message": f"Project {project_id} has been reset, but no associated files were found"
            }
            
    except Exception as e:
        return err.api_error(f"Error resetting project: {str(e)}")

@app.post("/rag")
async def rag_query(request: CommentBody):
    """Process a comment with RAG to find similar comments and use LLM to determine category and confidence"""
    query = request.comment
    
    # Check if comment is empty
    if not query or query.strip() == "":
        return {
            "success": False,
            "message": "Error: Empty comment provided",
            "answer": [],
            "classification": err.rag_error("Empty comment provided")
        }
    
    # Check if RAG is enabled
    if not rag.has_rag_dependencies or not rag.vector_store or not rag.comment_category_chain:
        raise HTTPException(
            status_code=503,
            detail="RAG functionality is not available. Required dependencies are missing or not properly initialized."
        )
    
    try:
        # Process comment using our helper function
        similar_comments, classification = await rag.process_comment_with_rag(
            query,
            rag.vector_store,
            rag.comment_category_chain,
            rag.DEFAULT_CATEGORIES
        )
        
        # Check if classification resulted in an error
        if classification.get("category") == "Error" and classification.get("confidence") == 0:
            return {
                "success": False,
                "message": classification.get("reasoning", "Classification error"),
                "answer": similar_comments,  # Still return any similar comments found
                "classification": classification
            }
        
        # Normal successful response
        return {
            "success": True,
            "answer": similar_comments,
            "classification": classification
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error processing comment: {str(e)}",
            "answer": [],
            "classification": err.rag_error(f"Error processing comment: {str(e)}")
        }

@app.get("/projects/{project_id}/comments")
async def get_project_comments(
    project_id: str, 
    page: int = 1, 
    limit: int = 20, 
    filter: str = "All Tags"
):
    """Get paginated comments from a project's data_export.csv file with filtering"""
    try:
        # Check if project directory exists
        project_dir = os.path.join(UPLOAD_DIR, project_id)
        export_path = os.path.join(project_dir, "data_export.csv")
        
        if not os.path.exists(export_path):
            raise HTTPException(status_code=404, detail="Data export file not found")
        
        # Read the CSV file
        df = pd.read_csv(export_path)
        
        # Find the relevant columns
        text_columns = []
        for potential_col in ['comment', 'Comment', 'COMMENT', 'text', 'Text', 'content', 'Content', 'RawComment']:
            if potential_col in df.columns:
                text_columns.append(potential_col)
        
        if not text_columns:
            # If no standard column found, look for any text column with string content
            for col in df.columns:
                if df[col].dtype == 'object' and not df[col].isna().all():
                    text_columns.append(col)
        
        if not text_columns:
            return err.api_error("No suitable comment text column found", status_code=400)
        
        # Use the first found text column
        comment_column = text_columns[0]
        
        # Apply filtering
        if filter != "All Tags":
            if filter == "Needs Review":
                # Special case for low confidence comments
                if "ClassifiedConfidence" in df.columns:
                    df = df[df["ClassifiedConfidence"] < 80]
            else:
                # Filter by category
                category_columns = ["ClassifiedCategory", "HumanCategory", "FinalClassification"]
                filter_condition = False
                
                for col in category_columns:
                    if col in df.columns:
                        filter_condition = filter_condition | (df[col] == filter)
                
                if filter_condition is not False:  # Only filter if at least one column was found
                    df = df[filter_condition]
        
        # Calculate pagination
        total_items = len(df)
        total_pages = (total_items + limit - 1) // limit  # Ceiling division
        
        # Adjust page if out of bounds
        if page < 1:
            page = 1
        if page > total_pages and total_pages > 0:
            page = total_pages
        
        # Get paginated data
        start_idx = (page - 1) * limit
        end_idx = min(start_idx + limit, total_items)
        
        if start_idx >= total_items:
            paginated_df = pd.DataFrame()
        else:
            paginated_df = df.iloc[start_idx:end_idx].copy()
        
        # Format the response
        comments = []
        
        for _, row in paginated_df.iterrows():
            # Get comment text
            comment_text = row[comment_column]
            if pd.isna(comment_text):
                comment_text = ""
            
            # Get row ID or generate one
            comment_id = None
            id_columns = ["id", "ID", "comment_id", "CommentID", "Identification Number", "identification_number"]
            for id_col in id_columns:
                if id_col in row and not pd.isna(row[id_col]):
                    comment_id = int(row[id_col])
                    break
            
            if comment_id is None:
                # Use row index as ID if none found
                comment_id = int(row.name) + 1  # +1 to avoid zero index
            
            # Get the category with priority: Final > Human > Classified
            category = "Unknown"
            if "FinalClassification" in row and not pd.isna(row["FinalClassification"]) and row["FinalClassification"] != "":
                category = row["FinalClassification"]
            elif "HumanCategory" in row and not pd.isna(row["HumanCategory"]) and row["HumanCategory"] != "":
                category = row["HumanCategory"]
            elif "ClassifiedCategory" in row and not pd.isna(row["ClassifiedCategory"]) and row["ClassifiedCategory"] != "":
                category = row["ClassifiedCategory"]
            
            # Get confidence
            confidence = 0
            if "ClassifiedConfidence" in row and not pd.isna(row["ClassifiedConfidence"]):
                try:
                    confidence = float(row["ClassifiedConfidence"])
                except:
                    pass
            
            # Create comment object
            comment_obj = {
                "id": comment_id,
                "comment": str(comment_text),
                "category": category,
                "confidence": confidence
            }
            
            comments.append(comment_obj)
        
        return {
            "comments": comments,
            "pagination": {
                "total": total_items,
                "page": page,
                "limit": limit,
                "totalPages": total_pages
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        return err.api_error(f"Error retrieving comments: {str(e)}")

@app.get("/projects/{project_id}/comments/{comment_id}")
async def get_comment_by_id(project_id: str, comment_id: int, include_similar: bool = True, limit_similar: int = 3):
    """Get a specific comment by ID from the project data, optionally including similar comments"""
    try:
        # Check if project directory exists
        project_dir = os.path.join(UPLOAD_DIR, project_id)
        export_path = os.path.join(project_dir, "data_export.csv")
        
        if not os.path.exists(export_path):
            return err.api_error("Data export file not found", status_code=404)
        
        # Read the CSV file
        df = pd.read_csv(export_path)
        
        # Find the comment by ID
        comment_row = None
        
        # First check if there's an ID column
        id_columns = ["id", "ID", "comment_id", "CommentID", "Identification Number", "identification_number"]
        for id_col in id_columns:
            if id_col in df.columns:
                comment_row = df[df[id_col] == comment_id]
                if not comment_row.empty:
                    break
        
        # If not found by ID column, try the index (+1)
        if comment_row is None or comment_row.empty:
            try:
                # In pandas, index starts at 0, but we're using 1-based IDs
                if 0 <= comment_id - 1 < len(df):
                    comment_row = df.iloc[[comment_id - 1]]
                else:
                    return err.api_error(f"Comment with ID {comment_id} not found", status_code=404)
            except:
                return err.api_error(f"Comment with ID {comment_id} not found", status_code=404)
        
        # Get the first matching row
        row = comment_row.iloc[0]
        
        # Find the comment text column
        text_columns = []
        for potential_col in ['comment', 'Comment', 'COMMENT', 'text', 'Text', 'content', 'Content', 'RawComment']:
            if potential_col in df.columns:
                text_columns.append(potential_col)
        
        if not text_columns:
            # If no standard column found, look for any text column with string content
            for col in df.columns:
                if df[col].dtype == 'object' and not df[col].isna().all():
                    text_columns.append(col)
        
        if not text_columns:
            return err.api_error("No suitable comment text column found", status_code=400)
        
        # Use the first found text column
        comment_column = text_columns[0]
        comment_text = row[comment_column]
        
        # Get the category with priority: Final > Human > Classified
        category = "Unknown"
        if "FinalClassification" in row and not pd.isna(row["FinalClassification"]) and row["FinalClassification"] != "":
            category = row["FinalClassification"]
        elif "HumanCategory" in row and not pd.isna(row["HumanCategory"]) and row["HumanCategory"] != "":
            category = row["HumanCategory"]
        elif "ClassifiedCategory" in row and not pd.isna(row["ClassifiedCategory"]) and row["ClassifiedCategory"] != "":
            category = row["ClassifiedCategory"]
        
        # Get confidence
        confidence = 0
        if "ClassifiedConfidence" in row and not pd.isna(row["ClassifiedConfidence"]):
            try:
                confidence = float(row["ClassifiedConfidence"])
            except:
                pass
        
        # Get keywords
        keywords = None
        if "Keywords" in row and not pd.isna(row["Keywords"]) and row["Keywords"] != "":
            try:
                keywords = json.loads(row["Keywords"])
            except json.JSONDecodeError:
                err.logger.error(f"Error parsing keywords JSON for comment {comment_id}")
        
        # Create response object
        comment_obj = {
            "id": comment_id,
            "comment": str(comment_text),
            "category": category,
            "confidence": confidence,
            "human_category": row["HumanCategory"] if "HumanCategory" in row and not pd.isna(row["HumanCategory"]) else None,
            "classified_category": row["ClassifiedCategory"] if "ClassifiedCategory" in row and not pd.isna(row["ClassifiedCategory"]) else None,
            "reasoning": row["Reason"] if "Reason" in row and not pd.isna(row["Reason"]) else None,
            "processing_error": row["ProcessingError"] if "ProcessingError" in row and not pd.isna(row["ProcessingError"]) else None,
            "keywords": keywords
        }
        
        # Add similar comments if requested
        if include_similar:
            similar_comments = []
            
            # First try to use SimilarCommentId if available
            if "SimilarCommentId" in row and not pd.isna(row["SimilarCommentId"]) and row["SimilarCommentId"] != "":
                try:
                    similar_items = row["SimilarCommentId"].split(";")
                    for sc in similar_items:
                        try:
                            parsed_comment = json.loads(sc)
                            similar_comments.append(parsed_comment)
                        except json.JSONDecodeError as json_err:
                            err.logger.error(f"Error parsing similar comment JSON for comment {comment_id}: {json_err}")
                            continue
                except Exception as parse_error:
                    err.logger.error(f"Error processing similar comments: {parse_error}")
            
            # If no similar comments were found from IDs, fallback to category-based matching
            if len(similar_comments) == 0:
                # Find comments with same category
                same_category_rows = df[
                    (df["FinalClassification"] == category) & 
                    (df.index != row.name)  # Exclude current comment
                ].head(limit_similar)
                
                # Add these as similar comments
                for i, sim_row in enumerate(same_category_rows.itertuples()):
                    try:
                        similar_id = getattr(sim_row, id_columns[0]) if id_columns[0] in df.columns else (sim_row.Index + 1)
                        similarity = 0.9 - (i * 0.1)  # Decreasing similarity scores
                        
                        similar_comments.append({
                            "id": similar_id,
                            "comment": str(getattr(sim_row, comment_column)),
                            "category": category,
                            "similarity": max(similarity, 0.5)
                        })
                    except Exception as similar_error:
                        err.logger.error(f"Error creating similar comment: {similar_error}")
            
            # Add to the response object
            comment_obj["similar_comments"] = similar_comments
        
        return comment_obj
    except Exception as e:
        err.logger.error(f"Error retrieving comment: {str(e)}")
        return err.api_error(f"Error retrieving comment: {str(e)}")

@app.put("/projects/{project_id}/comments/{comment_id}")
async def update_comment_category(
    project_id: str, 
    comment_id: int, 
    update_data: UpdateCategoryRequest
):
    """Update a comment's category in the data_export.csv file"""
    try:
        # Check if project directory exists
        project_dir = os.path.join(UPLOAD_DIR, project_id)
        export_path = os.path.join(project_dir, "data_export.csv")
        
        if not os.path.exists(export_path):
            return err.api_error("Data export file not found", status_code=404)
        
        # Read the CSV file
        df = pd.read_csv(export_path)
        
        # Find the comment by ID
        comment_idx = None
        
        # First check if there's an ID column
        id_columns = ["id", "ID", "comment_id", "CommentID", "Identification Number", "identification_number"]
        for id_col in id_columns:
            if id_col in df.columns:
                matches = df[df[id_col] == comment_id].index
                if len(matches) > 0:
                    comment_idx = matches[0]
                    break
        
        # If not found by ID column, try the index (+1)
        if comment_idx is None:
            try:
                # In pandas, index starts at 0, but we're using 1-based IDs
                if 0 <= comment_id - 1 < len(df):
                    comment_idx = comment_id - 1
                else:
                    return err.api_error(f"Comment with ID {comment_id} not found", status_code=404)
            except:
                return err.api_error(f"Comment with ID {comment_id} not found", status_code=404)
        
        # Add HumanCategory column if it doesn't exist
        if "HumanCategory" not in df.columns:
            df["HumanCategory"] = None
        
        # Add FinalClassification column if it doesn't exist
        if "FinalClassification" not in df.columns:
            df["FinalClassification"] = None
        
        # Ensure columns have the correct data types
        df["HumanCategory"] = df["HumanCategory"].astype('object')
        df["FinalClassification"] = df["FinalClassification"].astype('object')
        
        # If ClassifiedConfidence is a float column but we want to set 100 as an integer
        if "ClassifiedConfidence" in df.columns:
            df["ClassifiedConfidence"] = df["ClassifiedConfidence"].astype('float64')
        
        # Update the category
        df.loc[comment_idx, "HumanCategory"] = update_data.category
        df.loc[comment_idx, "FinalClassification"] = update_data.category

        # Update the confidence
        df.loc[comment_idx, "ClassifiedConfidence"] = 100
        
        # Save the updated CSV
        df.to_csv(export_path, index=False)
        
        # Get the updated comment with similar comments
        updated_comment = await get_comment_by_id(project_id, comment_id)
        
        return {
            "success": True,
            "message": "Comment updated successfully",
            "data": updated_comment,
            "updateStats": True  # Signal that stats should be refreshed
        }
    except Exception as e:
        return err.api_error(f"Error updating comment: {str(e)}")
    
@app.get("/projects/{project_id}/export")
async def export_comments(
    project_id: str, 
    ids: List[int] = Query(..., description="IDs of comments to export"),
    format: str = Query("csv", description="Export format: csv, tsv, or excel")
):
    """Export selected comments in the requested format"""
    try:
        # Validate export format
        if format not in ["csv", "tsv", "excel"]:
            return err.api_error("Invalid export format. Supported formats: csv, tsv, excel", status_code=400)
        
        # Get project directory and export file path
        project_dir = os.path.join(UPLOAD_DIR, project_id)
        export_path = os.path.join(project_dir, "data_export.csv")
        
        if not os.path.exists(export_path):
            return err.api_error("Data export file not found", status_code=404)
        
        # Read the CSV file
        df = pd.read_csv(export_path)
        
        # Find the ID column
        id_column = None
        for potential_col in ["id", "ID", "comment_id", "CommentID", "Identification Number"]:
            if potential_col in df.columns:
                id_column = potential_col
                break

        # If no ID column, use the index
        filtered_df = None
        if id_column:
            # Filter by the provided IDs
            filtered_df = df[df[id_column].isin(ids)]
        else:
            # Use index-based filtering (assuming 1-based IDs)
            filtered_df = df.iloc[[id-1 for id in ids if 0 < id <= len(df)]]
        
        if filtered_df is None or filtered_df.empty:
            return err.api_error("No matching comments found", status_code=404)
        
        # Only include columns up to FinalClassification
        columns_to_include = []
        final_classification_found = False
        
        for col in df.columns:
            columns_to_include.append(col)
            if col.lower() == 'finalclassification':
                final_classification_found = True
                break
        
        # If FinalClassification not found, include all columns
        if not final_classification_found:
            columns_to_include = df.columns.tolist()
        
        # Filter columns
        filtered_df = filtered_df[columns_to_include]
        
        # Prepare file content based on format
        response_content = None
        media_type = None
        filename = f"comment_export_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}"
        
        if format == "csv":
            # Export as CSV
            response_content = filtered_df.to_csv(index=False).encode('utf-8')
            media_type = "text/csv"
            filename += ".csv"
        elif format == "tsv":
            # Export as TSV
            response_content = filtered_df.to_csv(index=False, sep='\t').encode('utf-8')
            media_type = "text/tab-separated-values"
            filename += ".tsv"
        elif format == "excel":
            # Export as Excel
            import io
            excel_buffer = io.BytesIO()
            filtered_df.to_excel(excel_buffer, index=False, engine='openpyxl')
            excel_buffer.seek(0)
            response_content = excel_buffer.getvalue()
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename += ".xlsx"
        
        # Create response with appropriate headers
        
        return Response(
            content=response_content,
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
        
    except Exception as e:
        err.logger.error(f"Error exporting comments: {e}")
        return err.api_error(f"Error exporting comments: {str(e)}")
    
@app.post("/rag/agent")
async def agent_analyze_comment(request: CommentBody):
    """Process a comment with advanced Agent to provide multi-step reasoning and analysis"""
    query = request.comment
    
    # Check if comment is empty
    if not query or query.strip() == "":
        return {
            "success": False,
            "message": "Error: Empty comment provided",
            "classification": err.rag_error("Empty comment provided")
        }
    
    # Check if Agent is available
    if not agent.has_agent_dependencies or not agent.comment_agent:
        raise HTTPException(
            status_code=503,
            detail="Agent functionality is not available. Required dependencies are missing or not properly initialized."
        )
    
    try:
        # Process comment using advanced agent
        result = await agent.process_comment_with_agent(query)
        
        # Check if classification resulted in an error
        if result.get("category") == "Error" and result.get("confidence") == 0:
            return {
                "success": False,
                "message": result.get("reasoning", "Agent processing error"),
                "classification": result
            }
        
        # Format the reasoning chain to be more readable for the frontend
        reasoning_steps = []
        if "reasoning_chain" in result:
            for step in result["reasoning_chain"]:
                if step.get("step") == "tool_execution" and "results" in step:
                    # Format tool results to be more readable
                    formatted_results = {}
                    for tool, tool_result in step["results"].items():
                        formatted_results[tool] = {
                            "status": tool_result.get("status"),
                            "summary": tool_result.get("message", "No summary available")
                        }
                        if "results" in tool_result:
                            formatted_results[tool]["details"] = tool_result["results"]
                    
                    step["results"] = formatted_results
            
            reasoning_steps = result["reasoning_chain"]
        
        # Normal successful response
        return {
            "success": True,
            "classification": {
                "category": result.get("category", "Unknown"),
                "confidence": result.get("confidence", 0),
                "reasoning": result.get("reasoning", "No reasoning provided"),
                "keywords": result.get("keywords", [])
            },
            "reasoning_steps": reasoning_steps
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error processing comment with agent: {str(e)}",
            "classification": err.rag_error(f"Error processing comment with agent: {str(e)}")
        }

# Run with: uvicorn main:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8088)