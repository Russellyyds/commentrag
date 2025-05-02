import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8088',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds timeout
});

// Error handler helper
const handleApiError = (error) => {
  const errorResponse = {
    success: false,
    message: 'An error occurred while processing your request',
    data: null,
  };

  if (error.response) {
    // Server responded with non-2xx status
    errorResponse.message = error.response.data.message || error.response.data.detail || errorResponse.message;
    errorResponse.statusCode = error.response.status;
  } else if (error.request) {
    // Request made but no response received
    errorResponse.message = 'Unable to connect to the server';
  }

  console.error('API Error:', error);
  return errorResponse;
};

/**
 * Submit a query to the AI Agent endpoint with simplified handling
 * @param {string} comment - The comment text to analyze
 * @param {AbortSignal} signal - Optional AbortSignal for cancellation
 * @returns {Promise<Object>} - Response with classification and reasoning steps
 */
export const submitAgentQuery = async (comment, signal) => {
  try {
    // Check if this is an empty query
    if (!comment || typeof comment !== 'string' || comment.trim() === '') {
      return {
        success: false,
        message: 'Empty comment provided',
        data: null
      };
    }
    
    // Call the agent API endpoint directly (no cache)
    const response = await api.post('/rag/agent', {
      comment: comment
    }, { signal });
    
    // Return successful response
    return {
      success: true,
      message: 'Comment processed successfully with agent',
      data: response.data
    };
    
  } catch (error) {
    return handleApiError(error);
  }
};

export default {
  submitAgentQuery
};