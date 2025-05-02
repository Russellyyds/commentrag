import React, { memo } from 'react';
import {
  Box,
  Typography,
  alpha,
  Tooltip,
  Paper
} from '@mui/material';
import { motion } from 'framer-motion';
import FileDownloadDoneIcon from '@mui/icons-material/FileDownloadDone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DataObjectIcon from '@mui/icons-material/DataObject';
import TableChartIcon from '@mui/icons-material/TableChart';

// Animation variants - optimized for performance
const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { 
      type: "tween", // Use simpler tween animation instead of spring
      duration: 0.2  // Faster animation
    }
  },
  exit: {
    opacity: 0,
    x: -10,
    transition: {
      duration: 0.15
    }
  }
};

const FileListItem = ({ file, index, animationDelay = 0, overallProgress = 0 }) => {
  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Get file icon based on type
  const getFileIcon = (filename) => {
    if (filename.endsWith('.json')) {
      return <DataObjectIcon fontSize="small" sx={{ color: '#8B5CF6' }} />;
    } else if (filename.endsWith('.csv') || filename.endsWith('.tsv')) {
      return <TableChartIcon fontSize="small" sx={{ color: '#06B6D4' }} />;
    } else if (filename.endsWith('.xls') || filename.endsWith('.xlsx')) {
      return <TableChartIcon fontSize="small" sx={{ color: '#10B981' }} />;
    } else {
      return <InsertDriveFileIcon fontSize="small" sx={{ color: '#6366F1' }} />;
    }
  };

  // Update file status based on overallProgress
  const getEffectiveStatus = () => {
    // If file is already marked as complete, keep it that way
    if (file.status === 'complete') {
      return 'complete';
    }
    // If file is processing and overall progress is 100%, mark as complete
    else if (file.status === 'processing' && overallProgress >= 99) {
      return 'complete';
    }
    // Otherwise use the file's current status
    return file.status;
  };

  const effectiveStatus = getEffectiveStatus();

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <FileDownloadDoneIcon fontSize="small" sx={{ color: '#10B981' }} />;
      case 'processing':
        return <CloudUploadIcon fontSize="small" sx={{ color: '#6366F1' }} />;
      default:
        return null;
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'complete':
        return '#10B981';
      case 'processing':
        return '#6366F1';
      default:
        return '#94A3B8';
    }
  };

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'complete':
        return 'Completed';
      case 'processing':
        return `Processing (${Math.min(overallProgress, 99)}%)`;
      case 'uploaded':
        return 'Ready to Process';
      default:
        return status;
    }
  };

  // Create custom animation based on index
  const customVariants = {
    ...itemVariants,
    visible: {
      ...itemVariants.visible,
      transition: {
        ...itemVariants.visible.transition,
        delay: animationDelay
      }
    }
  };

  return (
    <motion.div
      variants={customVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={{ scale: 1.01, x: 5 }}
      layout={false}
    >
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          borderRadius: 2,
          backgroundColor: 
            effectiveStatus === 'processing' ? alpha('#6366F1', 0.08) :
            effectiveStatus === 'complete' ? alpha('#10B981', 0.08) : 
            alpha('#1E293B', 0.4),
          '&:hover': {
            backgroundColor: 
              effectiveStatus === 'processing' ? alpha('#6366F1', 0.12) :
              effectiveStatus === 'complete' ? alpha('#10B981', 0.12) : 
              alpha('#6366F1', 0.08),
          },
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          border: '1px solid',
          borderColor: 
            effectiveStatus === 'processing' ? alpha('#6366F1', 0.2) :
            effectiveStatus === 'complete' ? alpha('#10B981', 0.2) : 
            'transparent',
          mx: 1
        }}
      >
        {/* Status indicator line */}
        <Box 
          sx={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: 3,
            height: '100%',
            backgroundColor: getStatusColor(effectiveStatus),
            opacity: 0.8
          }}
        />
        
        {/* File icon */}
        <Box 
          sx={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ml: 1,
            mr: 2
          }}
        >
          {getFileIcon(file.name)}
        </Box>
        
        {/* File details */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Tooltip title={file.name}>
            <Typography 
              variant="body2" 
              fontWeight="medium" 
              sx={{ 
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'block'
              }}
            >
              {file.name}
            </Typography>
          </Tooltip>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ mr: 1 }}
            >
              {formatFileSize(file.size)}
            </Typography>
            
            {effectiveStatus && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box 
                  sx={{ 
                    width: 4, 
                    height: 4, 
                    borderRadius: '50%', 
                    backgroundColor: getStatusColor(effectiveStatus),
                    mr: 0.5,
                    animation: effectiveStatus === 'processing' ? 'pulse 1.5s infinite' : 'none',
                    '@keyframes pulse': {
                      '0%': { opacity: 0.4 },
                      '50%': { opacity: 1 },
                      '100%': { opacity: 0.4 }
                    }
                  }} 
                />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: alpha(getStatusColor(effectiveStatus), 0.8),
                    fontWeight: 'medium'
                  }}
                >
                  {getStatusText(effectiveStatus)}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
        
        {/* Status icon */}
        <Box sx={{ mx: 1, display: 'flex', alignItems: 'center' }}>
          {getStatusIcon(effectiveStatus)}
        </Box>
      </Paper>
    </motion.div>
  );
};

// Use memo to prevent unnecessary rerenders
export default memo(FileListItem);