import React from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress
} from '@mui/material';
import { motion } from 'framer-motion';
import RefreshIcon from '@mui/icons-material/Refresh';

const ProcessingState = () => (
  <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Box 
          sx={{ 
            position: 'relative',
            mb: 3
          }}
        >
          <CircularProgress 
            size={80} 
            thickness={4}
            sx={{ 
              color: 'primary.main',
              filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.3))'
            }}
          />
          
          <Box
            component={motion.div}
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse"
            }}
            sx={{
              position: 'absolute',
              top: -10,
              left: -10,
              right: -10,
              bottom: -10,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2), transparent 70%)',
              zIndex: -1
            }}
          />
        </Box>
        
        <Typography variant="h5" color="primary.main" fontWeight="500" gutterBottom>
          Processing Comments
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500 }}>
          Your comments are being processed and categorized. This might take a few moments depending on the amount of data.
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={() => window.location.reload()}
          sx={{ 
            borderRadius: 100,
            px: 3,
            backgroundImage: 'linear-gradient(45deg, #6366F1, #8B5CF6)'
          }}
          disableElevation
        >
          Refresh Page
        </Button>
      </Box>
    </motion.div>
  </Box>
);

export default ProcessingState;