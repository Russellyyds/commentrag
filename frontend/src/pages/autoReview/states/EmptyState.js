import React from 'react';
import {
  Box,
  Typography
} from '@mui/material';
import { motion } from 'framer-motion';

const EmptyState = () => (
  <Box sx={{ textAlign: 'center', py: 10, px: 3 }}>
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 20,
        delay: 0.2
      }}
    >
      <Box 
        sx={{
          width: 100,
          height: 100,
          margin: '0 auto 20px',
          borderRadius: '50%',
          background: 'linear-gradient(45deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(99, 102, 241, 0.15)'
        }}
      >
        <motion.div
          animate={{ 
            rotate: [0, 10, 0, -10, 0],
            scale: [1, 1.05, 1, 1.05, 1]
          }}
          transition={{ duration: 5, repeat: Infinity }}
        >
          <Typography variant="h3" color="primary.main" sx={{ opacity: 0.7 }}>
            ?
          </Typography>
        </motion.div>
      </Box>
    </motion.div>
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Typography variant="h5" color="text.secondary" gutterBottom>
        No Data Available
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Please import data from the Data Import page first.
      </Typography>
    </motion.div>
  </Box>
);

export default EmptyState;