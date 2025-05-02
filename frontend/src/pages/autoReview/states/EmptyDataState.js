import React from 'react';
import {
  Box,
  Typography,
  Button
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

const EmptyDataState = () => (
  <Box sx={{ textAlign: 'center', py: 5, px: 3 }}>
    <Typography variant="h6" color="text.secondary" gutterBottom>
      No Processed Comments Found
    </Typography>
    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
      Data has been imported but comments haven't been processed yet.
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

export default EmptyDataState;