import axios from 'axios';
import { mockComments } from '../utils/categoryUtils';

// Create an axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8088',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
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
 * DataImport API Services
 */

// File upload method for DataImport component
export const uploadFiles = async (files, progressCallback, existingProjectId = null) => {
  try {
    // Create form data to handle file uploads
    const formData = new FormData();

    // Append each file to the form data
    Array.from(files).forEach((file) => {
      formData.append('files', file); // Use 'files' to match backend parameter name
    });
    
    // If an existing projectId is provided, add it to the request
    if (existingProjectId) {
      formData.append('project_id', existingProjectId);
    }

    // Make POST request with progress tracking
    const response = await api.post('/comments/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        // Call the progress callback if provided
        if (progressCallback && typeof progressCallback === 'function') {
          progressCallback(percentCompleted);
        }
      },
    });

    // Store the project_id in localStorage for later use
    if (response.data && response.data.project_id) {
      localStorage.setItem('currentProjectId', response.data.project_id);
    }

    // Also store the total number of comments for tracking
    if (response.data && response.data.total_comments) {
      localStorage.setItem('processedComments', response.data.total_comments.toString());
    }

    return {
      success: true,
      message: 'Files uploaded successfully',
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error);
  }
};

// Manual comment entry method that uses the RAG endpoint
export const submitManualComment = async (commentText) => {
  try {
    // Call the backend RAG endpoint
    const response = await api.post('/rag', {
      comment: commentText
    });

    return {
      success: true,
      message: 'Comment processed successfully',
      data: response.data
    };
  } catch (error) {
    return handleApiError(error);
  }
};

// Process uploaded comments
export const processComments = async (fileIds, progressCallback = null, projectId = null) => {
  try {
    // Get the project ID from parameter or localStorage
    const actualProjectId = projectId || localStorage.getItem('currentProjectId');
    
    if (!actualProjectId) {
      console.error("No project ID found for processing");
      throw new Error('Project ID not found');
    }
    
    console.log(`Processing comments for project ${actualProjectId}`);
    
    // Make sure fileIds is an array
    const idsToProcess = Array.isArray(fileIds) ? fileIds : [];
    
    if (idsToProcess.length === 0) {
      console.warn("No file IDs provided for processing");
    }
    
    // Call the API to start processing
    const response = await api.post('/comments/process', { 
      fileIds: idsToProcess,
      project_id: actualProjectId
    });

    console.log("Process API response:", response.data);

    return {
      success: true,
      message: 'Processing started successfully',
      data: response.data,
    };
  } catch (error) {
    console.error("Process comments error:", error);
    return handleApiError(error);
  }
};

/**
 * Integrated API - Project status and statistics
 */
export const getProjectStatusAndStats = async (projectId) => {
  try {
    // Check if using mock data
    if (!projectId || process.env.REACT_APP_USE_MOCK_DATA === 'true') {
      // Simulate response delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Calculate mock statistics
      const stats = {};
      const totalComments = mockComments.length;
      
      // Calculate comments by category
      mockComments.forEach(comment => {
        if (!stats[comment.category]) {
          stats[comment.category] = { count: 0, percentage: 0 };
        }
        stats[comment.category].count++;
      });
      
      // Calculate percentages
      Object.keys(stats).forEach(category => {
        stats[category].percentage = (stats[category].count / totalComments) * 100;
      });
      
      // Ensure we have default categories
      const defaultCategories = ["OK", "Complaint", "Cultural", "Language", "Mental Health", "Sexism", "Appearance", "Wrong Staff"];
      defaultCategories.forEach(category => {
        if (!stats[category]) {
          stats[category] = { count: 0, percentage: 0 };
        }
      });
      
      // Mock complete response
      return {
        success: true,
        message: 'Project status and stats retrieved successfully',
        data: {
          status: 'completed',
          progress: 100,
          total_comments: totalComments,
          processed_count: totalComments,
          classification_progress: 100,
          reviewed_count: Math.floor(totalComments * 0.7),
          review_progress: 70,
          has_errors: false,
          error_count: 0,
          categories: stats,
          uploaded_files_count: 3,
          uploaded_files: [
            { name: 'sample1.csv', size: 1024, last_modified: Date.now() },
            { name: 'sample2.xlsx', size: 2048, last_modified: Date.now() }
          ]
        }
      };
    }
    
    // Real API call
    const response = await api.get(`/projects/${projectId}/status`);
    
    return {
      success: true,
      message: 'Project status and stats retrieved successfully',
      data: response.data
    };
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Get project processing progress - specifically for polling
 */
export const getProjectProgress = async (projectId) => {
  try {
    // If using mock data, return simulated progress
    if (!projectId || process.env.REACT_APP_USE_MOCK_DATA === 'true') {
      // Simulate progress growth
      const currentProgress = localStorage.getItem('mockProgress') || "0";
      let progress = parseInt(currentProgress, 10);
      progress = Math.min(progress + 5, 100); // Increase by 5% each time up to 100%
      localStorage.setItem('mockProgress', progress.toString());
      
      return {
        success: true,
        message: 'Mock progress retrieved successfully',
        status: progress < 100 ? 'in_progress' : 'completed',
        progress: progress,
        has_errors: false,
        error_message: ''
      };
    }
    
    // Call the actual API
    const response = await api.get(`/projects/${projectId}/progress`);
    
    return {
      success: true,
      ...response.data
    };
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Compatibility layer - maintains old API function signatures but uses new integrated API
 */

// Get processing status (compatibility layer)
export const getProcessStatus = async (projectId) => {
  console.warn('getProcessStatus is deprecated. Use getProjectStatusAndStats instead.');
  const response = await getProjectStatusAndStats(projectId);
  
  if (!response.success) {
    return response;
  }
  
  // Convert to old API format
  return {
    success: true,
    message: 'Process status retrieved successfully',
    data: {
      project_id: projectId,
      status: response.data.status,
      progress: response.data.progress,
      processedCount: response.data.processed_count,
      totalComments: response.data.total_comments,
      hasErrors: response.data.has_errors
    }
  };
};

// Get category statistics (compatibility layer)
export const getCategoriesStats = async (projectId = null) => {
  console.warn('getCategoriesStats is deprecated. Use getProjectStatusAndStats instead.');
  
  // If project ID exists, use integrated API
  if (projectId) {
    const fullResponse = await getProjectStatusAndStats(projectId);
    if (fullResponse.success && fullResponse.data) {
      return {
        success: true,
        message: 'Categories statistics retrieved successfully',
        data: fullResponse.data.categories
      };
    }
  }
  
  // Mock statistics data (when no project ID)
  const stats = {};
  const totalComments = mockComments.length;
  
  // Calculate comments by category
  mockComments.forEach(comment => {
    if (!stats[comment.category]) {
      stats[comment.category] = { count: 0, percentage: 0 };
    }
    stats[comment.category].count++;
  });
  
  // Calculate percentages
  Object.keys(stats).forEach(category => {
    stats[category].percentage = (stats[category].count / totalComments) * 100;
  });
  
  // Ensure we have default categories
  const defaultCategories = ["OK", "Complaint", "Cultural", "Language", "Mental Health", "Sexism", "Appearance", "Wrong Staff"];
  defaultCategories.forEach(category => {
    if (!stats[category]) {
      stats[category] = { count: 0, percentage: 0 };
    }
  });
  
  return {
    success: true,
    message: 'Categories statistics retrieved successfully',
    data: stats,
  };
};

/**
 * AutoReview API Services
 */

// Get all processed comments - updated to support real project data
export const getProcessedComments = async (page = 1, limit = 20, filter = 'All Tags', projectId = null) => {
  try {
    // For development with mock data
    if (!projectId || process.env.REACT_APP_USE_MOCK_DATA === 'true') {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Filter mock comments based on category
      let filteredComments = [...mockComments];
      if (filter !== 'All Tags') {
        filteredComments = mockComments.filter(comment => 
          filter === 'Needs Review' 
            ? comment.confidence < 80 
            : comment.category === filter
        );
      }
      
      // Calculate pagination
      const totalItems = filteredComments.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = Math.min(startIndex + limit, totalItems);
      const paginatedComments = filteredComments.slice(startIndex, endIndex);
      
      return {
        success: true,
        message: 'Comments retrieved successfully',
        data: {
          comments: paginatedComments,
          pagination: {
            total: totalItems,
            page,
            limit,
            totalPages
          }
        },
      };
    }
    
    // Real API call for production
    const response = await api.get(`/projects/${projectId}/comments`, {
      params: {
        page,
        limit,
        filter
      }
    });
    
    return {
      success: true,
      message: 'Comments retrieved successfully',
      data: response.data
    };
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Reset Project API Service
 */
export const resetProject = async (projectId) => {
  try {
    // Make the API call to reset the project
    const response = await api.post(`/projects/${projectId}/reset`, {
      confirm: true
    });

    return {
      success: true,
      message: 'Project reset successfully',
      data: response.data,
    };
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Function to get comment by ID with similar comments
 */
export const getCommentById = async (commentId, projectId = null) => {
  try {
    // For development with mock data
    if (!projectId || process.env.REACT_APP_USE_MOCK_DATA === 'true') {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Find the comment in mock data
      const comment = mockComments.find(c => c.id === commentId);
      if (!comment) {
        throw new Error('Comment not found');
      }
      
      // Get similar mock comments (with same category)
      const similarComments = mockComments
        .filter(c => c.category === comment.category && c.id !== commentId)
        .slice(0, 3)
        .map(c => ({
          ...c,
          similarity: Math.floor(Math.random() * 30 + 70) / 100 // Random similarity 0.70-0.99
        }));
      
      return {
        success: true,
        message: 'Comment retrieved successfully',
        data: {
          ...comment,
          similar_comments: similarComments,
        },
      };
    }
    
    // Real API call for production - now includes similar comments
    const response = await api.get(`/projects/${projectId}/comments/${commentId}`);
    
    return {
      success: true,
      message: 'Comment retrieved successfully',
      data: response.data
    };
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Update a comment's category
 */
export const updateCommentCategory = async (commentId, category, projectId = null) => {
  try {
    // For development with mock data
    if (!projectId || process.env.REACT_APP_USE_MOCK_DATA === 'true') {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Find the comment in mock data (doesn't actually update it)
      const comment = mockComments.find(c => c.id === commentId);
      if (!comment) {
        throw new Error('Comment not found');
      }
      
      return {
        success: true,
        message: 'Comment updated successfully',
        data: {
          ...comment,
          category,
          updateStats: true // Indicate that stats should be refreshed
        },
      };
    }
    
    // Real API call for production
    const response = await api.put(`/projects/${projectId}/comments/${commentId}`, {
      category
    });
    
    return {
      success: true,
      message: 'Comment updated successfully',
      data: response.data
    };
  } catch (error) {
    return handleApiError(error);
  }
};

// Export API functions
export default {
  uploadFiles,
  submitManualComment,
  processComments,
  getProcessedComments,
  updateCommentCategory,
  getProjectStatusAndStats,
  resetProject,
  getCommentById,
  getProcessStatus,
  getCategoriesStats
};