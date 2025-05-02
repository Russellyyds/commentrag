import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { getProjectProgress } from '../hooks/apiService';

// Define application states (same as the original stateManager)
export const APP_STATES = {
  NO_DATA: 'no_data',           // No data uploaded yet
  DATA_UPLOAD: 'data_upload',   // Data uploaded but not processed
  PROCESSING: 'processing',     // Data is being processed
  COMPLETE: 'complete',         // Processing complete, ready for review
  ERROR: 'error'                // Error state
};

// Define storage keys (for compatibility and persistence)
export const STORAGE_KEYS = {
  APP_STATE: 'appState',
  UPLOAD_PROGRESS: 'uploadProgress',
  PROCESSED_COMMENTS: 'processedComments',
  UPLOAD_FILES: 'uploadedFiles',
  UPLOAD_FILE_IDS: 'uploadedFileIds',
  CURRENT_PROJECT_ID: 'currentProjectId',
  IMPORT_COMPLETE: 'importComplete',
  TOTAL_FILES: 'uploadTotalFiles',
  CURRENT_FILE: 'uploadCurrentFile',
  LAST_RESET: 'lastResetTimestamp',
  REVIEW_COMMENTS_LIST: 'reviewCommentsList',
  REVIEW_CATEGORY: 'reviewCategory',
  REVIEW_LIST_INDEX: 'reviewListIndex',
  REVIEW_TOTAL_COUNT: 'reviewTotalCount',
  MOCK_PROGRESS: 'mockProgress',
  STATS_EXPANDED_GLOBAL: 'statsExpandedGlobal',
  STATS_EXPANDED_FILTERED: 'statsExpandedFiltered',
  LAST_POLLING_TIMESTAMP: 'lastPollingTimestamp'
};

// Helper function to dispatch custom events (for backward compatibility)
const dispatchCustomEvent = (eventName, detail) => {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
};

// Create the Zustand store with persistence middleware
export const useAppStore = create(
  persist(
    (set, get) => ({
      // Core state
      appState: APP_STATES.NO_DATA,
      importComplete: false,
      projectId: null,
      progress: 0,
      processedComments: 0,
      files: [],
      fileIds: [],
      
      // Review state
      reviewState: {
        commentsList: [],
        category: '',
        index: 0,
        totalCount: 0
      },
      
      // UI preferences state (NEW)
      uiPreferences: {
        statsExpanded: {
          global: localStorage.getItem('statsExpandedGlobal') !== 'false', // default to true
          filtered: localStorage.getItem('statsExpandedFiltered') !== 'false' // default to true
        },
        agentChat: {
          history: JSON.parse(localStorage.getItem('agentChatHistory') || '{"messages":[],"steps":[]}'),
          lastUpdated: 0,
          isPolling: false,
          pendingRequest: null,
          completedRequests: JSON.parse(localStorage.getItem('agentCompletedRequests') || '[]'),
          lastProcessedTimestamp: parseInt(localStorage.getItem('agentLastProcessedTimestamp') || '0', 10)
        },
        autoReview: {
          currentPage: parseInt(localStorage.getItem('autoReviewCurrentPage') || '1', 10),
          pageSize: parseInt(localStorage.getItem('autoReviewPageSize') || '20', 10),
          selectedCategory: localStorage.getItem('autoReviewSelectedCategory') || 'All Tags'
        },
        dataExport: {
          selectedComments: JSON.parse(localStorage.getItem('exportSelectedComments') || '{}'),
          exportFormat: localStorage.getItem('exportFormat') || 'csv',
          selectedCategories: JSON.parse(localStorage.getItem('exportSelectedCategories') || '[]'),
          confidenceFilter: parseInt(localStorage.getItem('exportConfidenceFilter') || '0', 10)
        }
      },
      
      // Additional state
      errorMessage: null,
      pollingTimer: null,
      
      // UI PREFERENCES ACTIONS (NEW)
      setStatsExpanded: (section, isExpanded) => {
        set(state => ({
          uiPreferences: {
            ...state.uiPreferences,
            statsExpanded: {
              ...state.uiPreferences.statsExpanded,
              [section]: isExpanded
            }
          }
        }));
        
        // Keep localStorage updated for backward compatibility
        localStorage.setItem(`statsExpanded${section.charAt(0).toUpperCase() + section.slice(1)}`, isExpanded.toString());
      },
      
      // Updated setAgentChatHistory method
        setAgentChatHistory: (history) => {
            set(state => ({
            uiPreferences: {
                ...state.uiPreferences,
                agentChat: {
                ...state.uiPreferences.agentChat,
                history,
                lastUpdated: Date.now() // Add timestamp to track recency
                }
            }
            }));
            
            // Keep localStorage updated for backward compatibility
            localStorage.setItem('agentChatHistory', JSON.stringify(history));
        },
        
        // Method to check if a request is in progress
        isAgentRequestInProgress: () => {
            const pendingRequest = localStorage.getItem('agentChatPendingRequest');
            if (!pendingRequest) return false;
            
            try {
            const { userMessageTime } = JSON.parse(pendingRequest);
            const requestTime = new Date(userMessageTime).getTime();
            const currentTime = new Date().getTime();
            const fiveMinutesInMs = 5 * 60 * 1000;
            
            // Only consider recent requests (within last 5 minutes)
            return (currentTime - requestTime < fiveMinutesInMs);
            } catch (e) {
            console.error('Error checking agent request status:', e);
            return false;
            }
        },
        
        // Method to store the response directly to Zustand
        storeAgentResponse: (query, response) => {
            const state = get();
            const currentHistory = state.uiPreferences.agentChat.history;
            let messages = [...(currentHistory.messages || [])];
            let steps = [...(currentHistory.steps || [])];
            
            // Make sure the user message exists
            const userMessageExists = messages.some(msg => 
            msg.sender === 'user' && msg.text === query
            );
            
            if (!userMessageExists) {
            messages = [...messages, { text: query, sender: 'user' }];
            }
            
            // Process response and add system message
            if (response.success && response.data) {
            // Use classification results
            const classification = response.data.classification || {};
            const reasoning = response.data.reasoning_steps || [];
            
            // Update reasoning steps
            steps = reasoning;
            
            // Add response message
            const category = classification.category || "Unknown";
            const confidence = classification.confidence || 0;
            
            // Create response text with consistent formatting
            let responseText = `I've analyzed your comment and categorized it as "${category}" with ${confidence}% confidence.`;
            
            // Add reasoning if available
            if (classification.reasoning) {
                responseText += `\n\nReasoning: ${classification.reasoning}`;
            }
            
            // Add keywords if available
            if (classification.keywords && classification.keywords.length > 0) {
                responseText += `\n\nKey phrases: ${classification.keywords.join(', ')}`;
            }
            
            // Add similar comment information if exists
            if (response.data.similar_comments && response.data.similar_comments.length > 0) {
                responseText += "\n\nSimilar comments:";
                response.data.similar_comments.forEach((similar, index) => {
                responseText += `\n\n${index + 1}. "${similar.comment}" (${Math.round(similar.similarity * 100)}% similarity, Category: ${similar.category})`;
                });
            }
            
            // Add system message
            messages = [...messages, { 
                text: responseText,
                sender: 'system' 
            }];
            } else {
            // Handle error
            messages = [...messages, { 
                text: `Error: ${response.message || 'Failed to process your comment with AI Agent'}`,
                sender: 'system' 
            }];
            }
            
            // Save updated history using the existing method
            state.setAgentChatHistory({
            messages,
            steps
            });
        },
      
      clearAgentChatHistory: () => {
        const emptyHistory = { messages: [], steps: [] };
        set(state => ({
          uiPreferences: {
            ...state.uiPreferences,
            agentChat: {
              ...state.uiPreferences.agentChat,
              history: emptyHistory
            }
          }
        }));
        
        // Keep localStorage updated for backward compatibility
        localStorage.setItem('agentChatHistory', JSON.stringify(emptyHistory));
      },
      
      setAutoReviewPreferences: (preferences) => {
        set(state => ({
          uiPreferences: {
            ...state.uiPreferences,
            autoReview: {
              ...state.uiPreferences.autoReview,
              ...preferences
            }
          }
        }));
        
        // Keep localStorage updated for backward compatibility
        if (preferences.currentPage !== undefined) {
          localStorage.setItem('autoReviewCurrentPage', String(preferences.currentPage));
        }
        if (preferences.pageSize !== undefined) {
          localStorage.setItem('autoReviewPageSize', String(preferences.pageSize));
        }
        if (preferences.selectedCategory !== undefined) {
          localStorage.setItem('autoReviewSelectedCategory', preferences.selectedCategory);
        }
      },
      
      setDataExportPreferences: (preferences) => {
        set(state => ({
          uiPreferences: {
            ...state.uiPreferences,
            dataExport: {
              ...state.uiPreferences.dataExport,
              ...preferences
            }
          }
        }));
        
        // Keep localStorage updated for backward compatibility
        if (preferences.selectedComments !== undefined) {
          localStorage.setItem('exportSelectedComments', JSON.stringify(preferences.selectedComments));
        }
        if (preferences.exportFormat !== undefined) {
          localStorage.setItem('exportFormat', preferences.exportFormat);
        }
        if (preferences.selectedCategories !== undefined) {
          localStorage.setItem('exportSelectedCategories', JSON.stringify(preferences.selectedCategories));
        }
        if (preferences.confidenceFilter !== undefined) {
          localStorage.setItem('exportConfidenceFilter', String(preferences.confidenceFilter));
        }
      },
      
      // SET APP STATE
      setAppState: (state) => {
        const prevState = get().appState;
        
        if (!Object.values(APP_STATES).includes(state)) {
          console.error(`Invalid app state: ${state}`);
          return;
        }
        
        set({ appState: state });
        
        // Handle side effects based on state transition
        if (state === APP_STATES.COMPLETE) {
          set({ importComplete: true });
          get().stopProgressPolling();
        } else if (state === APP_STATES.PROCESSING) {
          set({ importComplete: false });
          // Start polling if transitioning to processing
          if (prevState !== APP_STATES.PROCESSING) {
            get().startProgressPolling();
          }
        } else if (state === APP_STATES.ERROR) {
          get().stopProgressPolling();
        } else if (state === APP_STATES.DATA_UPLOAD) {
          set({ importComplete: false });
          get().stopProgressPolling();
        } else if (state === APP_STATES.NO_DATA) {
          set({ 
            importComplete: false,
            projectId: null
          });
          get().stopProgressPolling();
        }
        
        // Dispatch event for backward compatibility
        dispatchCustomEvent('appStateChanged', { state, previousState: prevState });
        
        // Update localStorage for old code still using it directly
        localStorage.setItem(STORAGE_KEYS.APP_STATE, state);
        
        // LEGACY COMPATIBILITY: Update old state variables
        if (state === APP_STATES.COMPLETE) {
          localStorage.setItem('uploadState', 'complete');
          localStorage.setItem('uploadStateData', 'complete'); 
          localStorage.setItem(STORAGE_KEYS.IMPORT_COMPLETE, 'true');
        } else if (state === APP_STATES.PROCESSING) {
          localStorage.setItem('uploadState', 'uploading');
          localStorage.setItem('uploadStateData', 'uploading');
          localStorage.setItem(STORAGE_KEYS.IMPORT_COMPLETE, 'false');
        } else if (state === APP_STATES.ERROR) {
          localStorage.setItem('uploadState', 'error');
          localStorage.setItem('uploadStateData', 'error');
        } else if (state === APP_STATES.DATA_UPLOAD) {
          localStorage.setItem('uploadState', 'initial');
          localStorage.setItem('uploadStateData', 'initial');
          localStorage.setItem(STORAGE_KEYS.IMPORT_COMPLETE, 'false');
        } else if (state === APP_STATES.NO_DATA) {
          localStorage.setItem('uploadState', 'initial');
          localStorage.setItem('uploadStateData', 'initial');
          localStorage.setItem(STORAGE_KEYS.IMPORT_COMPLETE, 'false');
        }
      },
      
      // SET IMPORT COMPLETE
      setImportComplete: (isComplete) => {
        const wasComplete = get().importComplete;
        
        set({ importComplete: isComplete });
        
        if (isComplete) {
          // Ensure consistent state
          set({ appState: APP_STATES.COMPLETE });
          
          // Transition from processing to complete - dispatch special event
          if (!wasComplete) {
            dispatchCustomEvent('processingCompleted', {
              projectId: get().projectId,
              timestamp: Date.now()
            });
          }
        } else if (get().appState === APP_STATES.COMPLETE) {
          // If transitioning away from COMPLETE, set to DATA_UPLOAD
          set({ appState: APP_STATES.DATA_UPLOAD });
        }
        
        // Dispatch event for backward compatibility
        dispatchCustomEvent('importCompleteChanged', { isComplete, wasComplete });
        
        // Update localStorage for compatibility
        localStorage.setItem(STORAGE_KEYS.IMPORT_COMPLETE, isComplete ? 'true' : 'false');
      },
      
      // SET PROGRESS
      setProgress: (value) => {
        const previousProgress = get().progress;
        
        set({ progress: value });
        
        // Check if progress reaches 100% and we're in PROCESSING state
        // This helps ensure the transition to complete state
        if (value >= 100 && get().appState === APP_STATES.PROCESSING) {
          console.log("Progress reached 100%, checking completion status with server");
          // Force a status check to confirm completion with server
          setTimeout(() => get().checkProcessingStatus(), 500);
        }
        
        // Dispatch event for backward compatibility
        dispatchCustomEvent('progressChanged', { progress: value, previousProgress });
        
        // Update localStorage for compatibility
        localStorage.setItem(STORAGE_KEYS.UPLOAD_PROGRESS, String(value));
      },
      
      // SET PROJECT ID
      setProjectId: (projectId) => {
        const previousId = get().projectId;
        
        set({ projectId });
        
        // Dispatch event for backward compatibility
        dispatchCustomEvent('projectIdChanged', { projectId, previousId });
        
        // Update localStorage for compatibility
        if (projectId) {
          localStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT_ID, projectId);
        } else {
          localStorage.removeItem(STORAGE_KEYS.CURRENT_PROJECT_ID);
        }
      },
      
      // SET UPLOADED FILES
      setUploadedFiles: (files) => {
        set({ files });
        
        // If state is NO_DATA and we have files, update to DATA_UPLOAD
        if (files && files.length > 0 && get().appState === APP_STATES.NO_DATA) {
          get().setAppState(APP_STATES.DATA_UPLOAD);
        }
        
        // Dispatch event for backward compatibility
        dispatchCustomEvent('uploadedFilesChanged', { files });
        
        // Update localStorage for compatibility
        if (files && files.length > 0) {
          localStorage.setItem(STORAGE_KEYS.UPLOAD_FILES, JSON.stringify(files));
          localStorage.setItem(STORAGE_KEYS.TOTAL_FILES, String(files.length));
        } else {
          localStorage.removeItem(STORAGE_KEYS.UPLOAD_FILES);
          localStorage.removeItem(STORAGE_KEYS.TOTAL_FILES);
        }
      },
      
      // SET FILE IDS
      setFileIds: (ids) => {
        set({ fileIds: ids });
        
        // Update localStorage for compatibility
        if (ids && ids.length > 0) {
          localStorage.setItem(STORAGE_KEYS.UPLOAD_FILE_IDS, JSON.stringify(ids));
        } else {
          localStorage.removeItem(STORAGE_KEYS.UPLOAD_FILE_IDS);
        }
      },
      
      // SET PROCESSED COMMENTS
      setProcessedComments: (count) => {
        set({ processedComments: count });
        
        // Dispatch event for backward compatibility
        dispatchCustomEvent('processedCommentsChanged', { count });
        
        // Update localStorage for compatibility
        if (count > 0) {
          localStorage.setItem(STORAGE_KEYS.PROCESSED_COMMENTS, String(count));
        } else {
          localStorage.removeItem(STORAGE_KEYS.PROCESSED_COMMENTS);
        }
      },
      
      // SET REVIEW STATE
      setReviewState: (reviewData) => {
        set({ reviewState: reviewData });
        
        // Dispatch event for backward compatibility
        dispatchCustomEvent('reviewStateChanged', reviewData);
        
        // Update localStorage for compatibility
        if (reviewData.commentsList && reviewData.commentsList.length > 0) {
          localStorage.setItem(STORAGE_KEYS.REVIEW_COMMENTS_LIST, JSON.stringify(reviewData.commentsList));
          localStorage.setItem(STORAGE_KEYS.REVIEW_CATEGORY, reviewData.category || "All Tags");
          localStorage.setItem(STORAGE_KEYS.REVIEW_LIST_INDEX, String(reviewData.index || 0));
          localStorage.setItem(STORAGE_KEYS.REVIEW_TOTAL_COUNT, String(reviewData.totalCount || reviewData.commentsList.length));
        }
      },
      
      // CLEAR REVIEW STATE
      clearReviewState: () => {
        set({ 
          reviewState: {
            commentsList: [],
            category: '',
            index: 0,
            totalCount: 0
          }
        });
        
        // Dispatch event for backward compatibility
        dispatchCustomEvent('reviewStateCleared');
        
        // Update localStorage for compatibility
        localStorage.removeItem(STORAGE_KEYS.REVIEW_COMMENTS_LIST);
        localStorage.removeItem(STORAGE_KEYS.REVIEW_CATEGORY);
        localStorage.removeItem(STORAGE_KEYS.REVIEW_LIST_INDEX);
        localStorage.removeItem(STORAGE_KEYS.REVIEW_TOTAL_COUNT);
      },
      
      // SET ERROR STATE
      setErrorState: (errorMessage) => {
        // Stop polling on error
        get().stopProgressPolling();
        
        set({ 
          appState: APP_STATES.ERROR,
          errorMessage
        });
        
        // Update localStorage for compatibility
        if (errorMessage) {
          localStorage.setItem('lastErrorMessage', errorMessage);
        }
        
        // Dispatch error event
        dispatchCustomEvent('applicationError', { error: errorMessage });
      },
      
      // PROGRESS POLLING
      startProgressPolling: () => {
        // Stop any existing polling
        get().stopProgressPolling();
        
        // Update last polling timestamp
        localStorage.setItem(STORAGE_KEYS.LAST_POLLING_TIMESTAMP, Date.now().toString());
        
        // Start new polling timer (every 2 seconds)
        const timer = setInterval(async () => {
          await get().checkProcessingStatus();
        }, 2000);
        
        set({ pollingTimer: timer });
      },
      
      stopProgressPolling: () => {
        const timer = get().pollingTimer;
        if (timer) {
          clearInterval(timer);
          set({ pollingTimer: null });
        }
      },

      setPendingAgentRequest: (pendingRequest) => {
        set(state => ({
          uiPreferences: {
            ...state.uiPreferences,
            agentChat: {
              ...state.uiPreferences.agentChat,
              pendingRequest
            }
          }
        }));
      },
      
      setAgentCompletedRequests: (completedRequests) => {
        set(state => ({
          uiPreferences: {
            ...state.uiPreferences,
            agentChat: {
              ...state.uiPreferences.agentChat,
              completedRequests
            }
          }
        }));
        
        // Update localStorage for persistence
        localStorage.setItem('agentCompletedRequests', JSON.stringify(completedRequests));
      },
      
      setAgentLastProcessedTimestamp: (timestamp) => {
        const numTimestamp = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
        
        set(state => ({
          uiPreferences: {
            ...state.uiPreferences,
            agentChat: {
              ...state.uiPreferences.agentChat,
              lastProcessedTimestamp: numTimestamp
            }
          }
        }));
        
        // Update localStorage for persistence
        localStorage.setItem('agentLastProcessedTimestamp', numTimestamp.toString());
      },
      
      toggleAgentPolling: (isPolling) => {
        set(state => ({
          uiPreferences: {
            ...state.uiPreferences,
            agentChat: {
              ...state.uiPreferences.agentChat,
              isPolling
            }
          }
        }));
      },
      
      checkProcessingStatus: async () => {
        const projectId = get().projectId;
        if (!projectId) return null;
        
        try {
          // Check project status with server
          const response = await getProjectProgress(projectId);
          if (!response.success) return null;
          
          // Update progress
          get().setProgress(response.progress);
          
          // Important fix: Add state check to avoid triggering completion events repeatedly
          const currentAppState = get().appState;
          const currentImportComplete = get().importComplete;
          
          // Only trigger state transition when current state is not COMPLETE and progress reaches 100%
          if ((response.status === 'completed' || response.progress >= 100) && 
              (currentAppState !== APP_STATES.COMPLETE || !currentImportComplete)) {
            
            console.log(`State transition: From ${currentAppState} to COMPLETE, progress=${response.progress}`);
            
            // Explicitly set app state first, then set importComplete
            get().setAppState(APP_STATES.COMPLETE);
            get().setImportComplete(true);
            
            // Only trigger event when state transition actually occurs
            if (currentAppState !== APP_STATES.COMPLETE || !currentImportComplete) {
              dispatchCustomEvent('processingCompleted', {
                projectId,
                timestamp: Date.now()
              });
            }
            
            // Stop polling
            get().stopProgressPolling();
          }
          
          return response;
        } catch (error) {
          console.error("Error checking processing status:", error);
          return null;
        }
      },
      
      // RESET APPLICATION STATE
      resetApplicationState: () => {
        const timestamp = Date.now();
        
        // Stop polling
        get().stopProgressPolling();
        
        // Reset state
        set({
          appState: APP_STATES.NO_DATA,
          importComplete: false,
          projectId: null,
          progress: 0,
          processedComments: 0,
          files: [],
          fileIds: [],
          reviewState: {
            commentsList: [],
            category: '',
            index: 0,
            totalCount: 0
          },
          errorMessage: null,
          // Preserve UI preferences or reset them if needed
          uiPreferences: {
            ...get().uiPreferences,
            // Reset certain UI preferences that should be cleared on app reset
            dataExport: {
              selectedComments: {},
              exportFormat: 'csv',
              selectedCategories: [],
              confidenceFilter: 0
            }
          }
        });
        
        // For backward compatibility: clear all localStorage
        Object.values(STORAGE_KEYS).forEach(key => {
          localStorage.removeItem(key);
        });
        
        // Additional items not in STORAGE_KEYS
        localStorage.removeItem('autoReviewCurrentPage');
        localStorage.removeItem('autoReviewPageSize');
        localStorage.removeItem('autoReviewSelectedCategory');
        localStorage.removeItem('exportSelectedComments');
        localStorage.removeItem('exportFormat');
        localStorage.removeItem('exportSelectedCategories');
        localStorage.removeItem('exportConfidenceFilter');
        
        // Set initial state for compatibility
        localStorage.setItem(STORAGE_KEYS.APP_STATE, APP_STATES.NO_DATA);
        localStorage.setItem('uploadState', 'initial');
        localStorage.setItem('uploadStateData', 'initial');
        localStorage.setItem(STORAGE_KEYS.IMPORT_COMPLETE, 'false');
        localStorage.setItem(STORAGE_KEYS.LAST_RESET, String(timestamp));
        
        // Dispatch reset event
        dispatchCustomEvent('applicationReset', { timestamp });
      },

      // SERVER SYNCHRONIZATION METHOD
      synchronizeWithServer: async () => {
        const projectId = get().projectId;
        
        if (!projectId) {
          // If no project ID, we can't sync with server
          get().setAppState(APP_STATES.NO_DATA);
          return APP_STATES.NO_DATA;
        }
        
        try {
          // Check project status with server
          const response = await getProjectProgress(projectId);
          
          if (!response.success) {
            console.error("Error syncing with server:", response.message);
            return get().appState || APP_STATES.ERROR;
          }
          
          // Update progress in state manager
          get().setProgress(response.progress);
          
          // Determine state based on server response
          if (response.status === 'completed' || response.progress >= 100) {
            get().setAppState(APP_STATES.COMPLETE);
            get().setImportComplete(true);
            return APP_STATES.COMPLETE;
          } else if (response.status === 'in_progress') {
            get().setAppState(APP_STATES.PROCESSING);
            // Start polling for progress updates
            get().startProgressPolling();
            return APP_STATES.PROCESSING;
          } else if (response.status === 'error') {
            get().setAppState(APP_STATES.ERROR);
            return APP_STATES.ERROR;
          } else {
            // Unknown status
            console.warn("Unknown status from server:", response.status);
            return get().appState || APP_STATES.NO_DATA;
          }
        } catch (error) {
          console.error("Error during server synchronization:", error);
          return get().appState || APP_STATES.ERROR;
        }
      },
      
      // HELPER METHODS FOR STATE ACCESS
      getCurrentAppState: () => get().appState,
      
      getStorageItem: (key, defaultValue = null) => {
        // First try to get from Zustand state
        const state = get();
        
        // Map storage keys to state properties
        const keyMapping = {
          [STORAGE_KEYS.APP_STATE]: 'appState',
          [STORAGE_KEYS.IMPORT_COMPLETE]: 'importComplete',
          [STORAGE_KEYS.CURRENT_PROJECT_ID]: 'projectId',
          [STORAGE_KEYS.UPLOAD_PROGRESS]: 'progress',
          [STORAGE_KEYS.PROCESSED_COMMENTS]: 'processedComments',
          [STORAGE_KEYS.UPLOAD_FILES]: 'files',
          [STORAGE_KEYS.UPLOAD_FILE_IDS]: 'fileIds',
          // Add more mappings as needed
        };
        
        // If key is in our mapping and exists in state, return it
        if (keyMapping[key] && state[keyMapping[key]] !== undefined) {
          const value = state[keyMapping[key]];
          return typeof value === 'string' ? value : JSON.stringify(value);
        }
        
        // Fallback to localStorage for compatibility
        const value = localStorage.getItem(key);
        return value === null ? defaultValue : value;
      },
      
      getParsedStorageItem: (key, defaultValue = null) => {
        try {
          const value = get().getStorageItem(key);
          if (value === null) return defaultValue;
          return JSON.parse(value);
        } catch (error) {
          console.error(`Error parsing item: ${key}`, error);
          return defaultValue;
        }
      }
    }),
    {
      name: 'ai-comment-analyzer-storage',
      storage: createJSONStorage(() => localStorage),
      // Specify which parts of state to persist
      partialize: (state) => ({
        appState: state.appState,
        importComplete: state.importComplete,
        projectId: state.projectId,
        progress: state.progress,
        processedComments: state.processedComments,
        files: state.files,
        fileIds: state.fileIds,
        reviewState: state.reviewState,
        uiPreferences: state.uiPreferences
      })
    }
  )
);