import React from 'react';
import {
  Button,
  Stack,
  CircularProgress
} from '@mui/material';

const ActionButtons = ({ 
  onCancel, 
  onSubmit, 
  isSubmitting,
  cancelLabel = "Cancel",
  submitLabel = "Submit"
}) => {
  return (
    <Stack 
      direction="row" 
      spacing={2} 
      sx={{ justifyContent: 'flex-end' }}
    >
      <Button 
        onClick={onCancel} 
        color="inherit"
        disabled={isSubmitting}
        sx={{ 
          borderRadius: 100, 
          px: 3
        }}
      >
        {cancelLabel}
      </Button>
      <Button 
        onClick={onSubmit} 
        variant="contained" 
        color="primary"
        disabled={isSubmitting}
        startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
        sx={{ 
          borderRadius: 100,
          px: 4,
          backgroundImage: 'linear-gradient(45deg, #6366F1, #8B5CF6)'
        }}
        disableElevation
      >
        {isSubmitting ? 'Submitting...' : submitLabel}
      </Button>
    </Stack>
  );
};

export default ActionButtons;