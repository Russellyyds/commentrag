import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  alpha,
  Typography,
  Stack
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import FileListItem from './FileListItem';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      when: "beforeChildren",
      staggerChildren: 0.05
    }
  }
};

const FileList = ({ files, progress = 0 }) => {
  // Calculate total size info
  const totalSizeInfo = useMemo(() => {
    if (files.length === 0) return '0 B';
    
    const totalBytes = files.reduce((acc, file) => acc + file.size, 0);
    
    if (totalBytes < 1024) return `${totalBytes} B`;
    else if (totalBytes < 1048576) return `${(totalBytes / 1024).toFixed(1)} KB`;
    else return `${(totalBytes / 1048576).toFixed(1)} MB`;
  }, [files]);
  
  // Prepare display files - limit to 30 for performance
  const displayFiles = useMemo(() => {
    if (files.length === 0) return [];
    
    if (files.length <= 30) return files;
    
    return files.slice(0, 30);
  }, [files]);
  
  // Count of hidden files
  const hiddenFileCount = files.length - displayFiles.length;

  // Early return if no files
  if (files.length === 0) return null;

  return (
    <Paper 
      component={motion.div}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      elevation={0}
      sx={{ 
        flexGrow: 1, 
        overflowY: 'auto',
        overflowX: 'hidden',
        border: '1px solid',
        borderColor: alpha('#6366F1', 0.12),
        borderRadius: 3,
        maxHeight: '300px',
        mt: 2,
        background: alpha('#1E293B', 0.3),
        backdropFilter: 'blur(6px)',
        position: 'relative',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(30, 41, 59, 0.2)',
          borderRadius: 3,
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(99, 102, 241, 0.4)',
          borderRadius: 3,
          '&:hover': {
            backgroundColor: 'rgba(99, 102, 241, 0.6)',
          }
        }
      }}
    >
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          px: 3,
          py: 2,
          borderBottom: `1px solid ${alpha('#6366F1', 0.1)}`,
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backdropFilter: 'blur(10px)',
          background: alpha('#1E293B', 0.7),
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle2" color="primary.main" fontWeight="600">
            {files.length} {files.length === 1 ? 'File' : 'Files'} Selected
            {hiddenFileCount > 0 && ` (${hiddenFileCount} hidden for performance)`}
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary" fontWeight="500">
          {totalSizeInfo}
        </Typography>
      </Box>
      
      <Stack spacing={0.5} sx={{ p: 1 }}>
        <AnimatePresence initial={false}>
          {displayFiles.map((file, index) => (
            <FileListItem 
              key={`${file.name}-${index}`}
              file={file}
              index={index}
              animationDelay={Math.min(index * 0.03, 0.3)}
              overallProgress={progress}
            />
          ))}
        </AnimatePresence>
      </Stack>
    </Paper>
  );
};

export default React.memo(FileList);