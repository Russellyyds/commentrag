import React, { useRef, useEffect, useMemo } from 'react';
import {
  Box,
  List,
  alpha,
  Typography
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble from './MessageBubble';
import EmptyChat from './EmptyChat';

// Animation variants
const messageVariants = {
  initial: { opacity: 0, y: 20, scale: 0.9 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: "spring",
      stiffness: 300,
      damping: 25
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.8,
    transition: { duration: 0.2 }
  }
};

const ChatMessageList = ({ messages }) => {
  const messagesEndRef = useRef(null);
  
  // Auto-scroll to the bottom when new messages are added, but only if we're already near the bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      // Check if we're already at the bottom (or close to it) before auto-scrolling
      const container = messagesEndRef.current.parentElement;
      const isNearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 200;
      
      if (isNearBottom) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);
  
  // Optimize rendering - only render the most recent messages when there are many
  const visibleMessages = useMemo(() => {
    // If fewer than 50 messages, show all
    if (messages.length <= 50) return messages;
    
    // Otherwise only show the most recent 30 messages to improve performance
    return messages.slice(Math.max(0, messages.length - 30));
  }, [messages]);
  
  // Message count indicator
  const hiddenMessageCount = messages.length - visibleMessages.length;

  return (
    <Box 
      sx={{ 
        flexGrow: 1, 
        overflowY: 'auto', 
        mb: 3,
        // Use a reasonable fixed height but don't constrain too much
        minHeight: { xs: '350px', sm: '400px', md: '450px' },
        maxHeight: { xs: '350px', sm: '400px', md: '450px' },
        bgcolor: alpha('#6366F1', 0.03),
        background: 'linear-gradient(to bottom, rgba(99, 102, 241, 0.05), rgba(30, 41, 59, 0.3))',
        borderRadius: 4,
        p: 2,
        border: '1px solid rgba(99, 102, 241, 0.05)',
        backdropFilter: 'blur(8px)',
        position: 'relative',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(30, 41, 59, 0.2)',
          borderRadius: 3,
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(99, 102, 241, 0.4)',
          borderRadius: 3,
          '&:hover': {
            backgroundColor: 'rgba(99, 102, 241, 0.6)',
          }
        }
      }}
    >
      <List>
        {messages.length === 0 ? (
          <EmptyChat />
        ) : (
          <>
            {/* Show indicator for hidden messages */}
            {hiddenMessageCount > 0 && (
              <Box 
                sx={{ 
                  textAlign: 'center', 
                  py: 1, 
                  mb: 2,
                  color: 'text.secondary',
                  fontSize: '0.85rem',
                  borderBottom: '1px dashed rgba(99, 102, 241, 0.2)'
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {hiddenMessageCount} earlier messages hidden for performance
                </Typography>
              </Box>
            )}
            
            <AnimatePresence initial={false}>
              {visibleMessages.map((msg, index) => (
                <motion.div
                  key={`msg-${index}-${msg.sender}`}
                  variants={messageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  layout="position"
                >
                  <MessageBubble 
                    message={msg} 
                    isUser={msg.sender === 'user'} 
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </>
        )}
        <div ref={messagesEndRef} />
      </List>
      
      {/* Subtle animated gradient at the bottom for visual interest */}
      <Box 
        component={motion.div}
        animate={{ 
          opacity: [0.2, 0.5, 0.2],
          y: [0, -5, 0] 
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity, 
          repeatType: 'reverse' 
        }}
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '30px',
          background: 'linear-gradient(to top, rgba(99, 102, 241, 0.05), transparent)',
          pointerEvents: 'none',
          borderBottomLeftRadius: 4,
          borderBottomRightRadius: 4,
          zIndex: 0
        }}
      />
    </Box>
  );
};

export default React.memo(ChatMessageList);