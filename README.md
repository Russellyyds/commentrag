# AI Comment Analysis & Moderation System

A comprehensive comment analysis platform using RAG (Retrieval-Augmented Generation) and LLM technologies to automatically classify, moderate, and analyze user comments.

## ⚠️ Important: OpenAI API Key Notice

Due to development reasons, the provided OpenAI API key is only intended for testing purposes.  
To avoid token shortages and ensure the system operates smoothly, **you must use your own OpenAI API key** if you wish to build the system database yourself.  
You need to replace the API key in **two places**:
- The `.env` file in the **project root directory**
- The `.env` file in the **backend directory**

## ⚡ Important: Initialize Vector Database First

Before you run the system with either setup method, you **must first initialize the vector database**. This step is required when:

1. The `backend/chroma_db` directory is empty or doesn't exist
2. You want to use your own custom data for classification

To initialize or update the vector database:

```bash
cd backend
python setup_vector_db.py
```

**Using Custom Data:**
If you want to use your own data for classification:
1. Prepare your data in Excel format and name it `data.xlsx`
2. Place it in the `backend` directory
3. Run the preprocessing script:
   ```bash
   python data_preprocessing.py
   ```
4. This will create a cleaned `data.csv` file in the `backend`  move it into `backend/data`
5. Then run `setup_vector_db.py` to initialize the vector database with your data

### Prerequisites

- Python 3.8+ (Backend)
- Node.js 14+ (Frontend)
- Docker and Docker Compose (for containerized deployment)
- OpenAI API key

### Option 1: Docker Setup (Recommended)

This approach uses Docker to containerize both frontend and backend services.

1. Create a `.env` file in the project root with your OpenAI API key:
   ```env
   OPENAI_API_KEY=your_openai_api_key
   ```

2. Initialize the vector database as described in the prerequisite section above

3. Build and start containers:
   ```bash
   docker-compose up --build -d
   ```

4. Access the web application at [http://localhost:3000](http://localhost:3000)

### Option 2: Manual Setup

If you prefer to run services directly on your machine:

#### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate   # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file with required variables:
   ```env
   OPENAI_API_KEY=your_openai_api_key
   UPLOAD_DIR=./uploads
   PORT=8088
   ```

5. Initialize the vector database:
   ```bash
   python setup_vector_db.py
   ```

6. Start the backend server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8088 --reload
   ```

#### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file for API configuration:
   ```env
   REACT_APP_API_URL=http://localhost:8088
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Access the application at [http://localhost:3000](http://localhost:3000)

## 🌟 Team
This project was developed by the 25T1-COMP9900-F16a-AVACADO Group at UNSW:

- **Project Manager**: Xiaotong Zhang
- **Scrum Master**: Xuanzhi Liu
- **Developers**: Hang Pan, Zhongwei Yang, Jianhong Liu, Yinglong Cui
- **Tutor**: Vinayak Kuanr

## 📋 System Overview

The AI Comment Analysis & Moderation System automates the classification and moderation of user comments through advanced NLP techniques. It helps content moderators efficiently process large volumes of comments by automatically categorizing them and flagging potentially problematic content for review.

### Key Features

- **Automatic Classification**: Categorizes comments into predefined categories (OK, Complaint, Cultural, Language, Mental Health, Sexism, Appearance, Wrong Staff)
- **Confidence Scoring**: Quantifies classification certainty to identify comments requiring human review
- **RAG Technology**: Leverages retrieval-augmented generation for context-aware analysis
- **AI Agent Analysis**: Uses a multi-step reasoning approach with specialized tools for complex comments
- **Similar Comment Detection**: Identifies patterns across comments to improve classification
- **Multilingual Support**: Detects and translates non-English content
- **Interactive Review Interface**: Modern UI for manual review of uncertain cases
- **Batch Processing**: Efficiently handles large datasets 
- **Export Functionality**: Export classified comments in various formats (CSV, TSV, Excel)

## 🔧 System Architecture

The system follows a client-server architecture with these major components:

1. **Frontend**: React.js application with Material UI and Framer Motion
2. **Backend**: FastAPI server with integrated ML models
3. **Vector Database**: ChromaDB for efficient similarity search
4. **LLM Integration**: OpenAI models (GPT-3.5, GPT-4) for analysis
5. **Embedding Cache**: Optimized caching system to reduce API costs and improve performance

### Prerequisites

- Python 3.8+ (Backend)
- Node.js 14+ (Frontend)
- Docker and Docker Compose (for containerized deployment)
- OpenAI API key

## 🧩 System Components & Workflow

### Data Import

The system supports various file formats:
- CSV/TSV files
- Excel spreadsheets (.xlsx, .xls)
- JSON files

Comments can also be entered manually for one-off analysis.

### Processing Pipeline

1. **Data Preprocessing**: 
   - Text normalization and cleaning
   - Character encoding standardization
   - Language detection and translation if needed

2. **Classification Process**:
   - Vectorization and similarity search
   - Context gathering from similar comments
   - LLM-based classification with confidence scoring
   - AI agent multi-step reasoning for complex cases

3. **Review Process**:
   - Auto-approval for high-confidence classifications
   - Manual review queue for uncertain classifications
   - Batch approval capabilities

4. **Data Export**:
   - Filtered export options
   - Multiple format support
   - Custom field selection

### Advanced AI Agent Analysis

The system incorporates a specialized AI agent that:
- Selects and applies appropriate analytical tools
- Performs multi-step reasoning
- Detects sensitive keywords and emotional tones
- Extracts key entities and concepts
- Provides detailed explanations for classifications

## 🎮 Using the System

1. **Data Import Page**: Upload files or enter comments manually
2. **Auto Review Page**: View automated classification results
3. **Manual Review Page**: Review and update uncertain classifications
4. **Export Page**: Filter and export processed data

### Classification Categories

The system categorizes comments into:
- **OK**: Neutral or positive comments
- **Complaint**: Expressions of dissatisfaction
- **Cultural**: References to cultural aspects or insensitivity
- **Language**: Inappropriate language or profanity
- **Mental Health**: References to mental health concerns
- **Sexism**: Gender-based discriminatory content
- **Appearance**: Comments on physical appearance
- **Wrong Staff**: Incorrectly directed comments

## 🔍 API Documentation

The backend exposes several RESTful endpoints:

### Core Endpoints

- `POST /comments/upload`: Upload comment files
- `POST /comments/process`: Process uploaded comments
- `GET /projects/{project_id}/status`: Get processing status
- `GET /projects/{project_id}/comments`: Retrieve processed comments
- `PUT /projects/{project_id}/comments/{comment_id}`: Update comment category
- `GET /projects/{project_id}/export`: Export comments

### Analysis Endpoints

- `POST /rag`: Analyze a single comment with the base RAG model
- `POST /rag/agent`: Analyze a comment with the advanced AI agent

## 🛠️ Performance Optimization

The system implements several optimizations:
- **Embedding Cache**: Reduces redundant API calls
- **Batch Processing**: Efficiently processes comments in parallel
- **Progressive Loading**: UI remains responsive during processing
- **Vector Database**: Enables fast similarity searches

## 🧪 Troubleshooting

### Common Issues

- **API Key Errors**: Ensure your OpenAI API key is valid and has sufficient credit
- **Vector Database Errors**: Try deleting the `chroma_db` directory and rerunning `setup_vector_db.py`
- **Memory Issues**: For large datasets, increase Docker container memory limits or process in smaller batches
- **Cache Errors**: Clear the embedding cache if experiencing classification inconsistencies

### Performance Tips

- Use small test files before processing large datasets
- For datasets >10,000 comments, consider splitting into multiple projects
- Ensure good internet connectivity for API calls to OpenAI

## 🔧 Customization

### Custom Categories

1. Modify `DEFAULT_CATEGORIES` in `backend/rag.py`
2. Update category definitions in `frontend/src/utils/categoryUtils.js`
3. Restart both frontend and backend services

### LLM Prompts

The system's analysis capabilities can be customized by modifying:
- Basic classification prompt in `backend/rag.py`
- Advanced agent prompts in `backend/agent.py`

## 🔒 Security and Privacy

- The system does not permanently store OpenAI API responses
- Uploaded files are stored locally in the `uploads` directory
- No user authentication is implemented in this version

## 📊 Future Enhancements

Potential areas for extension:
- Custom classification model training
- Additional language support
- User authentication and role-based access
- Real-time comment processing
- Integration with content management systems

## 📞 Support and Contact

For issues, questions, or contributions:
- **Project Manager**: Hang Pan
- **Technical Support**: Hang Pan

## 📄 License

This project is provided for educational purposes. Please refer to the included license file for usage terms.
