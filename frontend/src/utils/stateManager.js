/**
 * Central state management system for the AI Comment Analysis application
 * Updated with Zustand integration while maintaining backward compatibility
 */

import { APP_STATES, useAppStore, STORAGE_KEYS } from './zustandStore';
import { getProjectProgress } from '../hooks/apiService';

// Re-export APP_STATES and STORAGE_KEYS for compatibility
export { APP_STATES, STORAGE_KEYS };

/**
 * Check if the app state is valid and consistent.
 * Returns the current state of the application.
 */
export const getCurrentAppState = () => {
  return useAppStore.getState().getCurrentAppState();
};

/**
 * Check processing status with the server
 * Returns the response or null if error
 */
export const checkProcessingStatus = async () => {
  // Get project ID from store state
  const projectId = useAppStore.getState().projectId;
  if (!projectId) return null;
  
  try {
    // Call the store method but with additional state transition logic
    const response = await useAppStore.getState().checkProcessingStatus();
    
    // Explicit double-check for 100% progress to ensure transition to complete
    if (response && (response.status === 'completed' || response.progress >= 100)) {
      console.log("checkProcessingStatus: Processing is complete, updating state...");
      useAppStore.getState().setAppState(APP_STATES.COMPLETE);
      useAppStore.getState().setImportComplete(true);
    }
    
    return response;
  } catch (error) {
    console.error("Error in checkProcessingStatus:", error);
    return null;
  }
};

/**
 * Start polling for progress updates
 * This is a global function that should be called when processing starts
 */
export const startProgressPolling = () => {
  return useAppStore.getState().startProgressPolling();
};

/**
 * Stop progress polling
 */
export const stopProgressPolling = () => {
  useAppStore.getState().stopProgressPolling();
};

/**
 * Synchronize app state with the server
 * Helps resolve ambiguous state after reload/restart
 */
export const synchronizeWithServer = async () => {
  const projectId = useAppStore.getState().projectId;
  
  if (!projectId) {
    // If no project ID, we can't sync with server
    useAppStore.getState().setAppState(APP_STATES.NO_DATA);
    return APP_STATES.NO_DATA;
  }
  
  try {
    // Check project status with server
    const response = await getProjectProgress(projectId);
    
    if (!response.success) {
      console.error("Error syncing with server:", response.message);
      return getCurrentAppState() || APP_STATES.ERROR;
    }
    
    // Update progress in state manager
    useAppStore.getState().setProgress(response.progress);
    
    // Determine state based on server response
    if (response.status === 'completed') {
      useAppStore.getState().setAppState(APP_STATES.COMPLETE);
      useAppStore.getState().setImportComplete(true);
      return APP_STATES.COMPLETE;
    } else if (response.status === 'in_progress') {
      useAppStore.getState().setAppState(APP_STATES.PROCESSING);
      // Start polling for progress updates
      useAppStore.getState().startProgressPolling();
      return APP_STATES.PROCESSING;
    } else if (response.status === 'error') {
      useAppStore.getState().setAppState(APP_STATES.ERROR);
      return APP_STATES.ERROR;
    } else {
      // Unknown status
      console.warn("Unknown status from server:", response.status);
      return getCurrentAppState() || APP_STATES.NO_DATA;
    }
  } catch (error) {
    console.error("Error during server synchronization:", error);
    return getCurrentAppState() || APP_STATES.ERROR;
  }
};

/**
 * Set the application state
 * @param {string} state - One of APP_STATES values
 */
export const setAppState = (state) => {
  useAppStore.getState().setAppState(state);
};

/**
 * Set import complete status
 * @param {boolean} isComplete 
 */
export const setImportComplete = (isComplete) => {
  useAppStore.getState().setImportComplete(isComplete);
};

/**
 * Update progress value
 * @param {number} value - Progress percentage (0-100)
 */
export const setProgress = (value) => {
  useAppStore.getState().setProgress(value);
};

/**
 * Set current project ID
 * @param {string} projectId 
 */
export const setProjectId = (projectId) => {
  useAppStore.getState().setProjectId(projectId);
};

/**
 * Set uploaded files
 * @param {Array} files - Array of file objects
 */
export const setUploadedFiles = (files) => {
  useAppStore.getState().setUploadedFiles(files);
};

/**
 * Set file IDs
 * @param {Array} ids - Array of file IDs
 */
export const setFileIds = (ids) => {
  useAppStore.getState().setFileIds(ids);
};

/**
 * Set processed comments count
 * @param {number} count 
 */
export const setProcessedComments = (count) => {
  useAppStore.getState().setProcessedComments(count);
};

/**
 * Set review-related state
 * @param {Object} reviewData 
 */
export const setReviewState = (reviewData) => {
  useAppStore.getState().setReviewState(reviewData);
};

/**
 * Clear review state
 */
export const clearReviewState = () => {
  useAppStore.getState().clearReviewState();
};

/**
 * Reset the application state completely
 * This is the central reset function that should be used by all components
 */
export const resetApplicationState = () => {
  useAppStore.getState().resetApplicationState();
  return APP_STATES.NO_DATA;
};

/**
 * Set error state with optional error message
 * @param {string} errorMessage 
 */
export const setErrorState = (errorMessage) => {
  useAppStore.getState().setErrorState(errorMessage);
};

/**
 * Set stats expanded state
 * @param {string} section - 'global' or 'filtered'
 * @param {boolean} isExpanded - Whether the section is expanded
 */
export const setStatsExpanded = (section, isExpanded) => {
  useAppStore.getState().setStatsExpanded(section, isExpanded);
};

/**
 * Get stats expanded state
 * @param {string} section - 'global' or 'filtered'
 * @returns {boolean} - Whether the section is expanded
 */
export const getStatsExpanded = (section) => {
  return useAppStore.getState().uiPreferences.statsExpanded[section];
};

/**
 * Set agent chat history
 * @param {Object} history - Chat history object with messages and steps
 */
export const setAgentChatHistory = (history) => {
  useAppStore.getState().setAgentChatHistory(history);
};

/**
 * Get agent chat history
 * @returns {Object} - Chat history object with messages and steps
 */
export const getAgentChatHistory = () => {
  return useAppStore.getState().uiPreferences.agentChat.history;
};

/**
 * Clear agent chat history
 */
export const clearAgentChatHistory = () => {
  useAppStore.getState().clearAgentChatHistory();
};

/**
 * Set auto review preferences
 * @param {Object} preferences - Auto review preferences object
 */
export const setAutoReviewPreferences = (preferences) => {
  useAppStore.getState().setAutoReviewPreferences(preferences);
};

/**
 * Get auto review preferences
 * @returns {Object} - Auto review preferences object
 */
export const getAutoReviewPreferences = () => {
  return useAppStore.getState().uiPreferences.autoReview;
};

/**
 * Set data export preferences
 * @param {Object} preferences - Data export preferences object
 */
export const setDataExportPreferences = (preferences) => {
  useAppStore.getState().setDataExportPreferences(preferences);
};

/**
 * Get data export preferences
 * @returns {Object} - Data export preferences object
 */
export const getDataExportPreferences = () => {
  return useAppStore.getState().uiPreferences.dataExport;
};

/**
 * Get state from localStorage with fallback value
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key not found
 */
export const getStorageItem = (key, defaultValue = null) => {
  return useAppStore.getState().getStorageItem(key, defaultValue);
};

/**
 * Get parsed JSON from localStorage with fallback
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key not found or invalid JSON
 */
export const getParsedStorageItem = (key, defaultValue = null) => {
  return useAppStore.getState().getParsedStorageItem(key, defaultValue);
};

/**
 * Check if application state is consistent
 * Returns true if consistent, false otherwise
 */
export const checkStateConsistency = () => {
  const store = useAppStore.getState();
  const appState = store.appState;
  const importComplete = store.importComplete;
  
  if (!appState) {
    // If no app state, we can't check consistency
    return false;
  }
  
  if (appState === APP_STATES.COMPLETE) {
    return importComplete === true;
  }
  
  if (appState === APP_STATES.PROCESSING ||
      appState === APP_STATES.DATA_UPLOAD || 
      appState === APP_STATES.NO_DATA) {
    return importComplete !== true;
  }
  
  return false;
};

/**
 * Fix state inconsistencies
 */
export const fixStateInconsistencies = () => {
  const appState = getCurrentAppState();
  setAppState(appState); // This will sync related states
  return appState;
};

/**
 * Initialize checks for state consistency
 */
export const initializeStateManager = async () => {
  const store = useAppStore.getState();
  const appState = store.appState;
  
  if (!appState || !checkStateConsistency()) {
    console.log("Application state inconsistent, fixing...");
    const currentState = getCurrentAppState();
    
    if (currentState === null) {
      // Need server verification
      return await synchronizeWithServer();
    }
    
    return fixStateInconsistencies();
  }
  
  // If we're in PROCESSING state, ensure polling is active
  if (appState === APP_STATES.PROCESSING) {
    const lastPollingTimestamp = localStorage.getItem(STORAGE_KEYS.LAST_POLLING_TIMESTAMP);
    const currentTime = Date.now();
    
    // If polling wasn't active in the last 5 seconds, restart it
    if (!lastPollingTimestamp || (currentTime - parseInt(lastPollingTimestamp, 10)) > 5000) {
      store.startProgressPolling();
    }
  }
  
  return appState;
};