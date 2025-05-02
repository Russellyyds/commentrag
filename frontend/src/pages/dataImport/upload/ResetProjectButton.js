import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Box,
  alpha
} from '@mui/material';
import { motion } from 'framer-motion';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { resetProject } from '../../../hooks/apiService';
import { useAppStore } from '../../../utils/zustandStore';

const ResetProjectButton = ({ projectId, onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Get reset function from Zustand store
  const resetApplicationState = useAppStore(state => state.resetApplicationState);

  const handleResetComplete = () => {
    // Use Zustand resetApplicationState to update global state
    resetApplicationState();
    
    // Call success callback if provided
    if (onSuccess && typeof onSuccess === 'function') {
      onSuccess();
    }
    
    // Dispatch event for backward compatibility
    window.dispatchEvent(new Event('applicationReset'));
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    if (!loading) {
      setOpen(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await resetProject(projectId);
      if (result.success) {
        handleResetComplete();
        setOpen(false);
      } else {
        setError(result.message || 'Failed to reset project');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Reset error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        color="error"
        startIcon={<RestartAltIcon />}
        onClick={handleClickOpen}
        component={motion.button}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        sx={{ 
          borderRadius: 100,
          borderColor: alpha('#EF4444', 0.5),
          '&:hover': {
            borderColor: 'error.main',
            backgroundColor: alpha('#EF4444', 0.08),
          }
        }}
      >
        Reset Project
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="reset-dialog-title"
        aria-describedby="reset-dialog-description"
        PaperProps={{
          sx: {
            borderRadius: 4,
            background: 'rgba(30, 41, 59, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }
        }}
      >
        <DialogTitle id="reset-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteForeverIcon color="error" />
          Reset Project and All Data?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="reset-dialog-description">
            This action will permanently delete all project data, including:
            <Box component="ul" sx={{ pl: 3 }}>
              <li>All uploaded files</li>
              <li>All processed comments</li>
              <li>All classification results</li>
              <li>All manual review work</li>
            </Box>
            This action cannot be undone. Are you sure you want to continue?
          </DialogContentText>
          {error && (
            <DialogContentText color="error" sx={{ mt: 2 }}>
              Error: {error}
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleClose} 
            color="inherit"
            disabled={loading}
            sx={{ borderRadius: 100 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleReset} 
            color="error" 
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ 
              borderRadius: 100,
              px: 3
            }}
          >
            {loading ? 'Resetting...' : 'Reset Project'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ResetProjectButton;