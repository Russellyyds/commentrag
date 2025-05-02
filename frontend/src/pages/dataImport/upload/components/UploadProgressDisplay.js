import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  alpha,
  CircularProgress
} from '@mui/material';
import { motion } from 'framer-motion';

const UploadProgressDisplay = ({ 
  progress, 
  processedComments 
}) => {
  // Animation duration adjusts based on progress value - slower as we approach 100%
  const animationDuration = progress > 95 ? 5 : 
                           progress > 80 ? 4 : 
                           progress > 50 ? 3 : 2;
  
  return (
    <Box sx={{ position: 'relative', mb: 5 }}>
      {/* Progress indicators - combining linear and circular displays */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Box 
          sx={{ 
            position: 'relative',
            width: 60,
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 3
          }}
        >
          <CircularProgress 
            size={60} 
            thickness={4}
            variant="indeterminate"
            // value={progress}
            sx={{ 
              color: 'primary.main',
              filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.3))',
            }}
          />
          <Typography 
            variant="body2" 
            fontWeight="bold" 
            color="primary.main"
            sx={{ position: 'absolute' }}
          >
            {progress.toFixed(0)}%
          </Typography>
        </Box>
        
        <Box sx={{ width: '100%', position: 'relative' }}>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ 
              height: 10, 
              borderRadius: 5, 
              bgcolor: alpha('#6366F1', 0.12),
              '& .MuiLinearProgress-bar': {
                backgroundImage: 'linear-gradient(to right, #6366F1, #8B5CF6)',
                borderRadius: 5,
              }
            }}
          />
          
          {/* Glow effect on progress bar */}
          <Box
            component={motion.div}
            animate={{
              opacity: [0.5, 0.8, 0.5],
              transition: { duration: animationDuration, repeat: Infinity }
            }}
            sx={{
              position: 'absolute',
              top: -2,
              left: 0,
              width: `${progress}%`,
              height: '100%',
              filter: 'blur(8px)',
              backgroundImage: 'linear-gradient(to right, #6366F1, #8B5CF6)',
              borderRadius: 5,
              zIndex: -1,
            }}
          />
        </Box>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" fontWeight="500" color="text.secondary">
          {progress.toFixed(0)}% Complete
        </Typography>
        <Typography variant="body2" fontWeight="500" color="text.secondary">
          {processedComments > 0 ? `${processedComments} Comments Found` : 'Processing...'}
        </Typography>
      </Box>
    </Box>
  );
};

export default React.memo(UploadProgressDisplay);