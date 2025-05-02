import { useState, useCallback, useContext, useEffect, useRef } from 'react';
import { uploadFiles, processComments, getProjectProgress, resetProject } from './apiService';
import { ImportContext } from '../App';
import { useAppStore } from '../utils/zustandStore';
import { APP_STATES } from '../utils/stateManager';

const useDataImport = () => {
  // Get context for backward compatibility
  const { importComplete, setImportComplete, setCurrentProjectId } = useContext(ImportContext);
  
  // Use Zustand store for state management
  const appState = useAppStore(state => state.appState);
  const progress = useAppStore(state => state.progress);
  const processedComments = useAppStore(state => state.processedComments);
  const projectId = useAppStore(state => state.projectId);
  const files = useAppStore(state => state.files);
  const fileIds = useAppStore(state => state.fileIds);
  
  // Zustand actions
  const setAppState = useAppStore(state => state.setAppState);
  const setProgress = useAppStore(state => state.setProgress);
  const setProcessedComments = useAppStore(state => state.setProcessedComments);
  const setProjectId = useAppStore(state => state.setProjectId);
  const setUploadedFiles = useAppStore(state => state.setUploadedFiles);
  const setFileIds = useAppStore(state => state.setFileIds);
  const resetApplicationState = useAppStore(state => state.resetApplicationState);
  const setErrorState = useAppStore(state => state.setErrorState);
  
  // Initialize UI state based on current app state
  const [uiUploadState, setUiUploadState] = useState(() => {
    if (appState === APP_STATES.COMPLETE) {
      return 'complete';
    } else if (appState === APP_STATES.PROCESSING) {
      return 'uploading';
    } else if (appState === APP_STATES.ERROR) {
      return 'error';
    }
    return 'initial';
  });
  
  const [currentFile, setCurrentFile] = useState(0);
  const [totalFiles, setTotalFiles] = useState(() => files.length);
  const [error, setError] = useState(null);

  // Polling timer reference
  const progressPollRef = useRef(null);
  
  // Listen for app state changes
  useEffect(() => {
    const handleAppStateChange = (event) => {
      const { state } = event.detail;
      
      // Update UI upload state based on app state
      if (state === APP_STATES.COMPLETE) {
        setUiUploadState('complete');
      } else if (state === APP_STATES.PROCESSING) {
        setUiUploadState('uploading');
      } else if (state === APP_STATES.ERROR) {
        setUiUploadState('error');
      } else if (state === APP_STATES.DATA_UPLOAD || state === APP_STATES.NO_DATA) {
        setUiUploadState('initial');
      }
    };
    
    window.addEventListener('appStateChanged', handleAppStateChange);
    
    return () => {
      window.removeEventListener('appStateChanged', handleAppStateChange);
    };
  }, []);
  
  // Listen for progress changes
  useEffect(() => {
    setTotalFiles(files.length);
  }, [files]);

  // Listen for application reset
  useEffect(() => {
    const handleApplicationReset = () => {
      setUiUploadState('initial');
      setCurrentFile(0);
      setTotalFiles(0);
      setError(null);
      
      // Clear polling
      if (progressPollRef.current) {
        clearInterval(progressPollRef.current);
        progressPollRef.current = null;
      }
    };
    
    window.addEventListener('applicationReset', handleApplicationReset);
    
    return () => {
      window.removeEventListener('applicationReset', handleApplicationReset);
    };
  }, []);

  // Reset all state - uses centralized reset
  const resetState = useCallback(() => {
    setUiUploadState('initial');
    setCurrentFile(0);
    setTotalFiles(0);
    setError(null);
    
    // Update app state using Zustand
    resetApplicationState();
    
    // Clear polling
    if (progressPollRef.current) {
      clearInterval(progressPollRef.current);
      progressPollRef.current = null;
    }
  }, [resetApplicationState]);

  // Handle file upload - Fixed issue with creating new projectId when adding more files
  const handleFileUpload = useCallback(async (selectedFiles) => {
    try {
      setError(null);
      
      const currentProjectId = projectId;
      
      const newFileObjects = Array.from(selectedFiles).map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        status: 'selected', 
        progress: 0
      }));
      
      const allFiles = [...files, ...newFileObjects];
      
      // Update files in Zustand store
      setUploadedFiles(allFiles);
      
      const uploadProgressCallback = (percentCompleted) => {
        // Update progress in Zustand store
        setProgress(percentCompleted);
        
        // Update files with progress
        const updatedFiles = allFiles.map((file, index) => {
          if (index >= files.length) {
            return { ...file, progress: percentCompleted };
          }
          return file;
        });
        
        setUploadedFiles(updatedFiles);
      };
      
      const uploadResult = await uploadFiles(
        selectedFiles, 
        uploadProgressCallback,
        currentProjectId
      );
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.message || 'Upload failed');
      }
      
      const uploadedFileIds = uploadResult.data.fileIds || [];
      const uploadedProjectId = uploadResult.data.project_id;
      
      const allFileIds = [...fileIds, ...uploadedFileIds];
      
      // Update file IDs in Zustand store
      setFileIds(allFileIds);
      
      if (uploadedProjectId && !currentProjectId) {
        // Set project ID in Zustand store and context
        setProjectId(uploadedProjectId);
        setCurrentProjectId(uploadedProjectId);
        
        // Update app state to DATA_UPLOAD
        setAppState(APP_STATES.DATA_UPLOAD);
      }
      
      // Update files with 'uploaded' status
      const updatedFiles = allFiles.map((file, index) => {
        if (index >= files.length) {
          return { ...file, status: 'uploaded', progress: 100 };
        }
        return file;
      });
      
      setUploadedFiles(updatedFiles);
      
      if (uploadResult.data.total_comments) {
        const newCommentCount = uploadResult.data.total_comments;
        
        // Update processed comments in Zustand store
        setProcessedComments(newCommentCount);
      }
      
    } catch (error) {
      setError(error.message || 'Error uploading files');
      setUiUploadState('error');
      
      // Update error state in Zustand store
      setErrorState(error.message || 'Error uploading files');
      
      console.error('File upload error:', error);
    }
  }, [files, fileIds, projectId, setCurrentProjectId, setUploadedFiles, setFileIds, setProjectId, setAppState, setProgress, setProcessedComments, setErrorState]);

  // Handle processing of uploaded files
  const handleProcessFiles = useCallback(async () => {
    try {
      // Switch to processing state
      setUiUploadState('uploading');
      
      // Update app state to PROCESSING using Zustand
      setAppState(APP_STATES.PROCESSING);
      
      // Update file status to 'processing'
      const processingFiles = [...files];
      processingFiles.forEach(file => {
        file.status = 'processing';
        file.progress = 0;
      });
      
      // Update files in Zustand store
      setUploadedFiles(processingFiles);
      
      // Reset progress for processing step
      setProgress(0);
      
      // Process files using stored fileIds and projectId
      if (!fileIds.length || !projectId) {
        throw new Error('Missing file IDs or project ID for processing');
      }
      
      // Call API to start processing
      const response = await processComments(fileIds, null, projectId);
      
      if (!response.success) {
        throw new Error(response.message || 'Processing failed');
      }

      // Update file status
      const updatedFiles = [...files];
      updatedFiles.forEach(file => {
        file.status = 'processing';
        file.progress = 20; // Initial progress set to 20%
      });
      
      // Update files in Zustand store
      setUploadedFiles(updatedFiles);
      
      // Progress polling is handled by the Zustand store when appState is set to PROCESSING
      
    } catch (error) {
      setError(error.message || 'Error processing files');
      setUiUploadState('error');
      
      // Update error state in Zustand store
      setErrorState(error.message || 'Error processing files');
      
      console.error('File processing error:', error);
    }
  }, [files, fileIds, projectId, setAppState, setUploadedFiles, setProgress, setErrorState]);

  // New function to cancel processing and reset the project
  const handleCancelProcessing = useCallback(async () => {
    try {
      if (!projectId) {
        console.error('No project ID to reset');
        return;
      }
      
      // Set a temporary loading message
      setError("Cancelling processing and resetting project...");
      
      // Call the reset project API
      const result = await resetProject(projectId);
      
      if (result.success) {
        // Reset app state
        resetState();
        
        // Clear any error message
        setError(null);
      } else {
        // Set error message if reset failed
        setError(result.message || 'Failed to reset project');
        setUiUploadState('error');
      }
    } catch (error) {
      console.error('Error cancelling processing:', error);
      setError(error.message || 'Error cancelling processing');
      setUiUploadState('error');
    }
  }, [projectId, resetState]);

  // Simple implementation for manual comment entry
  const handleManualComment = useCallback(async (commentText) => {
    console.log("Manual comment submitted:", commentText);
    // Actual implementation is in ManualEntryCard.js
  }, []);

  // Handle cancel operation
  const handleCancel = useCallback(() => {
    // Reset to initial state but keep selected files
    setUiUploadState('initial');
    
    // Reset progress
    setProgress(0);
    
    // Update app state to DATA_UPLOAD using Zustand
    setAppState(APP_STATES.DATA_UPLOAD);
    
    // Update file status to 'uploaded' (ready for processing)
    const updatedFiles = [...files];
    updatedFiles.forEach(file => {
      file.status = 'uploaded';
      file.progress = 100;
    });
    
    // Update files in Zustand store
    setUploadedFiles(updatedFiles);
    
  }, [files, setAppState, setUploadedFiles, setProgress]);

  return {
    uploadState: uiUploadState,
    progress,
    processedComments,
    currentFile,
    totalFiles,
    files,
    error,
    handleFileUpload,
    handleProcessFiles,  // New separate function for processing
    handleManualComment,
    handleCancel,
    handleCancelProcessing, // New function to cancel processing and reset
    resetState,
    // Expose setters for the DataImport component
    setUploadState: (state) => {
      setUiUploadState(state);
    },
    setProgress: setProgress,
    setProcessedComments: setProcessedComments,
    setCurrentFile,
    setTotalFiles,
    setFileIds: setFileIds
  };
};

export default useDataImport;