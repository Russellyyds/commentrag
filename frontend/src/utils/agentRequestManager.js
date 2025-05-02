import { useAppStore } from './zustandStore';

// Constants
const REQUEST_TIMEOUT = 5 * 60 * 1000; // 5 minutes timeout

/**
 * Utility class for managing Agent requests across page navigation
 * Updated to use Zustand as primary storage with localStorage as fallback
 */
class AgentRequestManager {
  /**
   * Store a pending request
   * @param {string} query - The user's query
   * @param {string} requestId - A unique ID for this request
   */
  static storePendingRequest(query, requestId = null) {
    const uniqueRequestId = requestId || `req_${Date.now()}`;
    
    const pendingRequest = {
      query,
      userMessageTime: new Date().toISOString(),
      requestId: uniqueRequestId,
      isBeingProcessed: false,
      processed: false
    };
    
    // Use Zustand store as primary storage
    const store = useAppStore.getState();
    store.setPendingAgentRequest(pendingRequest);
    
    // Use localStorage as a fallback for cross-tab coordination
    localStorage.setItem('agentChatPendingRequest', JSON.stringify(pendingRequest));
    
    return uniqueRequestId;
  }
  
  /**
   * Check if there's a pending request
   * @returns {Object|null} The pending request object or null
   */
  static getPendingRequest() {
    // First try to get from Zustand store
    const store = useAppStore.getState();
    let request = store.uiPreferences.agentChat.pendingRequest;
    
    // If not in Zustand, try localStorage as fallback
    if (!request) {
      const pendingRequestStr = localStorage.getItem('agentChatPendingRequest');
      if (!pendingRequestStr) return null;
      
      try {
        request = JSON.parse(pendingRequestStr);
        // If found in localStorage but not in Zustand, update Zustand
        store.setPendingAgentRequest(request);
      } catch (e) {
        console.error('Error parsing pending request:', e);
        localStorage.removeItem('agentChatPendingRequest');
        return null;
      }
    }
    
    // Check if the request is still valid (not timed out)
    const requestTime = new Date(request.userMessageTime).getTime();
    const currentTime = new Date().getTime();
    
    if (currentTime - requestTime > REQUEST_TIMEOUT) {
      // Request is too old, clean up
      this.clearPendingRequest();
      return null;
    }
    
    // Check if this request has already been processed by comparing with the history
    const chatHistory = store.uiPreferences.agentChat.history;
    if (chatHistory && chatHistory.messages && chatHistory.messages.length > 0) {
      const isAlreadyProcessed = chatHistory.messages.some(msg => 
        msg.sender === 'user' && 
        msg.text === request.query && 
        chatHistory.messages.some(response => 
          response.sender === 'system' && 
          response.text.includes(request.query.substring(0, 20))
        )
      );
      
      if (isAlreadyProcessed) {
        // This request has already been processed and is in the chat history
        console.log('Request already processed according to chat history');
        this.clearPendingRequest();
        return null;
      }
    }
    
    // Check if this request is marked as processed
    if (request.processed) {
      console.log('Request marked as processed, removing from pending');
      this.clearPendingRequest();
      return null;
    }
    
    // Check if this request ID is in completed requests
    if (request.requestId && this.isRequestCompleted(request.requestId)) {
      console.log('Request ID found in completed requests, removing from pending');
      this.clearPendingRequest();
      return null;
    }
    
    return request;
  }
  
  /**
   * Mark a request as being processed to prevent duplicate processing
   * @returns {boolean} True if successfully marked, false if already being processed
   */
  static markRequestAsProcessing() {
    const pendingRequest = this.getPendingRequest();
    if (!pendingRequest) return false;
    
    // If already being processed, don't duplicate effort
    if (pendingRequest.isBeingProcessed) return false;
    
    // Mark as being processed
    pendingRequest.isBeingProcessed = true;
    
    // Update in Zustand
    const store = useAppStore.getState();
    store.setPendingAgentRequest(pendingRequest);
    
    // Update localStorage for cross-tab coordination
    localStorage.setItem('agentChatPendingRequest', JSON.stringify(pendingRequest));
    
    return true;
  }
  
  /**
   * Mark a request as processed but don't clear it yet
   * This allows the component to check if it was processed when it remounts
   */
  static markRequestAsProcessed() {
    const pendingRequest = this.getPendingRequest();
    if (!pendingRequest) return;
    
    // Mark as processed
    pendingRequest.processed = true;
    pendingRequest.processedTime = new Date().toISOString();
    
    // Update in Zustand
    const store = useAppStore.getState();
    store.setPendingAgentRequest(pendingRequest);
    
    // Update localStorage for cross-tab coordination
    localStorage.setItem('agentChatPendingRequest', JSON.stringify(pendingRequest));
    
    // Store the last processed timestamp
    const timestamp = Date.now().toString();
    store.setAgentLastProcessedTimestamp(timestamp);
    localStorage.setItem('agentLastProcessedTimestamp', timestamp);
  }
  
  /**
   * Clear pending request
   */
  static clearPendingRequest() {
    // Clear from Zustand
    const store = useAppStore.getState();
    store.setPendingAgentRequest(null);
    
    // Clear from localStorage
    localStorage.removeItem('agentChatPendingRequest');
  }
  
  /**
   * Check if a request has already been completed
   * @param {string} requestId - The request ID to check
   * @returns {boolean} - Whether the request has been completed
   */
  static isRequestCompleted(requestId) {
    if (!requestId) return false;
    
    try {
      // Get from Zustand first
      const store = useAppStore.getState();
      const completedRequests = store.uiPreferences.agentChat.completedRequests;
      
      if (completedRequests && completedRequests.includes(requestId)) {
        return true;
      }
      
      // Fall back to localStorage if not in Zustand
      const storedCompletedRequests = JSON.parse(localStorage.getItem('agentCompletedRequests') || '[]');
      return storedCompletedRequests.includes(requestId);
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Mark a request as completed
   * @param {string} requestId - The request ID to mark as completed
   */
  static markRequestAsCompleted(requestId) {
    if (!requestId) return;
    
    try {
      const store = useAppStore.getState();
      
      // Get current completed requests from Zustand
      const completedRequests = [...(store.uiPreferences.agentChat.completedRequests || [])];
      
      // Add to completed requests if not already there
      if (!completedRequests.includes(requestId)) {
        completedRequests.push(requestId);
        
        // Keep only the most recent 20 completed requests
        if (completedRequests.length > 20) {
          completedRequests.shift();
        }
        
        // Update in Zustand
        store.setAgentCompletedRequests(completedRequests);
        
        // Also update localStorage for cross-tab coordination
        localStorage.setItem('agentCompletedRequests', JSON.stringify(completedRequests));
      }
    } catch (e) {
      console.error('Error marking request as completed:', e);
    }
  }
  
  /**
   * Check if content already exists in chat history
   * @param {string} query - The query to check
   * @param {Object} response - The response to check
   * @returns {boolean} - Whether the content already exists
   */
  static isContentInHistory(query, response) {
    try {
      const chatHistory = useAppStore.getState().uiPreferences.agentChat.history;
      
      // If there's no chat history or no messages, it can't be a duplicate
      if (!chatHistory || !chatHistory.messages || chatHistory.messages.length === 0) {
        return false;
      }
      
      // Check if the user query exists
      const queryExists = chatHistory.messages.some(msg => 
        msg.sender === 'user' && msg.text === query
      );
      
      if (!queryExists) {
        return false;
      }
      
      // If the query exists, check if there's a response with the same category
      if (response.data && response.data.classification) {
        const category = response.data.classification.category || '';
        const confidence = response.data.classification.confidence || 0;
        
        const responseExists = chatHistory.messages.some(msg => 
          msg.sender === 'system' && 
          msg.text.includes(category) && 
          msg.text.includes(`${confidence}%`)
        );
        
        return responseExists;
      }
      
      return false;
    } catch (e) {
      console.error('Error checking if content is in history:', e);
      return false;
    }
  }
  
  /**
   * Store a successful result in Zustand
   * @param {string} query - The original query
   * @param {Object} response - The API response
   * @param {string} requestId - The request ID
   */
  static storeResult(query, response, requestId = null) {
    try {
      // Get the current chat history from Zustand
      const store = useAppStore.getState();
      const chatHistory = store.uiPreferences.agentChat.history;
      
      // Check if this response is already in the history to avoid duplication
      if (this.isContentInHistory(query, response)) {
        console.log('Response already exists in history, skipping duplication');
        this.markRequestAsProcessed(); // Mark as processed but don't clear yet
        if (requestId) {
          this.markRequestAsCompleted(requestId);
        }
        return false;
      }
      
      let messages = [...(chatHistory.messages || [])];
      let steps = [...(chatHistory.steps || [])];
      
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
      
      // Save updated history to Zustand
      store.setAgentChatHistory({
        messages,
        steps
      });
      
      // Mark as processed and completed
      this.markRequestAsProcessed();
      if (requestId) {
        this.markRequestAsCompleted(requestId);
      }
      
      return true;
    } catch (error) {
      console.error('Error storing agent result:', error);
      return false;
    }
  }
  
  /**
   * Check if we should poll for results
   * @returns {boolean} - Whether polling should be active
   */
  static shouldPoll() {
    const pendingRequest = this.getPendingRequest();
    
    // Only poll if there's a pending request that's not already being processed
    return pendingRequest && !pendingRequest.isBeingProcessed && !pendingRequest.processed;
  }
  
  /**
   * Get the last processed timestamp
   * @returns {number} - Timestamp or 0 if not available
   */
  static getLastProcessedTimestamp() {
    try {
      // First try to get from Zustand
      const store = useAppStore.getState();
      const timestamp = store.uiPreferences.agentChat.lastProcessedTimestamp;
      
      if (timestamp) {
        return timestamp;
      }
      
      // Fall back to localStorage
      const storedTimestamp = localStorage.getItem('agentLastProcessedTimestamp');
      return storedTimestamp ? parseInt(storedTimestamp, 10) : 0;
    } catch (e) {
      return 0;
    }
  }
}

export default AgentRequestManager;