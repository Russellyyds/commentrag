import React from 'react';
import {
  Box,
  CircularProgress
} from '@mui/material';

const LoadingState = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', py: 10, alignItems: 'center' }}>
    <CircularProgress color="primary" size={60} thickness={4} />
  </Box>
);

export default LoadingState;