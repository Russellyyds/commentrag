import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Card,
  CardContent,
  CircularProgress
} from '@mui/material';
import { motion } from 'framer-motion';
import CommentIcon from '@mui/icons-material/Comment';
import ChatMessageList from '../../../components/chat/ChatMessageList';
import ChatInput from '../../../components/chat/ChatInput';
import { submitManualComment } from '../../../hooks/apiService';

// Static styles for optimized animations
const animatedBorderStyle = {
  '@keyframes gradientAnimation': {
    '0%': {
      backgroundPosition: '0% 50%',
    },
    '50%': {
      backgroundPosition: '100% 50%',
    },
    '100%': {
      backgroundPosition: '0% 50%',
    },
  },
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  opacity: 0.5,
  pointerEvents: 'none',
  zIndex: 0,
  // Use CSS gradient instead of JS animation
  background: 'linear-gradient(90deg, rgba(99, 102, 241, 0) 0%, rgba(99, 102, 241, 0.3) 50%, rgba(99, 102, 241, 0) 100%)',
  backgroundSize: '200% 200%',
  animation: 'gradientAnimation 8s ease infinite',
  // Performance optimization
  willChange: 'background-position',
  transform: 'translateZ(0)', // Force GPU acceleration
};

// Simplified animation variants
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

const ManualEntryCard = ({ sx = {} }) => {
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      // Add user message to chat
      const userMessage = { text: newMessage, sender: 'user' };
      setChatMessages(prev => [...prev, userMessage]);
      setNewMessage('');
      
      // Show loading state
      setIsLoading(true);
      
      try {
        // Call API to process the comment with RAG
        const response = await submitManualComment(newMessage);
        
        if (response.success && response.data) {
          // Use LLM classification results
          const classification = response.data.classification || {};
          const similarComments = response.data.answer || [];
          
          // Handle no results case
          if (!similarComments || similarComments.length === 0) {
            setChatMessages(prev => [...prev, { 
              text: "No similar comments found. This appears to be a unique comment.",
              sender: 'system' 
            }]);
            setIsLoading(false);
            return;
          }
          
          // Add main classification response
          const category = classification.category || "Unknown";
          const confidence = classification.confidence || 50;
          const reasoning = classification.reasoning || "";
          
          // Add AI classification response with better error handling
          let responseText = `Your comment has been categorized as "${category}" with ${confidence}% confidence.`;
          
          // Only add reasoning if it's meaningful
          if (reasoning && reasoning !== "Unable to parse LLM response." && reasoning !== "No reasoning provided.") {
            responseText += `\n\n${reasoning}`;
          }
          
          // Add error indicator if needed
          if (category === "Unknown" && confidence <= 50) {
            responseText += "\n\nNote: The system is unsure about this classification. Please consider trying a more detailed comment.";
          }
          
          setChatMessages(prev => [...prev, { 
            text: responseText,
            sender: 'system' 
          }]);
          
          // Add similar comments as a separate message
          if (similarComments.length > 0) {
            setTimeout(() => {
              let similarMessage = "Here are some similar comments in our database:";
              
              similarComments.forEach((result, index) => {
                const similarity = Math.round(result.similarity * 100);
                similarMessage += `\n\n${index + 1}. "${result.comment}" (${similarity}% similarity, Category: ${result.category})`;
              });
              
              setChatMessages(prev => [...prev, { 
                text: similarMessage,
                sender: 'system' 
              }]);
            }, 800); // Small delay for better UX
          }
        } else {
          // Handle error
          setChatMessages(prev => [...prev, { 
            text: `Error: ${response.message || 'Failed to process your comment'}`,
            sender: 'system' 
          }]);
        }
      } catch (error) {
        console.error('Error processing comment:', error);
        setChatMessages(prev => [...prev, { 
          text: "Sorry, there was an error processing your comment. Please try again later.",
          sender: 'system' 
        }]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleMessageChange = (e) => {
    setNewMessage(e.target.value);
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
        border: '1px solid rgba(99, 102, 241, 0.1)',
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
          background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.05), transparent 70%)',
          zIndex: 0
        },
        // Performance optimizations
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
          sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2, marginLeft: 3 }}
          component={motion.div}
          variants={itemVariants}
        >
          <Box 
            component={motion.div}
            whileHover={{ scale: 1.05 }}
            sx={{ 
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
              p: 1.5,
              borderRadius: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.2)'
            }}
          >
            <CommentIcon sx={{ fontSize: 24, color: 'primary.main' }} />
          </Box>
          <Typography 
            variant="h5" 
            fontWeight="500" 
            color="text.primary"
            component={motion.h5}
            variants={itemVariants}
          >
            Manual Comment Entry
          </Typography>
        </Box>
        <Typography 
          variant="body1" 
          color="text.secondary" 
          sx={{ mb: 3, marginLeft: 3 }}
          component={motion.p}
          variants={itemVariants}
        >
          Enter comments directly for instant AI classification
        </Typography>
        
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
                <CircularProgress size={24} color="primary" />
              </Box>
            )}
          </Box>
        </motion.div>
      </CardContent>
      
      {/* CSS animation instead of JS animation */}
      <Box sx={animatedBorderStyle} />
    </Card>
  );
};

export default React.memo(ManualEntryCard);