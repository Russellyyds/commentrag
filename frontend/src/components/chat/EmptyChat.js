import React from 'react';
import {
  Box,
  Typography
} from '@mui/material';
import { motion } from 'framer-motion';
import CommentIcon from '@mui/icons-material/Comment';

// Animation variants
const containerVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 20 }
  }
};

const iconVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 0.7,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 10,
      delay: 0.3
    }
  },
  hover: {
    scale: 1.1,
    opacity: 1,
    transition: { duration: 0.3 }
  }
};

const EmptyChat = () => {
  return (
    <Box 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        opacity: 0.7
      }}
      component={motion.div}
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      <motion.div
        variants={iconVariants}
        whileHover="hover"
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mb: 2,
            marginTop: 12,
            border: '1px solid rgba(99, 102, 241, 0.1)',
            position: 'relative'
          }}
        >
          <CommentIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          
          {/* Pulsing effect */}
          <Box
            component={motion.div}
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatType: 'reverse'
            }}
            sx={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
              filter: 'blur(8px)',
              zIndex: -1
            }}
          />
        </Box>
      </motion.div>
      <motion.div variants={itemVariants}>
        <Typography 
          variant="body1" 
          color="text.secondary" 
          align="center"
          sx={{ 
            maxWidth: 240,
            textAlign: 'center',
            fontSize: '1rem',
            fontWeight: 500
          }}
        >
          Start typing to analyze comments
        </Typography>
      </motion.div>
      <motion.div 
        variants={itemVariants}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <Typography 
          variant="body2" 
          color="text.secondary" 
          align="center"
          sx={{ 
            mt: 1,
            maxWidth: 240,
            opacity: 0.7,
            fontSize: '0.85rem'
          }}
        >
          AI will automatically classify and categorize your input
        </Typography>
      </motion.div>
    </Box>
  );
};

export default EmptyChat;