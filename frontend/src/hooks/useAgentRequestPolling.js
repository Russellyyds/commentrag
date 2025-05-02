import { useState, useEffect, useRef } from 'react';
import AgentRequestManager from '../utils/agentRequestManager';
import { submitAgentQuery } from '../pages/agent/AgentApiService';

/**
 * Custom hook to handle agent request polling with rate limiting
 * @returns {Object} Hook state and methods
 */
export const useAgentRequestPolling = () => {
  const [isPending, setIsPending] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const lastCheckTimeRef = useRef(0);
  const pollingIntervalRef = useRef(null);
  
  // Check for pending requests and their status
  const checkPendingRequests = () => {
    const pendingRequest = AgentRequestManager.getPendingRequest();
    setIsPending(!!pendingRequest);
    return pendingRequest;
  };
  
  // Process any pending request with rate limiting
  const processPendingRequest = async () => {
    // Don't process if we're already polling
    if (isPolling) return false;
    
    const pendingRequest = checkPendingRequests();
    if (!pendingRequest) return false;
    
    // If this request has already been processed or is being processed, skip it
    if (pendingRequest.isBeingProcessed) return false;
    
    // Check if this request ID has already been completed
    if (pendingRequest.requestId && 
        AgentRequestManager.isRequestCompleted(pendingRequest.requestId)) {
      // Clear the pending request since it's already completed
      AgentRequestManager.clearPendingRequest();
      setIsPending(false);
      return true;
    }
    
    // Implement rate limiting - make sure we don't poll too frequently
    const now = Date.now();
    if (now - lastCheckTimeRef.current < 5000) {
      return false; // Too soon to poll again
    }
    
    // Mark request as being processed to prevent duplicate processing
    if (!AgentRequestManager.markRequestAsProcessing()) {
      return false; // Another poll cycle is already processing this request
    }
    
    lastCheckTimeRef.current = now;
    
    try {
      setIsPolling(true);
      
      // Extract request details
      const { query, requestId } = pendingRequest;
      
      // Submit the query to get a response
      const response = await submitAgentQuery(query);
      
      // Store the result in Zustand
      if (response) {
        AgentRequestManager.storeResult(query, response, requestId);
        
        // Update state
        setIsPending(false);
        
        return true;
      }
    } catch (error) {
      console.error('Error processing pending request:', error);
      // Don't mark request as failed - let it be retried
    } finally {
      setIsPolling(false);
    }
    
    return false;
  };
  
  // Set up polling on mount
  useEffect(() => {
    // Check for pending requests immediately
    checkPendingRequests();
    
    // Set up the polling interval - reduced frequency to prevent overloading
    const intervalId = setInterval(() => {
      // Only initiate polling if there's a pending request and we're not already polling
      if (AgentRequestManager.shouldPoll() && !isPolling) {
        processPendingRequest();
      }
    }, 10000); // Reduced frequency to once every 10 seconds
    
    pollingIntervalRef.current = intervalId;
    
    // Listen for storage events (for cross-tab coordination)
    const handleStorageChange = (e) => {
      if (e.key === 'agentChatPendingRequest') {
        checkPendingRequests();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Clean up on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isPolling]);
  
  return {
    isPending,
    isPolling,
    checkPendingRequests,
    processPendingRequest
  };
};

export default useAgentRequestPolling;