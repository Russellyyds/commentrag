import React from 'react';
import {
  Box,
  Typography
} from '@mui/material';
import { motion } from 'framer-motion';
import { fadeIn } from '../../../utils/animations';

const EmptyStateMessage = ({ message }) => {
  return (
    <Box 
      sx={{ width: '100%', textAlign: 'center', py: 10 }}
      component={motion.div}
      variants={fadeIn}
      initial="hidden"
      animate="visible"
    >
      <Typography variant="h5" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
};

export default EmptyStateMessage;