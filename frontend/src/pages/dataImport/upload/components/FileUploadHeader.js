import React from 'react';
import {
  Box,
  Typography
} from '@mui/material';
import { motion } from 'framer-motion';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { alpha } from '@mui/material/styles';

const FileUploadHeader = ({ uploadState, totalFiles, processedComments }) => {
  // Determine header content based on state
  const renderHeaderContent = () => {
    switch (uploadState) {
      case 'initial':
        if (totalFiles > 0) {
          return (
            <>
              <Typography variant="h5" fontWeight="500" color="text.primary">
                Files Selected
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {totalFiles} {totalFiles === 1 ? 'file' : 'files'}
              </Typography>
            </>
          );
        }
        return null;
        
      case 'uploading':
        return (
          <>
            <Typography variant="h5" fontWeight="500" color="text.primary" gutterBottom>
              Processing Files
            </Typography>
            {totalFiles > 0 && (
              <Typography variant="body1" color="text.secondary">
                Processing {totalFiles} {totalFiles === 1 ? 'file' : 'files'}
              </Typography>
            )}
          </>
        );
        
      case 'complete':
        return (
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 3 
            }}
          >
            <Box 
              sx={{ 
                backgroundColor: alpha('#10B981', 0.1),
                width: 48,
                height: 48,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2,
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)'
              }}
              component={motion.div}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <CheckCircleIcon color="success" />
            </Box>
            <Typography 
              variant="h5" 
              color="primary.main" 
              fontWeight="500"
              component={motion.h5}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              Import Complete!
            </Typography>
          </Box>
        );
        
      case 'error':
        return (
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 3 
            }}
          >
            <Box 
              sx={{ 
                backgroundColor: alpha('#EF4444', 0.1),
                width: 48,
                height: 48,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2,
                boxShadow: '0 0 15px rgba(239, 68, 68, 0.2)'
              }}
              component={motion.div}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <CancelIcon color="error" />
            </Box>
            <Typography 
              variant="h5" 
              color="error.main" 
              fontWeight="500"
              component={motion.h5}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              Error Occurred
            </Typography>
          </Box>
        );
        
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      {renderHeaderContent()}
    </Box>
  );
};

export default React.memo(FileUploadHeader);