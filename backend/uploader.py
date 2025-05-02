import polars as pl
import pandas as pd
import re
import unicodedata
import logging
from typing import Optional

# Configure logging
logger = logging.getLogger(__name__)

def preprocess_comments(df_pandas):
    """
    Clean and normalize comment text in a DataFrame using Polars for improved performance.
    
    Args:
        df_pandas (pandas.DataFrame): Pandas DataFrame containing comments
        
    Returns:
        pandas.DataFrame: DataFrame with preprocessed comments (converted back to pandas)
    """
    logger.info(f"Starting comment preprocessing for {len(df_pandas)} records using Polars")
    
    # Convert pandas DataFrame to Polars DataFrame
    try:
        df = pl.from_pandas(df_pandas)
    except Exception as e:
        logger.error(f"Error converting to Polars DataFrame: {str(e)}")
        return df_pandas  # Return original on error
    
    # Define commonly used comment field names to check
    comment_field_names = ['comment', 'Comment', 'COMMENT', 'text', 'Text', 
                          'content', 'Content', 'RawComment', 'raw_comment']
    
    # Find the comment column
    comment_col = None
    for col_name in comment_field_names:
        if col_name in df.columns:
            comment_col = col_name
            break
    
    if not comment_col:
        logger.warning("No comment column found in the dataset. Available columns: " + 
                      str(df.columns))
        return df_pandas
    
    logger.info(f"Using '{comment_col}' as the comment column for preprocessing")
    
    # Punctuation mapping table
    punctuation_map = {
        # Chinese punctuation
        '，': ',',    # Comma
        '。': '.',    # Period
        '、': ',',    # Enumeration comma
        '；': ';',    # Semicolon
        '：': ':',    # Colon
        '？': '?',    # Question mark
        '！': '!',    # Exclamation mark
        '"': '"',     # Left double quotation mark
        '"': '"',     # Right double quotation mark
        ''': "'",     # Left single quotation mark
        ''': "'",     # Right single quotation mark
        '（': '(',    # Left parenthesis
        '）': ')',    # Right parenthesis
        '【': '[',    # Left square bracket
        '】': ']',    # Right square bracket
        '《': '<',    # Left angle bracket
        '》': '>',    # Right angle bracket
        '—': '-',     # Em dash
        '……': '...',  # Ellipsis
        '·': '.',     # Middle dot
        
        # Full-width English punctuation
        '＆': '&',    # Full-width &
        '＃': '#',    # Full-width #
        '％': '%',    # Full-width %
        '＊': '*',    # Full-width *
        '＋': '+',    # Full-width +
        '－': '-',    # Full-width -
        '＝': '=',    # Full-width =
        '／': '/',    # Full-width /
        '＼': '\\',   # Full-width \
        '｜': '|',    # Full-width |
        
        # Other common non-English punctuation
        '„': '"',     # German quotation mark
        '«': '"',     # French left quotation mark
        '»': '"',     # French right quotation mark
        '¿': '?',     # Inverted question mark
        '¡': '!',     # Inverted exclamation mark
    }
    
    # Define a Python function for text cleaning
    def clean_comment(text: Optional[str]) -> Optional[str]:
        if text is None or text == "":
            return text
        
        # Convert to string if not already
        text = str(text)
        
        # Process common encoding sequences
        text = re.sub(r'x000D', '\n', text)
        text = re.sub(r'x000A', '\n', text)
        text = re.sub(r'xD', '\n', text)
        text = re.sub(r'xA', '\n', text)
        text = text.replace('\u200B', '')
        
        # Handle actual control characters
        text = text.replace('\r\n', '\n')
        text = text.replace('\r', '\n')
        
        # Handle underscore patterns
        text = re.sub(r'_\n_', '\n', text)
        text = re.sub(r'_{2,}', '\n', text)
        text = re.sub(r'_', ' ', text)
        
        # Normalize punctuation using the mapping table
        for non_eng_punct, eng_punct in punctuation_map.items():
            text = text.replace(non_eng_punct, eng_punct)
        
        # Use Unicode normalization function
        text = unicodedata.normalize('NFD', text)
        
        # Handle half-width/full-width character conversion
        text = re.sub(r'[^\x00-\x7F]+', lambda x: unicodedata.normalize('NFKD', x.group(0)), text)
        
        # Normalize quotes
        text = text.replace('"', '"').replace('"', '"')
        text = text.replace(''', "'").replace(''', "'")
        
        # Normalize consecutive newlines
        text = re.sub(r'\n+', '\n', text)
        
        # Process line by line to handle whitespace properly
        lines = text.split('\n')
        cleaned_lines = [re.sub(r'\s+', ' ', line.strip()) for line in lines]
        cleaned_text = '\n'.join(cleaned_lines)
        
        # Optional: Final trim
        cleaned_text = cleaned_text.strip()
        
        return cleaned_text
    
    # Apply the cleaning function using Polars
    try:
        # Check Polars version or API and use appropriate method
        # Method 1: using apply (for older Polars versions)
        try:
            df_processed = df.clone()
            df_processed = df_processed.with_column(
                pl.col(comment_col).apply(clean_comment)
            )
        except AttributeError:
            # Method 2: Alternative for different Polars API
            df_processed = df.select([
                pl.col(col).map_elements(clean_comment, return_dtype=pl.Utf8) if col == comment_col else pl.col(col)
                for col in df.columns
            ])
        
        # Convert back to pandas for compatibility with rest of the code
        result_df = df_processed.to_pandas()
        logger.info(f"Successfully preprocessed {len(result_df)} comments using Polars")
        return result_df
        
    except Exception as e:
        logger.error(f"Error preprocessing comments with Polars: {str(e)}")
        # Fall back to pandas version on error
        logger.info("Falling back to pandas processing")
        
        # Pandas fallback implementation
        processed_df = df_pandas.copy()
        processed_df[comment_col] = processed_df[comment_col].apply(
            lambda x: clean_comment(x) if not pd.isna(x) else x
        )
        return processed_df

def process_file_dataframe(df):
    """
    Process a dataframe that has been read from a file.
    This function acts as a wrapper around preprocess_comments.
    
    Args:
        df (pandas.DataFrame): DataFrame to process
        
    Returns:
        pandas.DataFrame: Processed DataFrame
    """
    try:
        # Apply text preprocessing with Polars
        processed_df = preprocess_comments(df)
        
        # Return processed dataframe
        return processed_df
    except Exception as e:
        logger.error(f"Error in process_file_dataframe: {str(e)}")
        # Return original dataframe on error
        return df