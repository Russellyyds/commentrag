import React from 'react';
import {
  Typography
} from '@mui/material';
import { motion } from 'framer-motion';

const CompletionMessage = ({ 
  uploadState, 
  processedComments, 
  error 
}) => {
  if (uploadState === 'complete') {
    return (
      <Typography 
        variant="body1" 
        color="text.secondary" 
        sx={{ mb: 4 }}
        component={motion.p}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {processedComments > 0 ? 
          `${processedComments} comments have been processed.` : 
          'Files have been processed successfully.'}
      </Typography>
    );
  }
  
  if (uploadState === 'error') {
    return (
      <Typography 
        variant="body1" 
        color="text.secondary" 
        sx={{ mb: 4 }}
      >
        {error || "An error occurred while processing your files. Please try again."}
      </Typography>
    );
  }
  
  return null;
};

export default React.memo(CompletionMessage);