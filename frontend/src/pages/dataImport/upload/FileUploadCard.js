import React, { useEffect } from 'react';
import { 
  Box, 
  Paper
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import UploadDropZone from './components/UploadDropZone';
import FileUploadHeader from './components/FileUploadHeader';
import UploadProgressDisplay from './components/UploadProgressDisplay';
import ActionButtonsRow from './components/ActionButtonsRow';
import CompletionMessage from './components/CompletionMessage';
import HiddenFileInput from './components/HiddenFileInput';
import FileList from './FileList';

const FileUploadCard = ({
  uploadState,
  progress,
  processedComments,
  totalFiles,
  files,
  onFileSelect,
  onDrop,
  onDragOver,
  onCancel,
  onReset,
  onAutoReview,
  onManualReview,
  onProcessFiles,
  onProjectCreated,
  onCancelProcessing,
  sx = {},
  error
}) => {
  // Effect to handle project creation notification
  useEffect(() => {
    // If upload is complete and we have processed comments
    if (uploadState === 'complete' && processedComments > 0) {
      // Get the project ID from localStorage
      const projectId = localStorage.getItem('currentProjectId');
      if (projectId && onProjectCreated) {
        onProjectCreated(projectId);
      }
    }
  }, [uploadState, processedComments, onProjectCreated]);

  const handleFileInputChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      onFileSelect(event);
    }
  };

  const handleAddMoreClick = () => {
    document.getElementById('fileInput').click();
  };

  const handleDropZoneClick = () => {
    document.getElementById('fileInput').click();
  };

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 4,
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(99, 102, 241, 0.1)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        ...sx,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.05), transparent 70%)',
          zIndex: 0
        }
      }}
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Card content based on state */}
      <AnimatePresence mode="wait">
        {uploadState === 'initial' && (
          <motion.div
            key="initial"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ 
              display: 'flex', 
              flexDirection: 'column',
              padding: '24px',
              height: '100%', 
              position: 'relative',
              zIndex: 1
            }}
          >
            {files.length === 0 ? (
              // Empty state
              <UploadDropZone 
                onDrop={onDrop}
                onDragOver={onDragOver}
                onClick={handleDropZoneClick}
              />
            ) : (
              // Files selected state
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <FileUploadHeader 
                  uploadState={uploadState}
                  totalFiles={files.length}
                />
                
                {/* File list component */}
                <FileList files={files} progress={progress} />
                
                <ActionButtonsRow 
                  uploadState={uploadState}
                  onAddMore={handleAddMoreClick}
                  onProcess={onProcessFiles} // Use the new process handler
                />
              </Box>
            )}
          </motion.div>
        )}
        
        {uploadState === 'uploading' && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%',
              padding: '24px',
              position: 'relative',
              zIndex: 1 
            }}
          >
            <FileUploadHeader 
              uploadState={uploadState}
              totalFiles={totalFiles}
            />
            
            <UploadProgressDisplay 
              progress={progress}
              processedComments={processedComments}
            />
            
            {/* File list with progress */}
            {files.length > 0 && (
              <FileList files={files} progress={progress} />
            )}
            
            <ActionButtonsRow 
              uploadState={uploadState}
              onCancel={onCancel}
              onCancelProcessing={onCancelProcessing}
            />
          </motion.div>
        )}
        
        {uploadState === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%',
              padding: '24px',
              position: 'relative',
              zIndex: 1
            }}
          >
            <FileUploadHeader 
              uploadState={uploadState}
              processedComments={processedComments}
            />
            
            <CompletionMessage 
              uploadState={uploadState}
              processedComments={processedComments}
            />
            
            {/* Show file list in complete state */}
            {files.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <FileList files={files} progress={100} />
              </Box>
            )}
            
            <ActionButtonsRow 
              uploadState={uploadState}
              onAutoReview={onAutoReview}
              onManualReview={onManualReview}
            />
          </motion.div>
        )}
        
        {uploadState === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%',
              padding: '24px',
              position: 'relative',
              zIndex: 1
            }}
          >
            <FileUploadHeader 
              uploadState={uploadState}
            />
            
            <CompletionMessage 
              uploadState={uploadState}
              error={error}
            />
            
            <ActionButtonsRow 
              uploadState={uploadState}
              onReset={onReset}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Hidden file input */}
      <HiddenFileInput onChange={handleFileInputChange} />
    </Paper>
  );
};

export default FileUploadCard;