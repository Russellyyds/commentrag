import React from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

const ProcessingStateDisplay = () => {
  return (
    <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
      <Box 
        sx={{ 
          position: 'relative',
          mb: 3,
          display: 'flex',
          justifyContent: 'center'
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
      </Box>
      
      <Typography variant="h5" color="primary.main" fontWeight="500" gutterBottom>
        Processing Comments
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
        Your comments are being processed. Please wait until processing is complete to export data.
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
  );
};

export default ProcessingStateDisplay;