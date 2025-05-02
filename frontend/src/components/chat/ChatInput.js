import React from 'react';
import {
  Box,
  TextField,
  IconButton,
  alpha
} from '@mui/material';
import { motion } from 'framer-motion';
import SendIcon from '@mui/icons-material/Send';

const ChatInput = ({ message, onChange, onSend, disabled = false }) => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && message.trim()) {
        onSend();
      }
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', mt: 'auto', gap: 1, marginLeft: 3 }}>
      <TextField
        fullWidth
        placeholder="Type a comment for analysis..."
        value={message}
        onChange={onChange}
        variant="outlined"
        multiline
        rows={1}
        size="medium"
        onKeyPress={handleKeyPress}
        disabled={disabled}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 3,
            backgroundColor: alpha('#1E293B', 0.5),
            backdropFilter: 'blur(4px)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: alpha('#6366F1', 0.2),
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: alpha('#6366F1', 0.4),
            },
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
                borderWidth: 2
              }
            },
            '&.Mui-disabled': {
              opacity: 0.7,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha('#6366F1', 0.1),
              }
            }
          }
        }}
      />
      <motion.div
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
      >
        <IconButton 
          color="primary" 
          onClick={onSend}
          disabled={disabled || !message.trim()}
          sx={{ 
            ml: 1, 
            p: 2, 
            backgroundColor: alpha('#6366F1', 0.15),
            backgroundImage: message.trim() && !disabled ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.25))' : 'none',
            '&:hover': {
              backgroundColor: alpha('#6366F1', 0.25),
            },
            '&.Mui-disabled': {
              backgroundColor: 'action.disabledBackground',
              color: 'action.disabled'
            }
          }}
        >
          {/* Add subtle glow effect when button is active */}
          {message.trim() && !disabled && (
            <Box
              component={motion.div}
              animate={{ 
                opacity: [0.5, 0.8, 0.5] 
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
                repeatType: "reverse"
              }}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: '50%',
                backgroundImage: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
                filter: 'blur(8px)',
                zIndex: 0
              }}
            />
          )}
          <SendIcon style={{ position: 'relative', zIndex: 1 }} />
        </IconButton>
      </motion.div>
    </Box>
  );
};

export default ChatInput;