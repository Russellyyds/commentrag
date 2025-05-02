import React from 'react';
import {
  Box,
  Typography,
  Button
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

const ErrorStateDisplay = ({ error }) => {
  return (
    <Box sx={{ textAlign: 'center', py: 5, px: 3 }}>
      <Typography variant="h6" color="error.main" gutterBottom>
        Error Loading Data
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {error}
      </Typography>
      
      <Button
        variant="outlined"
        startIcon={<RefreshIcon />}
        onClick={() => window.location.reload()}
      >
        Refresh Page
      </Button>
    </Box>
  );
};

export default ErrorStateDisplay;