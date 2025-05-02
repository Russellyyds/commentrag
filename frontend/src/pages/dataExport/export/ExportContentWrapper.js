import React from 'react';
import { Paper } from '@mui/material';
import { motion } from 'framer-motion';
import { slideUp } from '../../../utils/animations';

const ExportContentWrapper = ({ children }) => {
  return (
    <Paper
      elevation={0}
      component={motion.div}
      variants={slideUp}
      sx={{
        borderRadius: 4,
        overflow: 'hidden',
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        backdropFilter: 'blur(10px)',
        mb: 4,
        border: '1px solid rgba(99, 102, 241, 0.1)',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.05), transparent 70%)',
          zIndex: -1
        }
      }}
    >
      {children}
    </Paper>
  );
};

export default ExportContentWrapper;