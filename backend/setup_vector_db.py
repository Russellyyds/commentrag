# setup_vector_db.py - Run this once to populate the vector database
import os
import pandas as pd
import chromadb
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from dotenv import load_dotenv

load_dotenv()

def setup_vector_db():
    # Initialize embedding function
    embedding_function = OpenAIEmbeddings(
        model="text-embedding-ada-002",
        openai_api_key=os.getenv("OPENAI_API_KEY")
    )
    
    # Initialize ChromaDB
    chroma_client = chromadb.PersistentClient(path="./chroma_db")
    collection = chroma_client.get_or_create_collection(name="comments_vectors")
    
    # Initialize vector store
    vector_store = Chroma(
        client=chroma_client,
        collection_name="comments_vectors",
        embedding_function=embedding_function
    )
    
    # Load data from CSV
    df = pd.read_csv('./data/data.csv')
    
    # Process comments in batches
    batch_size = 100
    documents = []
    
    print(f"Processing {len(df)} rows from data.csv...")
    
    for _, row in df.iterrows():
        # Skip empty comments
        if pd.isna(row['raw_comment']) or row['raw_comment'] == '':
            continue
            
        doc = Document(
            page_content=row['raw_comment'],
            metadata={
                "id": str(row['identification_number']),
                "category": row['train_category'] if 'train_category' in row else "Unknown"
            }
        )
        documents.append(doc)
        
        # Add documents in batches
        if len(documents) >= batch_size:
            vector_store.add_documents(documents)
            print(f"Added {len(documents)} documents to vector store")
            documents = []
    
    # Add any remaining documents
    if documents:
        vector_store.add_documents(documents)
        print(f"Added remaining {len(documents)} documents to vector store")
    
    print("Vector database setup complete.")

if __name__ == "__main__":
    setup_vector_db()