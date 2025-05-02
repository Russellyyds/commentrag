import React from 'react';
import {
  Box,
  Alert
} from '@mui/material';
import { motion } from 'framer-motion';
import ResetProjectButton from '../../dataImport/upload/ResetProjectButton';

const AutoReviewHeader = ({ 
  resetSuccess, 
  currentProjectId, 
  handleResetSuccess,
  importComplete
}) => {
  if (!currentProjectId || !importComplete) return null;
  
  return (
    <>
      {resetSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Alert 
            severity="success" 
            sx={{ 
              mb: 2, 
              borderRadius: 2,
              '& .MuiAlert-icon': {
                color: '#10B981'
              }
            }}
          >
            Project successfully reset. Redirecting to Data Import page...
          </Alert>
        </motion.div>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <ResetProjectButton 
          projectId={currentProjectId} 
          onSuccess={handleResetSuccess}
        />
      </Box>
    </>
  );
};

export default AutoReviewHeader;