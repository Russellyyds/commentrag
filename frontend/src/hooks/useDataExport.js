import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../utils/zustandStore';
import { getProcessedComments } from './apiService';

export const useDataExport = () => {
  const navigate = useNavigate();
  
  // Use Zustand store
  const appState = useAppStore(state => state.appState);
  const importComplete = useAppStore(state => state.importComplete);
  const currentProjectId = useAppStore(state => state.projectId);
  const checkProcessingStatus = useAppStore(state => state.checkProcessingStatus);
  const resetApplicationState = useAppStore(state => state.resetApplicationState);
  
  // Use Zustand for export preferences
  const {
    selectedComments: storedSelectedComments,
    exportFormat: storedExportFormat,
    selectedCategories: storedSelectedCategories,
    confidenceFilter: storedConfidenceFilter
  } = useAppStore(state => state.uiPreferences.dataExport);
  
  // Method to update export preferences in Zustand
  const setDataExportPreferences = useAppStore(state => state.setDataExportPreferences);
  
  // Track whether component is mounted
  const isMounted = useRef(true);
  const isInitialized = useRef(false);
  
  // Store state while avoiding unnecessary renders
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Export configuration - get initial values from Zustand
  const [selectedComments, setSelectedComments] = useState(storedSelectedComments || {});
  const [exportFormat, setExportFormat] = useState(storedExportFormat || 'csv');
  const [selectedCategories, setSelectedCategories] = useState(storedSelectedCategories || []);
  const [confidenceFilter, setConfidenceFilter] = useState(storedConfidenceFilter || 0);
  
  const [exportInProgress, setExportInProgress] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [categoryStats, setCategoryStats] = useState({});
  const [projectStatus, setProjectStatus] = useState({});
  
  // Timestamp for last processed 'processingCompleted' event
  const lastProcessingCompletedTimestamp = useRef(0);
  
  // Use refs to manage async operation states
  const operationState = useRef({
    fetchingComments: false,
    updatingExportPreferences: false,
  });
  
  // Update Zustand store with export preferences
  const updateExportPreferences = useCallback((preferences) => {
    if (operationState.current.updatingExportPreferences) return;
    
    try {
      operationState.current.updatingExportPreferences = true;
      setDataExportPreferences(preferences);
    } catch (e) {
      console.error('Error updating export preferences:', e);
    } finally {
      operationState.current.updatingExportPreferences = false;
    }
  }, [setDataExportPreferences]);
  
  // Fetch all comments
  const fetchAllComments = useCallback(async () => {
    // Prevent duplicate calls
    if (operationState.current.fetchingComments || !currentProjectId) {
      if (!currentProjectId) setIsLoading(false);
      return;
    }
    
    try {
      operationState.current.fetchingComments = true;
      setIsLoading(true);
      setError(null);
      
      // Get total count from localStorage
      const totalCommentsInStorage = parseInt(localStorage.getItem('processedComments') || '0', 10);
      const limit = totalCommentsInStorage > 0 ? totalCommentsInStorage : 1000;
      
      const response = await getProcessedComments(
        1,          // First page
        limit,      // Use reasonable size limit
        'All Tags', // Get all categories
        currentProjectId
      );
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to get comments');
      }
      
      // Don't update state if component is unmounted
      if (!isMounted.current) return;
      
      // Set comments
      setComments(response.data.comments);
      
      // Calculate category statistics from comments
      const stats = {};
      const totalComments = response.data.comments.length;
      
      // If no comments, set empty stats
      if (totalComments === 0) {
        setCategoryStats({});
        setIsLoading(false);
        operationState.current.fetchingComments = false;
        return;
      }
      
      response.data.comments.forEach(comment => {
        if (!stats[comment.category]) {
          stats[comment.category] = { count: 0, percentage: 0 };
        }
        stats[comment.category].count++;
      });
      
      // Calculate percentages
      Object.keys(stats).forEach(category => {
        stats[category].percentage = (stats[category].count / totalComments) * 100;
      });
      
      setCategoryStats(stats);
      
    } catch (error) {
      console.error('Error fetching all comments:', error);
      if (isMounted.current) {
        setError(error.message || 'Error retrieving comments');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
      operationState.current.fetchingComments = false;
    }
  }, [currentProjectId]);
  
  // Fetch project status
  const fetchProjectStatus = useCallback(async () => {
    if (!currentProjectId) return;
    
    try {
      // Use store method to check status
      const response = await checkProcessingStatus();
      
      // Don't update state if component is unmounted
      if (!isMounted.current) return;
      
      if (response && response.success) {
        setProjectStatus(response);
      }
    } catch (error) {
      console.error('Error fetching project status:', error);
    }
  }, [currentProjectId, checkProcessingStatus]);
  
  // Special effect that initializes data once on component mount
  useEffect(() => {
    // Mark component as mounted
    isMounted.current = true;
    
    // Only fetch data if import is complete and not yet initialized
    if (importComplete && !isInitialized.current) {
      console.log("DataExport: Initializing data fetch");
      isInitialized.current = true;
      fetchAllComments();
      fetchProjectStatus();
    }
    
    // Cleanup function
    return () => {
      // Mark component as unmounted
      isMounted.current = false;
    };
  }, [importComplete, fetchAllComments, fetchProjectStatus]);
  
  // Special effect to handle processing completed events - key fix point
  useEffect(() => {
    const handleProcessingCompleted = (event) => {
      // Check for duplicate events
      const timestamp = event.detail?.timestamp || Date.now();
      
      // Ignore if this event was processed recently (within 5 seconds)
      if (timestamp - lastProcessingCompletedTimestamp.current < 5000) {
        console.log("Ignoring duplicate processingCompleted event", timestamp);
        return;
      }
      
      console.log("Handling processingCompleted event", timestamp);
      lastProcessingCompletedTimestamp.current = timestamp;
      
      // If component is initialized, only update project status, not refetch comment data
      if (isInitialized.current && isMounted.current) {
        fetchProjectStatus();
      }
    };
    
    window.addEventListener('processingCompleted', handleProcessingCompleted);
    
    return () => {
      window.removeEventListener('processingCompleted', handleProcessingCompleted);
    };
  }, [fetchProjectStatus]);
  
  // Update Zustand store when selected comments change
  useEffect(() => {
    if (JSON.stringify(selectedComments) !== JSON.stringify(storedSelectedComments)) {
      updateExportPreferences({ selectedComments });
    }
  }, [selectedComments, storedSelectedComments, updateExportPreferences]);
  
  // Update Zustand store when export format changes
  useEffect(() => {
    if (exportFormat !== storedExportFormat) {
      updateExportPreferences({ exportFormat });
    }
  }, [exportFormat, storedExportFormat, updateExportPreferences]);
  
  // Update Zustand store when selected categories change
  useEffect(() => {
    if (JSON.stringify(selectedCategories) !== JSON.stringify(storedSelectedCategories)) {
      updateExportPreferences({ selectedCategories });
    }
  }, [selectedCategories, storedSelectedCategories, updateExportPreferences]);
  
  // Update Zustand store when confidence filter changes
  useEffect(() => {
    if (confidenceFilter !== storedConfidenceFilter) {
      updateExportPreferences({ confidenceFilter });
    }
  }, [confidenceFilter, storedConfidenceFilter, updateExportPreferences]);
  
  // Handle application reset
  useEffect(() => {
    const handleReset = () => {
      // Reset all states
      setSelectedComments({});
      setExportFormat('csv');
      setSelectedCategories([]);
      setConfidenceFilter(0);
      setExportInProgress(false);
      setExportError(null);
      setExportSuccess(false);
      setResetSuccess(false);
      
      // Reset initialization flag
      isInitialized.current = false;
      
      // Make sure preferences in store are synced
      updateExportPreferences({
        selectedComments: {},
        exportFormat: 'csv',
        selectedCategories: [],
        confidenceFilter: 0
      });
    };
    
    window.addEventListener('applicationReset', handleReset);
    window.addEventListener('importStatusReset', handleReset);
    
    return () => {
      window.removeEventListener('applicationReset', handleReset);
      window.removeEventListener('importStatusReset', handleReset);
    };
  }, [updateExportPreferences]);
  
  // Available categories - derived from statistics
  const availableCategories = useMemo(() => {
    if (!categoryStats || Object.keys(categoryStats).length === 0) return [];
    
    const categoriesFromStats = Object.entries(categoryStats)
      .filter(([category, stats]) => {
        return category !== "Needs Review" && stats.count > 0;
      })
      .map(([category]) => category);
    
    const hasOkCategory = categoriesFromStats.includes("OK");
    
    let sortedCategories = categoriesFromStats.filter(cat => cat !== "OK").sort();
    
    if (hasOkCategory) {
      sortedCategories.unshift("OK");
    }
    
    return sortedCategories;
  }, [categoryStats]);
  
  // Filter comments - apply filters
  const filteredComments = useMemo(() => {
    if (!comments) return [];
    
    return comments.map(comment => {
      // Check if comment passes all filters
      const passesCategory = selectedCategories.length === 0 || 
                            selectedCategories.includes(comment.category);
      const passesConfidence = comment.confidence >= confidenceFilter;
      
      // Comment is filtered if it passes all filters
      const isFiltered = passesCategory && passesConfidence;
      
      return {
        ...comment,
        isFiltered
      };
    });
  }, [comments, selectedCategories, confidenceFilter]);
  
  // Calculate filtered and selected comment counts
  const filteredCount = useMemo(() => {
    return filteredComments.filter(c => c.isFiltered).length;
  }, [filteredComments]);
  
  const selectedCount = useMemo(() => {
    return Object.values(selectedComments).filter(Boolean).length;
  }, [selectedComments]);
  
  // Selection handlers
  const handleToggleSelect = useCallback((id, isSelected) => {
    setSelectedComments(prev => {
      const newSelection = {
        ...prev,
        [id]: isSelected
      };
      
      // Sync with Zustand store
      updateExportPreferences({ selectedComments: newSelection });
      
      return newSelection;
    });
  }, [updateExportPreferences]);
  
  const handleSelectAllFiltered = useCallback(() => {
    const newSelected = { ...selectedComments };
    
    filteredComments.forEach(comment => {
      if (comment.isFiltered) {
        newSelected[comment.id] = true;
      }
    });
    
    setSelectedComments(newSelected);
    
    // Sync with Zustand store
    updateExportPreferences({ selectedComments: newSelected });
  }, [filteredComments, selectedComments, updateExportPreferences]);
  
  const handleClearAllSelection = useCallback(() => {
    setSelectedComments({});
    
    // Sync with Zustand store
    updateExportPreferences({ selectedComments: {} });
  }, [updateExportPreferences]);
  
  const areAllFilteredSelected = useMemo(() => {
    if (filteredCount === 0) return false;
    return filteredComments.every(comment => 
      !comment.isFiltered || selectedComments[comment.id]
    );
  }, [filteredComments, selectedComments, filteredCount]);
  
  const handleSelectAllToggle = useCallback((e) => {
    if (e.target.checked) {
      handleSelectAllFiltered();
    } else {
      handleClearAllSelection();
    }
  }, [handleSelectAllFiltered, handleClearAllSelection]);
  
  // Handle category filter change
  const handleCategoryFilterChange = useCallback((event) => {
    const value = event.target.value;
    setSelectedCategories(typeof value === 'string' ? value.split(',') : value);
    
    // Sync with Zustand store
    updateExportPreferences({ 
      selectedCategories: typeof value === 'string' ? value.split(',') : value 
    });
  }, [updateExportPreferences]);
  
  // Handle confidence filter change
  const handleConfidenceChange = useCallback((event, newValue) => {
    setConfidenceFilter(newValue);
    
    // Sync with Zustand store
    updateExportPreferences({ confidenceFilter: newValue });
  }, [updateExportPreferences]);
  
  // Handle export format change
  const handleFormatChange = useCallback((event) => {
    setExportFormat(event.target.value);
    
    // Sync with Zustand store
    updateExportPreferences({ exportFormat: event.target.value });
  }, [updateExportPreferences]);
  
  // Export handler
  const handleExport = useCallback(async () => {
    try {
      setExportInProgress(true);
      setExportError(null);
      setExportSuccess(false);
      
      // Get selected comment IDs
      const selectedIds = Object.entries(selectedComments)
        .filter(([_, isSelected]) => isSelected)
        .map(([id]) => parseInt(id, 10));
      
      if (selectedIds.length === 0) {
        setExportError("No comments selected for export");
        setExportInProgress(false);
        return;
      }
      
      // Build API URL
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8088';
      const exportUrl = new URL(`${apiUrl}/projects/${currentProjectId}/export`);
      
      // Add query parameters
      exportUrl.searchParams.append('format', exportFormat);
      selectedIds.forEach(id => exportUrl.searchParams.append('ids', id));
      
      // Make request
      const response = await fetch(exportUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Export failed');
      }
      
      // Handle different file formats
      let filename = `comment_export_${new Date().toISOString().slice(0, 10)}`;
      
      switch (exportFormat) {
        case 'csv':
          filename += '.csv';
          break;
        case 'tsv':
          filename += '.tsv';
          break;
        case 'excel':
          filename += '.xlsx';
          break;
        default:
          filename += '.csv';
      }
      
      // Get blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Set success state
      if (isMounted.current) {
        setExportSuccess(true);
        setTimeout(() => {
          if (isMounted.current) {
            setExportSuccess(false);
          }
        }, 3000);
      }
      
    } catch (err) {
      console.error('Export error:', err);
      if (isMounted.current) {
        setExportError(err.message || 'Error during export process');
      }
    } finally {
      if (isMounted.current) {
        setExportInProgress(false);
      }
    }
  }, [selectedComments, exportFormat, currentProjectId]);
  
  // Handle reset success
  const handleResetSuccess = useCallback(() => {
    setResetSuccess(true);
    setTimeout(() => {
      if (isMounted.current) {
        navigate('/data-import');
      }
    }, 1500);
  }, [navigate]);
  
  return {
    comments,
    isLoading,
    error,
    isRefreshing,
    selectedComments,
    exportFormat,
    selectedCategories,
    confidenceFilter,
    exportInProgress,
    exportError,
    exportSuccess,
    resetSuccess,
    categoryStats,
    projectStatus,
    availableCategories,
    filteredComments,
    filteredCount,
    selectedCount,
    areAllFilteredSelected,
    handleToggleSelect,
    handleSelectAllFiltered,
    handleClearAllSelection,
    handleSelectAllToggle,
    handleCategoryFilterChange,
    handleConfidenceChange,
    handleFormatChange,
    handleExport,
    handleResetSuccess,
    refreshComments: fetchAllComments,
    refreshStats: fetchProjectStatus
  };
};

export default useDataExport;