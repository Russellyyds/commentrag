import React from 'react';
import {
  Alert
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationBar = ({ resetSuccess, exportSuccess, exportError }) => {
  return (
    <AnimatePresence>
      {resetSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Alert 
            severity="success" 
            sx={{ mb: 2, borderRadius: 2 }}
          >
            Project successfully reset.
          </Alert>
        </motion.div>
      )}
      
      {exportSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Alert 
            severity="success" 
            sx={{ mb: 2, borderRadius: 2 }}
          >
            Export completed successfully. Check your downloads folder.
          </Alert>
        </motion.div>
      )}
      
      {exportError && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Alert 
            severity="error" 
            sx={{ mb: 2, borderRadius: 2 }}
          >
            {exportError}
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationBar;