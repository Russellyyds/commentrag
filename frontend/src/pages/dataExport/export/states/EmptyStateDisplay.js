import React from 'react';
import {
  Box,
  Typography
} from '@mui/material';
import { motion } from 'framer-motion';
import { fadeIn } from '../../../../utils/animations';

const EmptyStateDisplay = () => {
  return (
    <Box 
      sx={{ textAlign: 'center', py: 10, px: 3 }}
      component={motion.div}
      variants={fadeIn}
      initial="hidden"
      animate="visible"
    >
      <Typography variant="h5" color="text.secondary" gutterBottom>
        No Data Available
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Please import data from the Data Import page first.
      </Typography>
    </Box>
  );
};

export default EmptyStateDisplay;