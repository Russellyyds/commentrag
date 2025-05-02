import { useState, useEffect, useCallback } from 'react';
import { 
  getProcessedComments, 
  getProjectStatusAndStats
} from './apiService';
import { useAppStore } from '../utils/zustandStore';
import { APP_STATES } from '../utils/stateManager';

const useAutoReview = (projectId = null) => {
  // Use Zustand store for state management
  const appState = useAppStore(state => state.appState);
  const importComplete = useAppStore(state => state.importComplete);
  const currentProjectId = useAppStore(state => state.projectId);
  const checkProcessingStatus = useAppStore(state => state.checkProcessingStatus);
  
  // Get UI preferences from Zustand store
  const {
    currentPage: storedCurrentPage,
    pageSize: storedPageSize,
    selectedCategory: storedSelectedCategory
  } = useAppStore(state => state.uiPreferences.autoReview);
  
  // Update UI preferences in Zustand
  const setAutoReviewPreferences = useAppStore(state => state.setAutoReviewPreferences);
  
  // Local state for component-specific data
  const [comments, setComments] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(storedSelectedCategory);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(storedCurrentPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  const [pageSize, setPageSize] = useState(storedPageSize);
  const [confidenceThreshold, setConfidenceThreshold] = useState(80);
  const [categoryStats, setCategoryStats] = useState({});
  const [projectStatus, setProjectStatus] = useState({
    status: '',
    progress: 0,
    has_errors: false
  });

  // Determine if we should use mock data
  const shouldUseMockData = !projectId || process.env.REACT_APP_USE_MOCK_DATA === 'true';
  
  // Use effective project ID (from props or store)
  const effectiveProjectId = projectId || currentProjectId;

  // Fetch project status and statistics (integrated)
  const fetchProjectStatusAndStats = useCallback(async () => {
    if (!effectiveProjectId) return;
    
    try {
      setError(null);
      const response = await getProjectStatusAndStats(effectiveProjectId);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch project data');
      }
      
      // Update stats with format conversion
      if (response.data.categories) {
        // Get raw category counts
        const rawCategories = response.data.categories;
        // Calculate total comments
        const totalCommentsCount = response.data.total_comments || 
          Object.values(rawCategories).reduce((sum, value) => {
            // If value is an object with count, use that
            const count = typeof value === 'object' && value.count ? value.count : value;
            return sum + count;
          }, 0);
        
        setTotalComments(totalCommentsCount);
        
        // Convert to expected format
        const formattedCategories = {};
        Object.entries(rawCategories).forEach(([category, value]) => {
          // If value is an object with count, use that
          const count = typeof value === 'object' && value.count ? value.count : value;
          formattedCategories[category] = {
            count: count,
            percentage: totalCommentsCount > 0 ? (count / totalCommentsCount) * 100 : 0
          };
        });
        
        // Fetch "Needs Review" count separately
        try {
          const needsReviewResponse = await getProcessedComments(
            1, // First page
            1, // One item per page (we just need the count)
            'Needs Review',
            effectiveProjectId
          );
          
          if (needsReviewResponse.success) {
            const needsReviewCount = needsReviewResponse.data.pagination.total || 0;
            
            formattedCategories["Needs Review"] = {
              count: needsReviewCount,
              percentage: totalCommentsCount > 0 ? 
                (needsReviewCount / totalCommentsCount) * 100 : 0
            };
          }
        } catch (error) {
          console.error('Error fetching Needs Review count:', error);
          // Continue without this stat
        }
        
        setCategoryStats(formattedCategories);
      }
      
      // Update project status
      setProjectStatus({
        status: response.data.status || '',
        progress: response.data.progress || 0,
        has_errors: response.data.has_errors || false,
      });
      
      // Update total comments
      if (response.data.total_comments) {
        setTotalComments(response.data.total_comments);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching project data:', error);
      // Avoid blocking UI, just log the error
      return null;
    }
  }, [effectiveProjectId]);

  // Fetch comments - check project status first
  const fetchComments = useCallback(async () => {
    if (!effectiveProjectId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // First get project status
      const statusData = await fetchProjectStatusAndStats();
      
      // Skip fetching comments if project is processing
      if (statusData && statusData.status === 'in_progress') {
        setIsLoading(false);
        setComments([]);
        return;
      }
      
      // Otherwise get comments
      setError(null);
      const response = await getProcessedComments(
        currentPage, 
        pageSize, 
        selectedCategory,
        effectiveProjectId
      );
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch comments');
      }
      
      setComments(response.data.comments);
      setTotalPages(response.data.pagination.totalPages || 1);
      setTotalComments(response.data.pagination.total || 0);
      
      // Save state to Zustand
      setAutoReviewPreferences({
        currentPage,
        pageSize,
        selectedCategory
      });
      
    } catch (error) {
      console.error('Error fetching comments:', error);
      setError(error.message || 'Error fetching comments');
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, selectedCategory, effectiveProjectId, fetchProjectStatusAndStats, setAutoReviewPreferences]);

  // Force refresh comments - exposed for external use
  const refreshComments = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get comments with current filters
      setError(null);
      const response = await getProcessedComments(
        currentPage, 
        pageSize, 
        selectedCategory,
        effectiveProjectId
      );
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to refresh comments');
      }
      
      setComments(response.data.comments);
      setTotalPages(response.data.pagination.totalPages || 1);
      setTotalComments(response.data.pagination.total || 0);
      
    } catch (error) {
      console.error('Error refreshing comments:', error);
      setError(error.message || 'Error refreshing comments');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, selectedCategory, effectiveProjectId]);

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    
    // Update in Zustand store
    setAutoReviewPreferences({
      currentPage: newPage
    });
  };

  // Handle category filter change
  const handleCategoryChange = (event) => {
    const newCategory = event.target.value;
    setSelectedCategory(newCategory);
    setCurrentPage(1); // Reset to first page on filter change
    
    // Update in Zustand store
    setAutoReviewPreferences({
      selectedCategory: newCategory,
      currentPage: 1
    });
  };

  // Listen for state changes
  useEffect(() => {
    const handleStateChange = () => {
      if (importComplete && appState === APP_STATES.COMPLETE) {
        fetchComments();
      }
    };
    
    window.addEventListener('appStateChanged', handleStateChange);
    window.addEventListener('importCompleteChanged', handleStateChange);
    
    return () => {
      window.removeEventListener('appStateChanged', handleStateChange);
      window.removeEventListener('importCompleteChanged', handleStateChange);
    };
  }, [importComplete, appState, fetchComments]);

  // Initial load and state updates
  useEffect(() => {
    if (importComplete) {
      fetchComments();
    }
  }, [importComplete, fetchComments]);
  
  // Status polling interval - for processing projects
  useEffect(() => {
    let intervalId;
    
    if (importComplete && effectiveProjectId) {
      // Initial status fetch
      fetchProjectStatusAndStats();
      
      // Set refresh interval based on status
      const refreshInterval = projectStatus.status === 'in_progress' ? 5000 : 15000;
      
      intervalId = setInterval(() => {
        fetchProjectStatusAndStats().then(data => {
          // Fetch comments if processing just completed
          if (data && data.status === 'completed' && projectStatus.status === 'in_progress') {
            fetchComments();
          }
        });
      }, refreshInterval);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [importComplete, effectiveProjectId, projectStatus.status, fetchProjectStatusAndStats, fetchComments]);

  // Listen for app state changes (particularly important during resets)
  useEffect(() => {
    const handleReset = () => {
      setComments([]);
      setCategoryStats({});
      setProjectStatus({
        status: '',
        progress: 0,
        has_errors: false
      });
      setCurrentPage(1);
      
      // Update in Zustand store
      setAutoReviewPreferences({
        currentPage: 1
      });
    };
    
    window.addEventListener('applicationReset', handleReset);
    window.addEventListener('importStatusReset', handleReset);
    
    return () => {
      window.removeEventListener('applicationReset', handleReset);
      window.removeEventListener('importStatusReset', handleReset);
    };
  }, [setAutoReviewPreferences]);

  // Handle processing completed event
  useEffect(() => {
    const handleProcessingCompleted = () => {
      fetchProjectStatusAndStats();
      fetchComments();
    };
    
    window.addEventListener('processingCompleted', handleProcessingCompleted);
    
    return () => {
      window.removeEventListener('processingCompleted', handleProcessingCompleted);
    };
  }, [fetchProjectStatusAndStats, fetchComments]);

  // Handle changing the page size
  const handlePageSizeChange = useCallback((size) => {
    setPageSize(size);
    
    // Update in Zustand store
    setAutoReviewPreferences({
      pageSize: size
    });
  }, [setAutoReviewPreferences]);

  return {
    comments,
    isLoading,
    error,
    currentPage,
    totalPages,
    totalComments,
    pageSize,
    selectedCategory,
    confidenceThreshold,
    categoryStats,
    projectStatus,
    handlePageChange,
    handleCategoryChange,
    setPageSize: handlePageSizeChange,
    refreshStats: fetchProjectStatusAndStats,
    refreshComments,
    usingMockData: shouldUseMockData
  };
};

export default useAutoReview;