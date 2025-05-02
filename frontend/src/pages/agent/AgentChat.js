import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Card,
  CardContent,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  alpha,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Button
} from '@mui/material';
import { motion } from 'framer-motion';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import DeleteIcon from '@mui/icons-material/Delete';
import ChatMessageList from '../../components/chat/ChatMessageList';
import ChatInput from '../../components/chat/ChatInput';
import { submitAgentQuery } from './AgentApiService';
import { useAppStore } from '../../utils/zustandStore';
import AgentRequestManager from '../../utils/agentRequestManager';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      duration: 0.3,
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  }
};

const animatedBorderStyle = {
  '@keyframes gradientAnimation': {
    '0%': { backgroundPosition: '0% 50%' },
    '50%': { backgroundPosition: '100% 50%' },
    '100%': { backgroundPosition: '0% 50%' },
  },
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  opacity: 0.5,
  pointerEvents: 'none',
  zIndex: 0,
  background: 'linear-gradient(90deg, rgba(139, 92, 246, 0) 0%, rgba(139, 92, 246, 0.3) 50%, rgba(139, 92, 246, 0) 100%)',
  backgroundSize: '200% 200%',
  animation: 'gradientAnimation 8s ease infinite',
  willChange: 'background-position',
  transform: 'translateZ(0)',
};

const AgentChat = ({ sx = {} }) => {
  // Use Zustand for chat state management
  const chatHistory = useAppStore(state => state.uiPreferences.agentChat.history);
  const pendingRequest = useAppStore(state => state.uiPreferences.agentChat.pendingRequest);
  const setAgentChatHistory = useAppStore(state => state.setAgentChatHistory);
  const clearAgentChatHistory = useAppStore(state => state.clearAgentChatHistory);
  const setPendingAgentRequest = useAppStore(state => state.setPendingAgentRequest);
  
  // Local state for UI management
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showReasoning, setShowReasoning] = useState(true);
  
  // Local state derived from Zustand store
  const [chatMessages, setChatMessages] = useState([]);
  const [reasoningSteps, setReasoningSteps] = useState([]);
  
  // Use a ref to track if component is mounted
  const isMounted = useRef(true);
  const abortControllerRef = useRef(null);
  const lastRequestTimeRef = useRef(null);
  
  // Update local state from Zustand on mount
  useEffect(() => {
    // Set mount status
    isMounted.current = true;
    
    // Create a new AbortController
    abortControllerRef.current = new AbortController();
    
    // Load chat history from Zustand
    const messages = chatHistory.messages || [];
    const steps = chatHistory.steps || [];
    setChatMessages(messages);
    setReasoningSteps(steps);
    
    // Check for pending request
    checkForPendingRequest();
    
    // Cleanup function
    return () => {
      isMounted.current = false;
      
      // Abort any in-progress fetch requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [chatHistory]);
  
  // Check for any pending requests on component mount
  const checkForPendingRequest = async () => {
    // Get pending request from AgentRequestManager, which now uses Zustand with localStorage fallback
    const pendingRequest = AgentRequestManager.getPendingRequest();
    
    if (pendingRequest) {
      try {
        const { query, userMessageTime, requestId, processed } = pendingRequest;
        
        // Check if it's a recent request (within last 5 minutes)
        const requestTime = new Date(userMessageTime).getTime();
        const currentTime = new Date().getTime();
        const fiveMinutesInMs = 5 * 60 * 1000;
        
        // Check if this request has already been processed
        const lastProcessedTimestamp = AgentRequestManager.getLastProcessedTimestamp();
        const wasProcessedAfterRequest = lastProcessedTimestamp > requestTime;
        
        // IMPROVED DUPLICATE DETECTION:
        // Check more thoroughly if the response is already in the chat history
        const responseExists = chatMessages.some(msg => 
          msg.sender === 'system' && msg.text.includes(query.substring(0, 20))
        );
        
        const queryExists = chatMessages.some(msg => 
          msg.sender === 'user' && msg.text === query
        );
        
        if (processed || wasProcessedAfterRequest || (queryExists && responseExists)) {
          // This request has already been processed, clean it up
          console.log('Request already processed, clearing');
          AgentRequestManager.clearPendingRequest();
          return;
        }
        
        // Only process if the request is recent
        if (currentTime - requestTime < fiveMinutesInMs) {
          // Check if the user message already exists in chat history
          const userMessageExists = chatMessages.some(msg => 
            msg.sender === 'user' && msg.text === query
          );
          
          // Only add the user message if it doesn't already exist
          if (!userMessageExists) {
            setChatMessages(prev => [...prev, { text: query, sender: 'user' }]);
          }
          
          setIsLoading(true);
          lastRequestTimeRef.current = requestTime;
          
          // Try to fetch the response again
          completePendingRequest(query, requestId);
        } else {
          // Request is too old, clean up
          AgentRequestManager.clearPendingRequest();
        }
      } catch (e) {
        console.error('Error processing pending request:', e);
        AgentRequestManager.clearPendingRequest();
      }
    }
  };
  
  // Update Zustand whenever chat messages or reasoning steps change
  useEffect(() => {
    if (!isLoading && (chatMessages.length > 0 || reasoningSteps.length > 0)) {
      setAgentChatHistory({
        messages: chatMessages,
        steps: reasoningSteps
      });
    }
  }, [chatMessages, reasoningSteps, isLoading, setAgentChatHistory]);
  
  // Function to complete a pending request (called on mount or after send)
  const completePendingRequest = async (query, requestId = null) => {
    // Check if this query is already in the chat history with a response
    const queryExists = chatMessages.some(msg => 
      msg.sender === 'user' && msg.text === query
    );
    
    const responseExists = chatMessages.some(msg => 
      msg.sender === 'system' && msg.text.includes(query.substring(0, 20))
    );
    
    if (queryExists && responseExists) {
      console.log('Query and response already exist in chat history, skipping processing');
      AgentRequestManager.clearPendingRequest();
      setIsLoading(false);
      return;
    }
    
    // If there's an ongoing request, abort it
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
    }
    
    try {
      // Create an ID for this request if not provided
      const thisRequestId = requestId || `req_${Date.now()}`;
      
      // Call API to process the comment with Agent
      const response = await submitAgentQuery(query);
      
      // Handle component unmounted during request
      if (!isMounted.current) {
        console.log("Component unmounted during request, saving result to Zustand");
        saveChatResult(query, response);
        // Remove pending request
        AgentRequestManager.clearPendingRequest();
        return;
      }
      
      if (response.success && response.data) {
        // Use classification results
        const classification = response.data.classification || {};
        const reasoning = response.data.reasoning_steps || [];
        
        // Update reasoning steps
        setReasoningSteps(reasoning);
        
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
        
        // Update chat messages with the user message and system response
        setChatMessages(prev => {
          // Make sure we still have the user message
          const userMessageExists = prev.some(msg => 
            msg.sender === 'user' && msg.text === query
          );
          
          const baseMessages = userMessageExists ? prev : [{ text: query, sender: 'user' }];
          
          // Check if this response already exists to avoid duplicates
          const responseExists = baseMessages.some(msg =>
            msg.sender === 'system' && 
            msg.text.includes(category) && 
            msg.text.includes(`${confidence}%`)
          );
          
          if (responseExists) {
            console.log('Response already exists in messages, no update needed');
            return baseMessages;
          }
          
          return [...baseMessages, { 
            text: responseText,
            sender: 'system' 
          }];
        });
      } else {
        // Handle error
        setChatMessages(prev => {
          // Make sure we still have the user message
          const userMessageExists = prev.some(msg => 
            msg.sender === 'user' && msg.text === query
          );
          
          const baseMessages = userMessageExists ? prev : [{ text: query, sender: 'user' }];
          
          return [...baseMessages, { 
            text: `Error: ${response.message || 'Failed to process your comment with AI Agent'}`,
            sender: 'system' 
          }];
        });
      }
      
      // Mark request as processed
      AgentRequestManager.markRequestAsProcessed();
      
      // Clear pending request
      AgentRequestManager.clearPendingRequest();
      
      // Mark the request as completed
      if (requestId) {
        AgentRequestManager.markRequestAsCompleted(requestId);
      }
    } catch (error) {
      // Handle abort errors gracefully
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        console.error('Error processing comment with agent:', error);
        setChatMessages(prev => {
          // Make sure we still have the user message
          const userMessageExists = prev.some(msg => 
            msg.sender === 'user' && msg.text === query
          );
          
          const baseMessages = userMessageExists ? prev : [{ text: query, sender: 'user' }];
          
          return [...baseMessages, { 
            text: "Sorry, there was an error processing your comment with the AI Agent. Please try again later.",
            sender: 'system' 
          }];
        });
        
        // Remove pending request on error
        AgentRequestManager.clearPendingRequest();
      }
    } finally {
      // Only update loading state if component is still mounted
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };
  
  // Function to save chat result when component is unmounted
  const saveChatResult = (query, response) => {
    // Use AgentRequestManager to handle storing the result
    AgentRequestManager.storeResult(query, response);
  };

  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      // Generate a unique request ID
      const requestId = `req_${Date.now()}`;
      
      // Create a new AbortController for this request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      // Clear previous chat history when starting a new query
      // This ensures we only keep one comment-response pair at a time
      const userMessage = { text: newMessage, sender: 'user' };
      setChatMessages([userMessage]); // Replace previous messages instead of appending
      setNewMessage('');
      
      // Store pending request using AgentRequestManager
      const pendingRequest = AgentRequestManager.storePendingRequest(newMessage, requestId);
      lastRequestTimeRef.current = Date.now();
      
      // Show loading state
      setIsLoading(true);
      setReasoningSteps([]);
      
      // Send the request
      await completePendingRequest(newMessage, requestId);
    }
  };

  const handleMessageChange = (e) => {
    setNewMessage(e.target.value);
  };
  
  const toggleReasoning = () => {
    setShowReasoning(!showReasoning);
  };
  
  const handleClearHistory = () => {
    // If there's an ongoing request, abort it
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
    }
    
    setChatMessages([]);
    setReasoningSteps([]);
    setIsLoading(false);
    
    // Clear agent chat history in Zustand
    clearAgentChatHistory();
    
    // Clear pending request
    AgentRequestManager.clearPendingRequest();
  };

  return (
    <Card 
      component={motion.div}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        borderRadius: 6,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(139, 92, 246, 0.1)',
        background: 'rgba(30, 41, 59, 0.5)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at top right, rgba(139, 92, 246, 0.05), transparent 70%)',
          zIndex: 0
        },
        '& .MuiBadge-root, & .MuiButton-root, & .MuiTypography-root': {
          willChange: 'transform',
          transform: 'translateZ(0)',
        },
        ...sx 
      }}
    >
      <CardContent sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        p: 3,
        zIndex: 1
      }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            mb: 2, 
            marginLeft: 3 
          }}
          component={motion.div}
          variants={itemVariants}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box 
              component={motion.div}
              whileHover={{ scale: 1.05 }}
              sx={{ 
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.2))',
                p: 1.5,
                borderRadius: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(139, 92, 246, 0.2)'
              }}
            >
              <SmartToyIcon sx={{ fontSize: 24, color: '#8B5CF6' }} />
            </Box>
            <Typography 
              variant="h5" 
              fontWeight="500" 
              color="text.primary"
              component={motion.h5}
              variants={itemVariants}
            >
              AI Agent Chat
            </Typography>
          </Box>
          
          {/* Clear history button */}
          {chatMessages.length > 0 && (
            <Button
              variant="outlined"
              size="small"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleClearHistory}
              sx={{ 
                borderRadius: 100,
                textTransform: 'none',
                borderColor: alpha('#EF4444', 0.5),
                '&:hover': {
                  borderColor: 'error.main',
                  backgroundColor: alpha('#EF4444', 0.08),
                }
              }}
            >
              Clear History
            </Button>
          )}
        </Box>
        <Typography 
          variant="body1" 
          color="text.secondary" 
          sx={{ mb: 3, marginLeft: 3 }}
          component={motion.p}
          variants={itemVariants}
        >
          Interact with our advanced AI agent for in-depth comment analysis
        </Typography>
        
        {/* Reasoning steps section */}
        {reasoningSteps.length > 0 && (
          <Paper
            elevation={0}
            sx={{
              mb: 3,
              p: 2,
              borderRadius: 3,
              backgroundColor: alpha('#1E293B', 0.7),
              border: '1px solid rgba(139, 92, 246, 0.1)'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PsychologyIcon sx={{ color: '#8B5CF6' }} />
                <Typography variant="h6" fontWeight="500">
                  Agent Reasoning Process
                </Typography>
              </Box>
              <IconButton onClick={toggleReasoning} size="small">
                {showReasoning ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            
            <Collapse in={showReasoning}>
              <Stepper orientation="vertical" sx={{ mt: 2 }}>
                {reasoningSteps.map((step, index) => (
                  <Step key={index} active={true}>
                    <StepLabel 
                      StepIconProps={{ 
                        sx: { color: '#8B5CF6' } 
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight="500">
                        {step.step === 'initial_analysis' && 'Initial Analysis'}
                        {step.step === 'tool_selection' && 'Tool Selection'}
                        {step.step === 'tool_execution' && 'Tool Execution'}
                        {step.step === 'translation' && 'Translation'}
                        {step.step === 'self_correction' && 'Self Correction'}
                      </Typography>
                    </StepLabel>
                    <StepContent>
                      {step.step === 'initial_analysis' && (
                        <Box sx={{ pl: 1 }}>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                            {step.content}
                          </Typography>
                        </Box>
                      )}
                      
                      {step.step === 'tool_selection' && (
                        <Box sx={{ pl: 1 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Selected tools:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {step.selected_tools.map((tool, i) => (
                              <Box 
                                key={i}
                                sx={{
                                  py: 0.5,
                                  px: 1.5,
                                  borderRadius: 4,
                                  backgroundColor: alpha('#8B5CF6', 0.1),
                                  border: '1px solid rgba(139, 92, 246, 0.2)',
                                  fontSize: '0.8rem',
                                  color: '#8B5CF6'
                                }}
                              >
                                {tool}
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}
                      
                      {step.step === 'tool_execution' && (
                        <Box sx={{ pl: 1 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Tool execution results:
                          </Typography>
                          {Object.entries(step.results).map(([tool, result], i) => (
                            <Paper 
                              key={i} 
                              elevation={0}
                              sx={{ 
                                p: 1.5, 
                                mb: 1, 
                                borderRadius: 2,
                                backgroundColor: alpha('#1E293B', 0.4),
                                border: '1px solid rgba(139, 92, 246, 0.1)'
                              }}
                            >
                              <Typography variant="subtitle2" fontWeight="500" sx={{ mb: 0.5 }}>
                                {tool}
                                <Box 
                                  component="span" 
                                  sx={{ 
                                    ml: 1,
                                    py: 0.2,
                                    px: 1,
                                    borderRadius: 4,
                                    backgroundColor: result.status === 'success' 
                                      ? alpha('#10B981', 0.1) 
                                      : alpha('#EF4444', 0.1),
                                    color: result.status === 'success' ? '#10B981' : '#EF4444',
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {result.status}
                                </Box>
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {result.summary || result.message || "No summary available"}
                              </Typography>
                              
                              {result.results && Object.keys(result.results).length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                  <Divider sx={{ my: 1, borderColor: alpha('#8B5CF6', 0.1) }} />
                                  {Object.entries(result.results).map(([key, value], j) => (
                                    <Box key={j} sx={{ mt: 0.5 }}>
                                      {key !== 'detected_terms' && key !== 'emotional_tones' && (
                                        <>
                                          <Typography variant="caption" color="text.secondary">
                                            {key}:
                                          </Typography>
                                          <Typography variant="body2">
                                            {typeof value === 'object' 
                                              ? JSON.stringify(value, null, 2) 
                                              : String(value)}
                                          </Typography>
                                        </>
                                      )}
                                      
                                      {(key === 'detected_terms' || key === 'emotional_tones') && value.length > 0 && (
                                        <>
                                          <Typography variant="caption" color="text.secondary">
                                            {key}:
                                          </Typography>
                                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                            {value.map((term, k) => (
                                              <Box 
                                                key={k}
                                                sx={{
                                                  py: 0.2,
                                                  px: 1,
                                                  borderRadius: 4,
                                                  backgroundColor: alpha('#8B5CF6', 0.1),
                                                  fontSize: '0.75rem',
                                                  color: '#8B5CF6'
                                                }}
                                              >
                                                {term}
                                              </Box>
                                            ))}
                                          </Box>
                                        </>
                                      )}
                                    </Box>
                                  ))}
                                </Box>
                              )}
                            </Paper>
                          ))}
                        </Box>
                      )}
                      
                      {step.step === 'translation' && (
                        <Box sx={{ pl: 1 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Detected language: <strong>{step.from_language}</strong>
                          </Typography>
                          <Typography variant="body2">
                            Translated: {step.translated_text}
                          </Typography>
                        </Box>
                      )}
                      
                      {step.step === 'self_correction' && (
                        <Box sx={{ pl: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {step.note}
                          </Typography>
                        </Box>
                      )}
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </Collapse>
          </Paper>
        )}
        
        <motion.div
          variants={itemVariants}
          style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}
        >
          <ChatMessageList messages={chatMessages} />
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <Box sx={{ position: 'relative' }}>
            <ChatInput 
              message={newMessage} 
              onChange={handleMessageChange}
              onSend={handleSendMessage}
              disabled={isLoading}
            />
            
            {isLoading && (
              <Box 
                sx={{
                  position: 'absolute',
                  right: 70,
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}
              >
                <CircularProgress size={24} color="secondary" />
              </Box>
            )}
          </Box>
        </motion.div>
      </CardContent>
      
      {/* CSS animation */}
      <Box sx={animatedBorderStyle} />
    </Card>
  );
};

export default React.memo(AgentChat);