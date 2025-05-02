import os
import asyncio
import json
from typing import List, Dict, Any, Tuple
import pandas as pd
from dotenv import load_dotenv

# Import error utilities
import error_utils as err

# Import the embedding cache factory
try:
    import redis_compatible_embedding_cache as embedding_cache
    has_cache_support = True
except ImportError:
    has_cache_support = False
    err.logger.warning("Embedding cache module not found. Caching will be disabled.")

# Vector database imports
try:
    import chromadb
    from langchain_openai import OpenAIEmbeddings
    from langchain_community.vectorstores import Chroma
    from langchain_openai import ChatOpenAI
    from langchain.prompts import ChatPromptTemplate
    has_rag_dependencies = True
except ImportError:
    has_rag_dependencies = False
    err.logger.warning("RAG dependencies not found. RAG functionality will not be available.")

# Load environment variables
load_dotenv()

# Global variables
vector_store = None
comment_category_chain = None
embedding_cache_instance = None  # Global variable for the embedding cache

# Default categories
DEFAULT_CATEGORIES = ["OK", "Complaint", "Cultural", "Language", "Mental Health", "Sexism", "Appearance", "Wrong Staff"]

async def get_cached_embedding(query: str, embedding_function):
    """Get embeddings with caching support"""
    if embedding_cache_instance is not None:
        # Try to get from cache first
        cached_embedding = embedding_cache_instance.get(query)
        if cached_embedding is not None:
            return cached_embedding
    
    # If not in cache or no cache available, generate new embedding
    embedding = await asyncio.to_thread(embedding_function.embed_query, query)
    
    # Cache the result if cache is available
    if embedding_cache_instance is not None:
        embedding_cache_instance.set(query, embedding)
    
    return embedding

async def find_similar_comments(
    query: str, 
    vector_store, 
    k: int = 3, 
    score_threshold: float = 0.01
) -> List[Dict[str, Any]]:
    """
    Find similar comments to the query comment using the vector store with caching support.
    
    Args:
        query: The comment text to find similar comments for
        vector_store: The initialized vector store
        k: Maximum number of similar comments to return
        score_threshold: Minimum similarity score threshold
        
    Returns:
        List of dictionaries containing similar comments with their similarity scores and metadata
    """
    try:
        # Use the standard search method but with potentially cached embeddings
        if embedding_cache_instance is not None:
            # This implementation depends on the vector store implementation
            # For simplicity, we'll use the vanilla similarity_search_with_score
            # but log that we're using the cache
            err.logger.info(f"Using embedding cache for query: {query[:50]}...")
        
        # Get similar comments from vector store with scores
        results_with_scores = await asyncio.to_thread(
            vector_store.similarity_search_with_score, 
            query, 
            k=10  # Get more results for filtering
        )
        
        # Filter results below threshold
        filtered_results = [(doc, score) for doc, score in results_with_scores if score >= score_threshold]
        # Keep only top k results
        final_results = filtered_results[:k]
        
        # Format results for frontend/processing
        formatted_results = []
        
        for i, (doc, score) in enumerate(final_results):
            comment_id = doc.metadata.get("id", f"result-{i+1}")
            category = doc.metadata.get("category", "Unknown")
            
            formatted_results.append({
                "id": comment_id,
                "comment": doc.page_content,
                "category": category,
                "similarity": float(score)
            })
        
        # Save cache updates to disk if we have new entries
        if embedding_cache_instance is not None:
            embedding_cache_instance.save()
        
        return formatted_results
    except Exception as e:
        err.logger.error(f"Error finding similar comments: {str(e)}")
        # Return empty list but don't add fake results
        return []

async def classify_comment_with_llm(
    query: str,
    similar_comments: List[Dict[str, Any]],
    llm_chain,
    default_categories: List[str] = DEFAULT_CATEGORIES
) -> Dict[str, Any]:
    """
    Classify a comment using LLM based on the query and similar comments found.
    
    Args:
        query: The comment text to classify
        similar_comments: List of similar comments with their metadata
        llm_chain: The initialized LLM chain for classification
        default_categories: Default categories to use if not enough in similar comments
        
    Returns:
        Dictionary with classification results (category, confidence, reasoning, keywords)
    """
    try:
        # If no similar comments, return error instead of default classification
        if not similar_comments:
            return err.rag_error("No similar comments found in the database. Cannot perform classification.")
        
        # Prepare context for LLM
        context_items = []
        available_categories = set()
        
        for item in similar_comments:
            context_items.append(f"Comment: '{item['comment']}', Category: '{item['category']}'")
            available_categories.add(item["category"])
        
        # Make sure we have at least a few categories
        if len(available_categories) < 2:
            for cat in default_categories:
                available_categories.add(cat)
                
        categories_str = ", ".join(available_categories)
        context = "\n".join(context_items)
        
        # Use LLM for classification
        llm_response = await asyncio.to_thread(
            llm_chain.invoke, 
            {"query": query, "categories": categories_str, "context": context}
        )
        
        # Parse LLM response
        if hasattr(llm_response, "content"):
            try:
                # Try to remove any JSON code markers
                text_content = llm_response.content
                text_content = text_content.replace('```json', '').replace('```', '').strip()
                llm_json = json.loads(text_content)
                
                # Validate fields
                if "category" not in llm_json or not llm_json["category"]:
                    raise ValueError("Missing category field in LLM response")
                    
                if "confidence" not in llm_json:
                    raise ValueError("Missing confidence field in LLM response")
                elif not isinstance(llm_json["confidence"], (int, float)):
                    try:
                        llm_json["confidence"] = float(llm_json["confidence"])
                    except:
                        raise ValueError("Invalid confidence value in LLM response")
                        
                if "reasoning" not in llm_json or not llm_json["reasoning"]:
                    llm_json["reasoning"] = "Reasoning not provided by LLM"
                
                # Handle keywords - only included for comments longer than 10 characters
                if len(query.strip()) > 10 and "keywords" not in llm_json:
                    # Add an empty keywords array if not provided but comment is long enough
                    llm_json["keywords"] = []
                
                return llm_json
            except Exception as parse_error:
                # Return error instead of default response
                return err.rag_error(f"Error parsing LLM response: {str(parse_error)}")
        else:
            # Return error for invalid response format
            return err.rag_error("Invalid response format from LLM")
    except Exception as e:
        err.logger.error(f"Error classifying comment with LLM: {str(e)}")
        return err.rag_error(f"Error: {str(e)}")

async def process_comment_with_rag(
    comment_text: str,
    vector_store,
    llm_chain,
    default_categories: List[str] = DEFAULT_CATEGORIES
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Process a comment with RAG to find similar comments and classify it.
    This is a convenience function that combines find_similar_comments and classify_comment_with_llm.
    
    Args:
        comment_text: The comment text to process
        vector_store: The initialized vector store
        llm_chain: The initialized LLM chain for classification
        default_categories: Default categories to use
        
    Returns:
        Tuple of (similar_comments, classification_result)
    """
    # Check if comment is empty or the placeholder text
    is_empty_comment = not comment_text.strip() or comment_text == "This comment is empty or missing"
    
    if is_empty_comment:
        # For empty comments, don't do similarity search
        # Create a direct classification result
        classification = {
            "category": "OK",
            "confidence": 100,
            "reasoning": "This is an empty comment with no content to analyze."
        }
        
        # Create a minimal similar comments list to satisfy the interface
        similar_comments = []
        return similar_comments, classification
    
    # Check if we have a cached processing result for this comment
    if embedding_cache_instance is not None:
        cache_key = f"processed_{comment_text}"
        cached_result = embedding_cache_instance.get(cache_key)
        if cached_result is not None:
            # If we have a cached result, extract the similar comments and classification
            err.logger.info(f"Using cached processing result for comment: {comment_text[:50]}...")
            similar_comments = []
            if "similar_ids" in cached_result:
                try:
                    similar_items = cached_result["similar_ids"].split(";")
                    for sc in similar_items:
                        try:
                            parsed_comment = json.loads(sc)
                            similar_comments.append(parsed_comment)
                        except json.JSONDecodeError:
                            continue
                except Exception as e:
                    err.logger.error(f"Error parsing cached similar comments: {e}")
            
            classification = {
                "category": cached_result.get("category", "Unknown"),
                "confidence": cached_result.get("confidence", 0),
                "reasoning": cached_result.get("reason", "Reasoning not available"),
            }
            
            if "keywords" in cached_result:
                classification["keywords"] = cached_result["keywords"]
                
            return similar_comments, classification
    
    # For non-empty comments, proceed with normal processing
    # Find similar comments
    similar_comments = await find_similar_comments(comment_text, vector_store)
    
    # Classify with LLM
    classification = await classify_comment_with_llm(
        comment_text,
        similar_comments,
        llm_chain,
        default_categories
    )
    
    # If classification indicates an error, log it
    if classification.get("category") == "Error" and classification.get("confidence") == 0:
        err.logger.error(f"Classification error: {classification.get('reasoning', 'Unknown error')}")
    else:
        # Cache the successful result
        if embedding_cache_instance is not None:
            cache_key = f"processed_{comment_text}"
            cache_data = {
                "category": classification.get("category", "Unknown"),
                "confidence": classification.get("confidence", 0),
                "reason": classification.get("reasoning", "No reasoning provided"),
                "similar_ids": ";".join(json.dumps(sc, ensure_ascii=False) for sc in similar_comments),
                "status": "success"
            }
            
            if "keywords" in classification and classification["keywords"]:
                cache_data["keywords"] = classification["keywords"]
                
            err.logger.info(f"Caching processing result for comment: {comment_text[:50]}...")
            embedding_cache_instance.set(cache_key, cache_data)
            # Force save the cache after processing a comment
            embedding_cache_instance.save()
    
    return similar_comments, classification

async def process_single_comment(idx, df, comment_column):
    """Process a single comment with caching support"""
    try:
        comment_text = df.iloc[idx][comment_column]
        
        # Enhanced handling for empty comments: check for pd.isna, empty strings, and "nan" strings
        is_empty = pd.isna(comment_text) or str(comment_text).strip() == "" or str(comment_text).lower() == "nan"
        if is_empty:
            comment_text = "This comment is empty or missing"
        
        # Convert comment to string (if not already)
        comment_text = str(comment_text)
        
        # Check cache first before processing
        if embedding_cache_instance is not None:
            cache_key = f"processed_{comment_text}"
            cached_result = embedding_cache_instance.get(cache_key)
            if cached_result is not None:
                # We found cached processing result
                err.logger.info(f"Using cached processing result for comment at index {idx}")
                cached_result["index"] = idx  # Update index to current
                return cached_result
        
        # Process this comment with RAG
        similar_comments, classification = await process_comment_with_rag(
            comment_text,
            vector_store,
            comment_category_chain,
            DEFAULT_CATEGORIES
        )
        
        # Check if classification returned error
        if classification.get("category") == "Error" and classification.get("confidence") == 0:
            error_msg = classification.get("reasoning", "Unknown classification error")
            result = {
                "index": idx,
                "category": "Error",
                "confidence": 0,
                "reason": error_msg,
                "error": error_msg,
                "status": "error"
            }
        else:
            result = {
                "index": idx,
                "category": str(classification["category"]),
                "confidence": float(classification["confidence"]),
                "reason": str(classification["reasoning"]),
                "similar_ids": ";".join(json.dumps(sc, ensure_ascii=False) for sc in similar_comments),
                "status": "success"
            }

            if "keywords" in classification and classification["keywords"]:
                result["keywords"] = classification["keywords"]
        
        # Cache the processing result
        if embedding_cache_instance is not None and result["status"] == "success":
            cache_key = f"processed_{comment_text}"
            embedding_cache_instance.set(cache_key, result)
        
        return result
    except Exception as e:
        error_msg = f"Error processing comment at index {idx}: {str(e)}"
        err.logger.error(error_msg)
        return {
            "index": idx,
            "error": error_msg,
            "status": "error"
        }

async def process_batch(batch_indices, df, comment_column):
    """Process a batch of comments with optimized caching"""
    # Extract all comments for batch processing
    batch_comments = []
    batch_comment_map = {}  # Maps comments to their indices
    
    for idx in batch_indices:
        comment_text = df.iloc[idx][comment_column]
        
        # Handle empty comments
        is_empty = pd.isna(comment_text) or str(comment_text).strip() == ""
        if is_empty:
            comment_text = "This comment is empty or missing"
        
        # Convert comment to string (if not already)
        comment_text = str(comment_text)
        
        # Add to batch
        batch_comments.append(comment_text)
        # Map comment to its index (multiple indices may map to same comment)
        if comment_text not in batch_comment_map:
            batch_comment_map[comment_text] = []
        batch_comment_map[comment_text].append(idx)
    
    # Check cache for all comments at once
    cached_results = {}
    cache_hits = set()
    
    if embedding_cache_instance is not None:
        for comment_text in batch_comments:
            cache_key = f"processed_{comment_text}"
            cached_result = embedding_cache_instance.get(cache_key)
            if cached_result is not None:
                err.logger.info(f"Cache hit for comment: {comment_text[:30]}...")
                cached_results[comment_text] = cached_result
                cache_hits.add(comment_text)
    
    # Process comments not in cache
    tasks = []
    for comment_text in batch_comments:
        if comment_text not in cache_hits:
            # For each unique comment that needs processing
            for idx in batch_comment_map[comment_text]:
                # Create a task for each index
                tasks.append(process_single_comment(idx, df, comment_column))
    
    # Execute all tasks for non-cached comments
    non_cached_results = await asyncio.gather(*tasks) if tasks else []
    
    # Combine cached and non-cached results
    all_results = []
    
    # First, add results from cache
    for comment_text in batch_comments:
        if comment_text in cache_hits:
            cached_result = cached_results[comment_text]
            # Add a result for each index that maps to this comment
            for idx in batch_comment_map[comment_text]:
                # Clone the result and update the index
                result_copy = cached_result.copy()
                result_copy["index"] = idx
                all_results.append(result_copy)
    
    # Then add non-cached results
    all_results.extend(non_cached_results)
    
    # Save cache updates after batch processing
    if embedding_cache_instance is not None:
        embedding_cache_instance.save()
    
    return all_results

async def process_comments_with_rag(export_path, batch_size=10):
    """
    Optimized comment processing function - batch processing with parallel processing within each batch
    With improved progress tracking and embedding caching
    
    Args:
        export_path: Data export file path
        batch_size: Number of comments to process in each batch
    """
    try:
        if not os.path.exists(export_path):
            error_msg = f"Data export file not found: {export_path}"
            err.logger.error(error_msg)
            raise FileNotFoundError(error_msg)
        
        # Check if RAG dependencies are available
        if not has_rag_dependencies or not vector_store or not comment_category_chain:
            error_msg = "RAG functionality is not available. Required dependencies are missing or not properly initialized."
            err.logger.error(error_msg)
            raise RuntimeError(error_msg)
        
        # Read data
        df = pd.read_csv(export_path)
        total_comments = len(df)
        err.logger.info(f"Starting to process {total_comments} comments with batch processing, parallel execution, and embedding caching")
        
        # Get project directory path for status file
        project_dir = os.path.dirname(export_path)
        status_path = os.path.join(project_dir, "status.json")
        
        # Ensure all columns have correct data types
        for col in ["ClassifiedCategory", "ClassifiedConfidence", "HumanCategory", "FinalClassification", "Reason", "ProcessingError", "SimilarCommentId"]:
            if col not in df.columns:
                # Create missing columns with appropriate types
                if col == "ClassifiedConfidence":
                    df[col] = pd.Series(dtype='float64')
                else:
                    df[col] = pd.Series(dtype='object')  # Use object (string) type for text columns
            else:
                # Convert existing columns to appropriate types
                if col == "ClassifiedConfidence":
                    df[col] = df[col].astype('float64', errors='ignore')
                else:
                    # Convert text columns to string/object type
                    df[col] = df[col].astype('object', errors='ignore')
        
        # Find comment column
        comment_column = None
        for potential_col in ['comment', 'Comment', 'COMMENT', 'text', 'Text', 'content', 'Content', 'RawComment']:
            if potential_col in df.columns:
                comment_column = potential_col
                break
        
        if not comment_column:
            # If no standard column found, look for any text column
            for col in df.columns:
                if df[col].dtype == 'object' and not df[col].isna().all():
                    sample_values = df[col].dropna().astype(str).str.len()
                    if not sample_values.empty and sample_values.max() > 10:  # At least some cells have text
                        comment_column = col
                        break
        
        if not comment_column:
            err.logger.error(f"Available columns: {list(df.columns)}")
            err.logger.error(f"Column types: {df.dtypes.to_dict()}")
            error_msg = "No valid comment column found in the data"
            err.logger.error(error_msg)
            raise ValueError(error_msg)
            
        err.logger.info(f"Using '{comment_column}' as the comment column for RAG processing")
        
        # Only get unprocessed comments indices
        unprocessed_indices = df.index[
            (df["ClassifiedCategory"].isna()) | 
            (df["ClassifiedCategory"] == "")
        ].tolist()
        
        if not unprocessed_indices:
            err.logger.info("No unprocessed comments found, all comments have already been processed")
            # Update status to completed
            err.update_status_file(status_path, "completed", progress=100)
            return df
        
        # Total number of comments to process
        total_to_process = len(unprocessed_indices)
        
        # Adjust batch size, ensure at least 1 comment per batch, maximum 50
        batch_size = max(1, min(batch_size, 50))
        
        # Split indices into batches
        batches = [unprocessed_indices[i:i + batch_size] for i in range(0, len(unprocessed_indices), batch_size)]
        err.logger.info(f"Split into {len(batches)} batches of size up to {batch_size}")
        
        # Cache stats before processing
        if embedding_cache_instance is not None:
            cache_stats_before = embedding_cache_instance.get_stats()
            err.logger.info(f"Cache stats before processing: {cache_stats_before}")
        
        # Total processing count
        processed_count = 0
        
        # Process each batch sequentially
        for batch_num, batch_indices in enumerate(batches, 1):
            err.logger.info(f"Starting batch {batch_num}/{len(batches)} with {len(batch_indices)} comments")
            
            # Process batch with optimized caching
            batch_results = await process_batch(batch_indices, df, comment_column)
            
            # Batch complete, update file
            try:
                # Read latest version of file
                current_df = pd.read_csv(export_path)
                
                # Ensure all columns in the current dataframe have correct data types
                for col in ["ClassifiedCategory", "ClassifiedConfidence", "HumanCategory", "FinalClassification", "Reason", "ProcessingError", "SimilarCommentId"]:
                    if col not in current_df.columns:
                        # Create missing columns with appropriate types
                        if col == "ClassifiedConfidence":
                            current_df[col] = pd.Series(dtype='float64')
                        else:
                            current_df[col] = pd.Series(dtype='object')  # Use object (string) type for text columns
                    else:
                        # Convert existing columns to appropriate types
                        if col == "ClassifiedConfidence":
                            current_df[col] = current_df[col].astype('float64', errors='ignore')
                        else:
                            # Convert text columns to string/object type
                            current_df[col] = current_df[col].astype('object', errors='ignore')
                
                # Update DataFrame
                for result in batch_results:
                    idx = result["index"]
                    
                    if result["status"] == "success":
                        current_df.loc[idx, "ClassifiedCategory"] = result["category"]
                        current_df.loc[idx, "ClassifiedConfidence"] = result["confidence"]
                        current_df.loc[idx, "Reason"] = result["reason"]
                        current_df.loc[idx, "ProcessingError"] = None
                        if "similar_ids" in result:
                            current_df.loc[idx, "SimilarCommentId"] = result["similar_ids"]
                        if "keywords" in result and result["keywords"]:
                            current_df.loc[idx, "Keywords"] = json.dumps(result["keywords"], ensure_ascii=False)
                    elif result["status"] == "error":
                        current_df.loc[idx, "ClassifiedCategory"] = "Error"
                        current_df.loc[idx, "ClassifiedConfidence"] = 0
                        current_df.loc[idx, "Reason"] = result["error"]
                        current_df.loc[idx, "ProcessingError"] = result["error"]
                
                # Save updated dataframe
                current_df.to_csv(export_path, index=False)
                
                # Update total processing count
                processed_count += len(batch_results)
                
                # Calculate progress percentage
                progress_percentage = min(round((processed_count / total_to_process) * 100), 99)
                
                # Update status file with current progress
                err.update_status_file(status_path, "in_progress", progress=progress_percentage)
                
                # Log cache stats every 5 batches if available
                if embedding_cache_instance is not None and batch_num % 5 == 0:
                    cache_stats = embedding_cache_instance.get_stats()
                    err.logger.info(f"Cache stats after batch {batch_num}: {cache_stats}")
                    # Save cache to disk periodically
                    embedding_cache_instance.save()
                
                err.logger.info(f"Batch {batch_num}/{len(batches)} completed with {len(batch_results)} comments processed")
                err.logger.info(f"Overall progress: {processed_count}/{total_to_process} comments processed ({progress_percentage}%)")
                
            except Exception as e:
                error_msg = f"Error updating file after batch {batch_num}: {str(e)}"
                err.logger.error(error_msg)
                # Update status file with error but continue processing
                err.update_status_file(status_path, "in_progress", progress=int((batch_num-1)/len(batches)*100), has_errors=True, error_message=error_msg)
                # Continue processing next batch instead of interrupting entire process
        
        # Calculate final processed comments
        try:
            final_df = pd.read_csv(export_path)
            final_processed = final_df[final_df["ClassifiedCategory"].notna() & (final_df["ClassifiedCategory"] != "")].shape[0]
            err.logger.info(f"RAG processing complete. Total processed: {final_processed}/{total_comments} comments")
            
            # Final cache stats
            if embedding_cache_instance is not None:
                cache_stats_after = embedding_cache_instance.get_stats()
                err.logger.info(f"Cache stats after processing: {cache_stats_after}")
                # Save final cache to disk
                embedding_cache_instance.save()
                
                # Calculate cache efficiency
                if cache_stats_before and 'hits' in cache_stats_before and 'misses' in cache_stats_before:
                    new_hits = cache_stats_after['hits'] - cache_stats_before['hits']
                    new_misses = cache_stats_after['misses'] - cache_stats_before['misses']
                    cache_utilization = (new_hits / (new_hits + new_misses)) * 100 if (new_hits + new_misses) > 0 else 0
                    err.logger.info(f"Cache utilization during this run: {cache_utilization:.2f}%")
            
            # Update status to completed (100%)
            err.update_status_file(status_path, "completed", progress=100)
            
            return final_df
        except Exception as e:
            err.logger.error(f"Error calculating final stats: {e}")
            
            # Update status with error
            err.update_status_file(status_path, "error", progress=99, has_errors=True, error_message=f"Error calculating final stats: {e}")
            
            return df
        
    except Exception as e:
        err.logger.error(f"Error in batch processing with RAG: {e}")
        
        # Try to update file to show error
        try:
            df = pd.read_csv(export_path)
            err.update_dataframe_error(df, f"Error in batch processing with RAG: {e}")
            df.to_csv(export_path, index=False)
            
            # Update status file with error
            project_dir = os.path.dirname(export_path)
            status_path = os.path.join(project_dir, "status.json")
            err.update_status_file(status_path, "error", has_errors=True, error_message=f"Error in batch processing with RAG: {e}")
            
        except Exception as file_error:
            err.logger.error(f"Error updating CSV with error message: {file_error}")
            
        # Re-raise exception for caller to handle
        raise

async def initialize_rag():
    """Initialize RAG components - vector store, LLM chain, and embedding cache"""
    global vector_store, comment_category_chain, embedding_cache_instance
    
    # Initialize vector store and LLM chain if dependencies are installed
    if has_rag_dependencies and os.getenv("OPENAI_API_KEY"):
        try:
            # Initialize embedding cache if supported
            if has_cache_support:
                try:
                    # Determine cache type from environment variable
                    cache_type = os.getenv("CACHE_TYPE", "file").lower()
                    
                    # Set up cache configuration from environment variables
                    cache_config = {
                        "ttl_days": int(os.getenv("CACHE_TTL_DAYS", "30"))
                    }
                    
                    # Add Redis-specific config if using Redis
                    if cache_type == "redis":
                        cache_config.update({
                            "redis_host": os.getenv("REDIS_HOST", "localhost"),
                            "redis_port": int(os.getenv("REDIS_PORT", "6379")),
                            "redis_db": int(os.getenv("REDIS_DB", "0")),
                            "redis_password": os.getenv("REDIS_PASSWORD", None),
                            "prefix": os.getenv("REDIS_PREFIX", "embedding_cache:")
                        })
                    else:
                        # File-specific config
                        cache_config["cache_dir"] = os.getenv("CACHE_DIR", "./embedding_cache")
                    
                    # Create cache instance using factory
                    embedding_cache_instance = embedding_cache.create_embedding_cache(cache_type, **cache_config)
                    err.logger.info(f"Embedding cache initialized successfully using {cache_type} storage")
                except Exception as cache_error:
                    err.logger.error(f"Error initializing embedding cache: {cache_error}")
                    embedding_cache_instance = None
            
            # Initialize vector store
            embedding_function = OpenAIEmbeddings(
                model="text-embedding-ada-002",
                openai_api_key=os.getenv("OPENAI_API_KEY")
            )
            
            os.makedirs("./chroma_db", exist_ok=True)
            chroma_client = chromadb.PersistentClient(path="./chroma_db")
            
            # Check if collection exists, create if not
            try:
                collection = chroma_client.get_collection(name="comments_vectors")
            except ValueError:
                # Collection doesn't exist, create it
                collection = chroma_client.create_collection(name="comments_vectors")
            
            vector_store = Chroma(
                client=chroma_client,
                collection_name="comments_vectors",
                embedding_function=embedding_function
            )

            # Initialize LLM and classification chain
            llm = ChatOpenAI(
                model="gpt-3.5-turbo",
                temperature=0,
                openai_api_key=os.getenv("OPENAI_API_KEY")
            )
            
            # Classification prompt template with clearer instructions
            template = """
            You are a precise comment classification system. I will give you a user comment, along with similar comments and their classifications.
            Based on this information, determine which category the current comment belongs to and provide a confidence level (0-100).
            And you cannot give Unknown or "" or empty label and you only can choose from categories.
            If there is a low similarity, you can just give an OK label. Don't give me Unknown. 
            Available categories: {categories}
            
            Current comment: {query}

            Similar comments:
            {context}

            Special rule: If the comment is "This comment is empty or missing" or appears to be empty, classify it as "OK" category.

            For comments longer than 10 characters, you should also identify 3-5 key phrases or words from the comment that influenced your classification decision. These will be used for highlighting in the user interface.

            You must respond ONLY with a valid JSON object in the following format:
            {{"category": "category_name", "confidence": number_between_0_and_100, "reasoning": "brief explanation of your choice", "keywords": ["keyword1", "keyword2", "keyword3"]}}

            The "keywords" field should contain 3-5 significant words or short phrases from the original comment that led to your categorization decision. Only include the keywords field if the comment is longer than 10 characters.

            Do not include any explanations, markdown formatting, or additional text outside of the JSON object.
            The "category" must be one of the available categories listed above. And you cannot give Unknown or "" or empty label and you only can choose from categories.
            If there is a low similarity, you can just give an OK label. Don't give me Unknown. 
            The "confidence" must be a number between 0 and 100 without quotes or symbols.
            The "reasoning" should be a concise explanation for your categorization.
            """
            
            prompt = ChatPromptTemplate.from_template(template)
            comment_category_chain = prompt | llm
            
            err.logger.info("RAG system initialized successfully.")
            return True
        except Exception as e:
            err.logger.error(f"Error initializing RAG system: {e}")
            vector_store = None
            comment_category_chain = None
            embedding_cache_instance = None
            return False
    else:
        missing = []
        if not has_rag_dependencies:
            missing.append("RAG dependencies")
        if not os.getenv("OPENAI_API_KEY"):
            missing.append("OPENAI_API_KEY")
        err.logger.error(f"Cannot initialize RAG system. Missing: {', '.join(missing)}")
        return False

# API endpoint to get embedding cache stats
async def get_cache_stats():
    """Get embedding cache statistics"""
    if embedding_cache_instance is not None:
        stats = embedding_cache_instance.get_stats()
        return {
            "success": True,
            "has_cache": True,
            "stats": stats
        }
    else:
        return {
            "success": False,
            "has_cache": False,
            "stats": {}
        }

# API endpoint to clear the embedding cache
async def clear_cache():
    """Clear the embedding cache"""
    if embedding_cache_instance is not None:
        try:
            # Clear expired entries
            cleared = embedding_cache_instance.clear_expired()
            embedding_cache_instance.save()
            return {
                "success": True,
                "cleared_entries": cleared,
                "stats": embedding_cache_instance.get_stats()
            }
        except Exception as e:
            err.logger.error(f"Error clearing cache: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    else:
        return {
            "success": False,
            "error": "Cache not initialized"
        }