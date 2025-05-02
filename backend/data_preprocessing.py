from pyspark.sql import SparkSession
from pyspark.sql.functions import col, trim, regexp_replace, length, udf
from pyspark.sql.types import StringType
import pandas as pd
import re
import csv
import os
import unicodedata

# Initialize Spark session using local file system configuration
spark = SparkSession.builder \
    .appName("Comment Data Preprocessing") \
    .config("spark.driver.memory", "4g") \
    .config("spark.sql.shuffle.partitions", "4") \
    .master("local[*]") \
    .getOrCreate()

# Set log level to reduce output
spark.sparkContext.setLogLevel("ERROR")

# Define input and output file paths
input_file = "./data.xlsx"
output_file = "./data.csv"

print("Starting data preprocessing using Apache Spark...")
print(f"Input file: {input_file}")

# Read Excel file using pandas, then convert to Spark DataFrame
print("Reading Excel file using pandas...")
pandas_df = pd.read_excel(input_file, na_values=['null', 'n/a'])
print(f"Pandas reading complete. Initial record count: {len(pandas_df)}")

# Convert to Spark DataFrame
df = spark.createDataFrame(pandas_df)
print(f"Converted to Spark DataFrame. Record count: {df.count()}")

# Standardize column names
column_mapping = {
    "Identification Number": "identification_number",
    "Mode of attendance code": "mode_of_attendance_code",
    "Type of attendance code": "type_of_attendance_code",
    "NESB indicator": "nesb_indicator",
    "Citizenship indicator": "citizenship_indicator",
    "Study area": "study_area",
    "Course level": "course_level",
    "RawComment": "raw_comment",
    "TrainCategory": "train_category"
}

# Apply column renaming
for old_col, new_col in column_mapping.items():
    if old_col in df.columns:
        df = df.withColumnRenamed(old_col, new_col)

# Punctuation mapping table - from non-English punctuation to English punctuation
punctuation_map = {
    # Chinese punctuation
    '，': ',',    # Comma
    '。': '.',    # Period
    '、': ',',    # Enumeration comma
    '；': ';',    # Semicolon
    '：': ':',    # Colon
    '？': '?',    # Question mark
    '！': '!',    # Exclamation mark
    '"': '"',    # Left double quotation mark
    '"': '"',    # Right double quotation mark
    ''': "'",    # Left single quotation mark
    ''': "'",    # Right single quotation mark
    '（': '(',    # Left parenthesis
    '）': ')',    # Right parenthesis
    '【': '[',    # Left square bracket
    '】': ']',    # Right square bracket
    '《': '<',    # Left angle bracket
    '》': '>',    # Right angle bracket
    '—': '-',    # Em dash
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

# Custom UDF function to process comment text, handle special encoding, line breaks, and punctuation
@udf(StringType())
def clean_comment(text):
    if text is None:
        return None
    
    # Convert to string
    text = str(text)
    
    # Process common encoding sequences
    # Replace x000D (CR) with newline
    text = re.sub(r'x000D', '\n', text)
    # Replace x000A (LF) with newline
    text = re.sub(r'x000A', '\n', text)
    # Replace xD, xA and other possible variants
    text = re.sub(r'xD', '\n', text)
    text = re.sub(r'xA', '\n', text)
    
    # Handle actual control characters
    text = text.replace('\r\n', '\n')  # Standardize Windows-style line breaks
    text = text.replace('\r', '\n')    # Replace standalone CR with LF
    
    # Handle underscore patterns (like _\n_ or consecutive _)
    # Replace _ followed by newline followed by _ with a single newline
    text = re.sub(r'_\n_', '\n', text)
    # Replace consecutive underscores with a single newline
    text = re.sub(r'_{2,}', '\n', text)
    # Replace standalone underscores with spaces (if they are confirmed to be redundant)
    text = re.sub(r'_', ' ', text)
    
    # Normalize punctuation - use mapping table to replace non-English punctuation with English punctuation
    for non_eng_punct, eng_punct in punctuation_map.items():
        text = text.replace(non_eng_punct, eng_punct)
    
    # Use Unicode normalization function - convert all possible punctuation forms to their standard form
    # NFD decomposes characters, then normalizes all punctuation
    text = unicodedata.normalize('NFD', text)
    
    # Handle half-width/full-width character conversion (especially for punctuation and spaces)
    # Use regex to replace all punctuation with their ASCII equivalents
    text = re.sub(r'[^\x00-\x7F]+', lambda x: unicodedata.normalize('NFKD', x.group(0)), text)
    
    # Normalize single and double quotes to straight quotes
    text = text.replace('"', '"').replace('"', '"')  # Fancy double quotes -> straight double quotes
    text = text.replace(''', "'").replace(''', "'")  # Fancy single quotes -> straight single quotes
    
    # Normalize consecutive newlines
    text = re.sub(r'\n+', '\n', text)
    
    # Trim whitespace at the beginning and end
    text = text.strip()
    
    # Replace multiple spaces within lines with a single space, but preserve newlines
    lines = text.split('\n')
    cleaned_lines = [re.sub(r'\s+', ' ', line.strip()) for line in lines]
    # Filter out empty lines
    cleaned_lines = [line for line in cleaned_lines if line]
    cleaned_text = '\n'.join(cleaned_lines)
    
    return cleaned_text

# Apply custom cleaning function
df = df.withColumn("raw_comment", clean_comment(col("raw_comment")))

# Filter out empty comments
df = df.filter(length(trim(col("raw_comment"))) > 0)

# Define columns to keep
db_columns = ["identification_number", "mode_of_attendance_code", 
              "type_of_attendance_code", "nesb_indicator", 
              "citizenship_indicator", "study_area", "course_level", 
              "raw_comment", "train_category"]

# Only select columns that exist in the dataframe
existing_columns = [col for col in db_columns if col in df.columns]
df = df.select(*existing_columns)

# Print final record count
print(f"Record count after preprocessing: {df.count()}")

# Save some samples for verification
sample_df = df.limit(10)
print("First 10 processed comment samples:")
for i, row in enumerate(sample_df.select("raw_comment").collect()):
    print(f"\n--- Sample {i+1} ---")
    print(row.raw_comment)

# Convert back to pandas for CSV output
print(f"\nConverting back to pandas for CSV output...")
pandas_output_df = df.toPandas()

# Use pandas to write to CSV, only use quotes for non-numeric fields
print(f"Writing data to {output_file}...")
pandas_output_df.to_csv(output_file, index=False, quoting=csv.QUOTE_NONNUMERIC, 
                        escapechar='\\')

# Optional: Create backup file, preserving original quotes
backup_file = output_file.replace('.csv', '_backup.csv')
pandas_output_df.to_csv(backup_file, index=False, quoting=csv.QUOTE_ALL)
print(f"Backup file created: {backup_file}")

# Display basic statistics
print("\nData statistics:")
print(f"Total record count: {df.count()}")
print(f"Valid comment count: {df.filter(col('raw_comment').isNotNull()).count()}")

if "train_category" in df.columns:
    print("\nCategory distribution:")
    category_counts = df.groupBy("train_category").count().collect()
    for row in category_counts:
        print(f"  {row['train_category']}: {row['count']}")

print(f"\nPreprocessing complete. Data saved to '{output_file}'")

# Stop Spark session
spark.stop()