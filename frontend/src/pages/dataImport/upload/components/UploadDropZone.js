import React from 'react';
import {
  Box,
  Typography,
  alpha
} from '@mui/material';
import { motion } from 'framer-motion';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const UploadDropZone = ({ onDrop, onDragOver, onClick }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100%',
        cursor: 'pointer',
        border: '2px dashed rgba(99, 102, 241, 0.3)',
        borderRadius: 4,
        padding: 4,
        textAlign: 'center',
        backgroundColor: 'rgba(99, 102, 241, 0.03)',
        '&:hover': {
          backgroundColor: 'rgba(99, 102, 241, 0.06)',
          borderColor: 'primary.main',
        },
        transition: 'all 0.2s ease-in-out',
        width: '100%'
      }}
      component={motion.div}
      variants={{
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1 }
      }}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.01 }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onClick={onClick}
      data-cy="upload-dropzone"
    >
      <motion.div
        whileHover={{ 
          scale: 1.1,
          rotate: [0, -10, 10, -10, 0],
          transition: { duration: 0.5 }
        }}
      >
        <Box 
          sx={{ 
            bgcolor: alpha('#6366F1', 0.1),
            p: 3,
            borderRadius: '50%',
            width: 80,
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.2)'
          }}
        >
          <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        </Box>
      </motion.div>
      <Typography variant="h5" gutterBottom fontWeight="500" color="text.primary">
        Drop your files here
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        or click to select
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Supports CSV, TSV, Excel and JSON files
      </Typography>
    </Box>
  );
};

export default React.memo(UploadDropZone);