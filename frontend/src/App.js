import React, { useState, useEffect, createContext, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AnimatePresence } from 'framer-motion';
import { useAppStore } from './utils/zustandStore';

import theme from './utils/theme';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import { submitAgentQuery } from './pages/agent/AgentApiService';
import AgentRequestManager from './utils/agentRequestManager';

// Create a context to share import status and project ID across components
export const ImportContext = createContext({
  importComplete: false,
  setImportComplete: () => {},
  resetImport: () => {},
  currentProjectId: null,
  setCurrentProjectId: () => {},
  checkProcessingStatus: async () => ({}),
  appState: 'no_data'
});

// Add custom CSS to ensure the application fills the viewport
const globalStyles = `
  html, body, #root {
    height: 100%;
    margin: 0;
    padding: 0;
    font-family: 'Inter', sans-serif;
    background-color: #0F172A;
    color: #F8FAFC;
  }
  
  /* Custom scrollbar for the entire app */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: #1E293B;
  }
  
  ::-webkit-scrollbar-thumb {
    background-color: #4F46E5;
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background-color: #6366F1;
  }
  
  /* Firefox scrollbar */
  * {
    scrollbar-width: thin;
    scrollbar-color: #4F46E5 #1E293B;
  }
`;

const App = () => {
  // Use Zustand store for state management
  const appState = useAppStore(state => state.appState);
  const importComplete = useAppStore(state => state.importComplete);
  const projectId = useAppStore(state => state.projectId);
  const setAppState = useAppStore(state => state.setAppState);
  const setImportComplete = useAppStore(state => state.setImportComplete);
  const setProjectId = useAppStore(state => state.setProjectId);
  const checkProcessingStatus = useAppStore(state => state.checkProcessingStatus);
  const resetApplicationState = useAppStore(state => state.resetApplicationState);
  const synchronizeWithServer = useAppStore(state => state.synchronizeWithServer);

  // Initialize state using the state manager
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Global polling system for agent requests
  const agentPollingIntervalRef = useRef(null);
  const lastPollingTimeRef = useRef(0);
  const pollingRateMs = 10000; // Reduced polling rate to 10 seconds

  // Initialize state manager when app loads
  useEffect(() => {
    const initState = async () => {
      try {
        // Synchronize with server to ensure accurate state
        await synchronizeWithServer();
        setIsInitialized(true);
      } catch (error) {
        console.error("Error initializing state:", error);
        setIsInitialized(true); // Still mark as initialized to show the UI
      }
    };
    
    initState();
  }, [synchronizeWithServer]);

  // Check processing status periodically if we have a project ID but import is not complete
  useEffect(() => {
    let intervalId;
    
    if (projectId && !importComplete && appState === 'processing') {
      // Initial check
      checkProcessingStatus();
      
      // Set up polling every 5 seconds
      intervalId = setInterval(() => {
        checkProcessingStatus();
      }, 5000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [projectId, importComplete, appState, checkProcessingStatus]);

  // Setup the agent request polling mechanism
  useEffect(() => {
    // Function to check and process pending agent requests
    const checkPendingAgentRequests = async () => {
      const pendingRequest = AgentRequestManager.getPendingRequest();
      if (!pendingRequest) return;
      
      // If this request has already been processed or is being processed, skip it
      if (pendingRequest.isBeingProcessed) return;
      
      // Check if this request ID has already been completed
      if (pendingRequest.requestId && 
          AgentRequestManager.isRequestCompleted(pendingRequest.requestId)) {
        // Clear the pending request since it's already completed
        AgentRequestManager.clearPendingRequest();
        return;
      }
      
      // Mark request as being processed to prevent duplicate processing
      if (!AgentRequestManager.markRequestAsProcessing()) {
        return; // Another poll cycle is already processing this request
      }
      
      // Throttle API calls - ensure adequate time between polling attempts
      const now = Date.now();
      if (now - lastPollingTimeRef.current < 5000) {
        return; // Don't make requests too frequently
      }
      lastPollingTimeRef.current = now;
      
      try {
        // Get the query from the pending request
        const { query, requestId } = pendingRequest;
        
        console.log('Processing pending agent request:', requestId);
        
        // Submit the query to the agent API
        const response = await submitAgentQuery(query);
        
        // Store the result in Zustand
        if (response) {
          AgentRequestManager.storeResult(query, response, requestId);
          console.log('Successfully processed agent request in background');
        }
      } catch (error) {
        console.error('Error processing pending agent request:', error);
      }
    };
    
    // Start polling mechanism if not already running
    if (!agentPollingIntervalRef.current) {
      // Initial check to catch any pending requests immediately 
      setTimeout(checkPendingAgentRequests, 500);
      
      // Set up the interval with a longer delay to reduce API load
      agentPollingIntervalRef.current = setInterval(() => {
        if (AgentRequestManager.shouldPoll()) {
          checkPendingAgentRequests();
        }
      }, pollingRateMs); // Reduced polling frequency
    }
    
    // Cleanup function
    return () => {
      if (agentPollingIntervalRef.current) {
        clearInterval(agentPollingIntervalRef.current);
        agentPollingIntervalRef.current = null;
      }
    };
  }, []);

  // Centralized reset function
  const resetImport = useCallback(() => {
    // Use the Zustand reset function
    resetApplicationState();
    
    // Dispatch event for components to respond to reset (for legacy components)
    window.dispatchEvent(new Event('importStatusReset'));
  }, [resetApplicationState]);

  // Set current project ID wrapper
  const setCurrentProjectId = useCallback((id) => {
    setProjectId(id);
  }, [setProjectId]);

  // Set import complete wrapper
  const handleSetImportComplete = useCallback((value) => {
    setImportComplete(value);
  }, [setImportComplete]);

  // Provide context values to all children
  const contextValue = {
    importComplete,
    setImportComplete: handleSetImportComplete,
    resetImport,
    currentProjectId: projectId,
    setCurrentProjectId,
    checkProcessingStatus,
    appState
  };

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <style>{globalStyles}</style>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          color: '#6366F1'
        }}>
          Loading application...
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ImportContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <style>{globalStyles}</style>
        <BrowserRouter>
          <AnimatePresence mode="wait">
            <Routes>
              {/* Homepage route */}
              <Route path="/" element={<HomePage />} />
              
              {/* Use Layout component for app routes */}
              <Route path="/*" element={<Layout />} />
            </Routes>
          </AnimatePresence>
        </BrowserRouter>
      </ThemeProvider>
    </ImportContext.Provider>
  );
};

export default App;