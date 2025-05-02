import React, { useEffect, useState, useContext, useRef } from 'react';
import { 
  Box, 
  Grid,
  useTheme,
  useMediaQuery,
  Alert,
  Tooltip,
  IconButton,
  alpha,
  Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpring, animated } from '@react-spring/web';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import FileUploadCard from './upload/FileUploadCard';
import ManualEntryCard from './upload/ManualEntryCard';
import ResetProjectButton from './upload/ResetProjectButton';
import HelpPanel from './upload/components/HelpPanel';
import useDataImport from '../../hooks/useDataImport';
import { ImportContext } from '../../App';
import { getProcessedComments } from '../../hooks/apiService';
import { APP_STATES } from '../../utils/stateManager';

// Create animated container component
const AnimatedGrid = animated(motion.div);

const DataImport = () => {
  // Use the custom hook with enhanced functionality
  const {
    uploadState, // Now this is just UI state, not app state
    progress,
    processedComments,
    currentFile,
    totalFiles,
    files,
    error,
    handleFileUpload,
    handleProcessFiles,
    handleManualComment,
    handleCancel,
    handleCancelProcessing, // New handler for cancelling processing
    resetState,
    setUploadState,
    setProgress,
    setProcessedComments,
    setCurrentFile,
    setTotalFiles,
    setFileIds
  } = useDataImport();
  
  const [isLoading, setIsLoading] = useState(true);
  const [containerHeight, setContainerHeight] = useState('600px');
  const navigate = useNavigate();
  
  // State for help panel visibility
  const [helpOpen, setHelpOpen] = useState(false);
  
  // Get context values
  const { importComplete, appState, resetImport } = useContext(ImportContext);
  
  // Add reset success state
  const [resetSuccess, setResetSuccess] = useState(false);
  
  // Use theme breakpoints to determine container height responsively
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  const isSm = useMediaQuery(theme.breakpoints.only('sm'));
  
  // Animation springs
  const fadeInSpring = useSpring({
    from: { opacity: 0, y: 30 },
    to: { opacity: 1, y: 0 },
    delay: 300,
    config: { mass: 1, tension: 280, friction: 20 }
  });
  
  // Staggered card animations
  const cardAnimations = {
    hidden: { opacity: 0, y: 20 },
    visible: (index) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: index * 0.2,
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    })
  };
  
  // Update container height based on screen size
  useEffect(() => {
    if (isXs) {
      setContainerHeight('450px');
    } else if (isSm) {
      setContainerHeight('500px');
    } else {
      setContainerHeight('600px');
    }
  }, [isXs, isSm]);

  // Listen for app state changes
  useEffect(() => {
    const handleAppStateChange = (event) => {
      const { state } = event.detail;
      
      if (state === APP_STATES.COMPLETE) {
        // If app has complete state, finalize the UI
        setIsLoading(false);
        setUploadState('complete');
      } else if (state === APP_STATES.PROCESSING) {
        // If app is in processing state
        setIsLoading(false);
        setUploadState('uploading');
      } else if (state === APP_STATES.ERROR) {
        // If there's an error
        setIsLoading(false);
        setUploadState('error');
      } else {
        // Default state
        setIsLoading(false);
      }
    };
    
    window.addEventListener('appStateChanged', handleAppStateChange);
    
    return () => {
      window.removeEventListener('appStateChanged', handleAppStateChange);
    };
  }, [setUploadState]);

  // Handle changes to upload state
  useEffect(() => {
    // Complete initialization and notify parent if import was complete
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 10);
    
    return () => clearTimeout(timer);
  }, [uploadState]);

  // Listen for reset events
  useEffect(() => {
    const handleReset = () => {
      setResetSuccess(true);
      
      setTimeout(() => {
        setResetSuccess(false);
      }, 3000);
    };
    
    window.addEventListener('applicationReset', handleReset);
    window.addEventListener('importStatusReset', handleReset);
    
    return () => {
      window.removeEventListener('applicationReset', handleReset);
      window.removeEventListener('importStatusReset', handleReset);
    };
  }, []);

  // Handle Reset Success
  const handleResetSuccess = () => {
    setResetSuccess(true);
    resetState();  // Component-specific reset
    
    setTimeout(() => {
      setResetSuccess(false);
    }, 3000);
  };

  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length > 0) {
      handleFileUpload(selectedFiles);
    }
  };
  
  const handleDrop = (event) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFileUpload(droppedFiles);
    }
  };

  // Handle help button click
  const handleHelpClick = () => {
    setHelpOpen(true);
  };

  // Handle help panel close
  const handleHelpClose = () => {
    setHelpOpen(false);
  };

  const handleNavigateToAutoReview = () => {
    navigate('/auto-review');
  };
  
  const handleNavigateToManualReview = async () => {
    try {
      const projectId = localStorage.getItem('currentProjectId');
      const category = "Needs Review";
      
      if (projectId) {
        const commentsResponse = await getProcessedComments(
          1,
          100,
          category,
          projectId
        );
        
        if (commentsResponse.success && commentsResponse.data && 
            commentsResponse.data.comments && commentsResponse.data.comments.length > 0) {
          
          localStorage.setItem('reviewCommentsList', JSON.stringify(commentsResponse.data.comments));
          localStorage.setItem('reviewCategory', "Needs Review");
          localStorage.setItem('reviewListIndex', '0');
          localStorage.setItem('reviewTotalCount', 
            String(commentsResponse.data.pagination.total || commentsResponse.data.comments.length));
          
          const firstComment = commentsResponse.data.comments[0];
          navigate(`/manual-review?id=${firstComment.id}&category=${encodeURIComponent("Needs Review")}`);
          return;
        } else {
          const allCommentsResponse = await getProcessedComments(
            1,
            100,
            "All Tags",
            projectId
          );
          
          if (allCommentsResponse.success && allCommentsResponse.data && 
              allCommentsResponse.data.comments && allCommentsResponse.data.comments.length > 0) {
            
            localStorage.setItem('reviewCommentsList', JSON.stringify(allCommentsResponse.data.comments));
            localStorage.setItem('reviewCategory', "All Tags");
            localStorage.setItem('reviewListIndex', '0');
            localStorage.setItem('reviewTotalCount', 
              String(allCommentsResponse.data.pagination.total || allCommentsResponse.data.comments.length));
            
            const firstComment = allCommentsResponse.data.comments[0];
            navigate(`/manual-review?id=${firstComment.id}&category=${encodeURIComponent("All Tags")}`);
            return;
          }
        }
      }
      
      navigate('/manual-review');
      
    } catch (error) {
      console.error("Error navigating to manual review:", error);
      navigate('/manual-review');
    }
  };

  // Custom process files handler
  const handleProcessWithPolling = async () => {
    // Call the original process handler
    await handleProcessFiles();
    // Note: Polling is now handled by the state manager
  };

  return (
    <Box 
      sx={{ padding: 3, maxWidth: '100%', position: 'relative' }}
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Help Panel Dialog */}
      <HelpPanel open={helpOpen} onClose={handleHelpClose} />
      
      {/* Reset success message */}
      <AnimatePresence>
        {resetSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Alert 
              severity="success" 
              sx={{ 
                mb: 2, 
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  color: '#10B981'
                }
              }}
            >
              Project successfully reset. You can now start fresh.
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Header section with page title and help button */}
      {appState === APP_STATES.NO_DATA && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3
        }}>
          <Typography variant="h6" fontWeight="500" color="text.primary">
          </Typography>
          
          <Tooltip title="View data structure requirements">
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1 
              }}
              component={motion.div}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, type: "spring" }}
            >
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  display: { xs: 'none', sm: 'block' },
                  mr: 1,
                  fontWeight: 500
                }}
              >
                Data Structure:
              </Typography>
              <IconButton
                onClick={handleHelpClick}
                data-cy="help-button"
                sx={{
                  bgcolor: alpha('#6366F1', 0.1),
                  '&:hover': {
                    bgcolor: alpha('#6366F1', 0.2),
                  },
                  transition: 'all 0.2s ease',
                  boxShadow: '0 0 10px rgba(99, 102, 241, 0.1)'
                }}
                component={motion.button}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                whileHover={{ 
                  scale: 1.1,
                  rotate: [0, -10, 10, -10, 0],
                  transition: { duration: 0.5 }
                }}
                whileTap={{ scale: 0.9 }}
              >
                <HelpOutlineIcon color="primary" />
              </IconButton>
            </Box>
          </Tooltip>
        </Box>
      )}
      
      {/* Show reset button if app state is COMPLETE */}
      {appState === APP_STATES.COMPLETE && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <ResetProjectButton 
            onSuccess={handleResetSuccess}
          />
        </Box>
      )}
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: containerHeight }}>
          <motion.div
            animate={{ 
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              border: '3px solid rgba(99, 102, 241, 0.2)',
              borderTop: '3px solid #6366F1',
              borderRight: '3px solid #6366F1'
            }}
          />
        </Box>
      ) : (
        <AnimatedGrid 
          container 
          spacing={3} 
          sx={{ height: containerHeight }}
          style={fadeInSpring}
        >
          <Grid item xs={12} md={6} sx={{ height: '100%' }}>
            <motion.div variants={cardAnimations} initial="hidden" animate="visible" custom={0} style={{ height: '100%' }}>
              <FileUploadCard 
                uploadState={uploadState}
                progress={progress}
                processedComments={processedComments}
                currentFile={currentFile}
                totalFiles={totalFiles}
                files={files}
                onFileSelect={handleFileSelect}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onCancel={handleCancel}
                onReset={resetState}
                onProcessFiles={handleProcessWithPolling}
                onAutoReview={handleNavigateToAutoReview}
                onManualReview={handleNavigateToManualReview}
                onCancelProcessing={handleCancelProcessing} // Pass the new cancel processing handler
                sx={{ height: '100%' }}
                error={error}
              />
            </motion.div>
          </Grid>
          
          <Grid item xs={12} md={6} sx={{ height: '100%' }}>
            <motion.div variants={cardAnimations} initial="hidden" animate="visible" custom={1} style={{ height: '100%' }}>
              <ManualEntryCard 
                onSubmit={handleManualComment}
                sx={{ height: '100%' }} 
              />
            </motion.div>
          </Grid>
        </AnimatedGrid>
      )}
    </Box>
  );
};

export default DataImport;