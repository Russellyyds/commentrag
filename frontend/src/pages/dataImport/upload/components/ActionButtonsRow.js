import React from 'react';
import {
  Button,
  Stack,
  alpha
} from '@mui/material';
import { motion } from 'framer-motion';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CancelIcon from '@mui/icons-material/Cancel';

const ActionButtonsRow = ({
  uploadState, 
  onAddMore, 
  onProcess, 
  onCancel,
  onReset,
  onAutoReview, 
  onManualReview,
  onCancelProcessing
}) => {
  switch(uploadState) {
    case 'initial':
      return (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ mt: 'auto', pt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={onAddMore}
            component={motion.button}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            sx={{ 
              borderRadius: 100,
              borderColor: alpha('#6366F1', 0.5)
            }}
          >
            Add More Files
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayArrowIcon />}
            onClick={onProcess}
            component={motion.button}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            sx={{ 
              borderRadius: 100,
              backgroundImage: 'linear-gradient(45deg, #6366F1, #8B5CF6)'
            }}
            disableElevation
          >
            Process Files
          </Button>
        </Stack>
      );
    
    case 'uploading':
      return (
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          spacing={2} 
          justifyContent="center" 
          sx={{ mt: 'auto', pt: 2 }}
        >
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={onCancelProcessing}
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
            Cancel Processing
          </Button>
        </Stack>
      );
    
    case 'complete':
      return (
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          spacing={2} 
          sx={{ mt: 'auto' }}
          component={motion.div}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={onAutoReview}
            component={motion.button}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            sx={{ 
              borderRadius: 100,
              backgroundImage: 'linear-gradient(45deg, #6366F1, #8B5CF6)',
              flexGrow: 1
            }}
            disableElevation
          >
            Auto Review
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={onManualReview}
            component={motion.button}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            sx={{ 
              borderRadius: 100,
              backgroundImage: 'linear-gradient(45deg, #10B981, #06B6D4)',
              flexGrow: 1
            }}
            disableElevation
          >
            Manual Review
          </Button>
        </Stack>
      );
      
    case 'error':
      return (
        <Button
          variant="contained"
          startIcon={<RestartAltIcon />}
          onClick={onReset}
          component={motion.button}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          sx={{ 
            borderRadius: 100,
            mt: 'auto',
            alignSelf: 'center'
          }}
          disableElevation
        >
          Start Over
        </Button>
      );
      
    default:
      return null;
  }
};

export default React.memo(ActionButtonsRow);