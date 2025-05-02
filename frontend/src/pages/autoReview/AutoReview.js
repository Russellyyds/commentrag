import React, { useState, useContext, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper
} from '@mui/material';
import { motion } from 'framer-motion';
import FilterSection from '../../components/review/FilterSection';
import { ImportContext } from '../../App';
import { fadeIn, slideUp } from '../../utils/animations';
import useAutoReview from '../../hooks/useAutoReview';
import { APP_STATES } from '../../utils/stateManager';

import StatsSection from './components/StatsSection';
import AutoReviewHeader from './components/AutoReviewHeader';
import AutoReviewStateDisplay from './components/AutoReviewStateDisplay';
import { useAppStore } from '../../utils/zustandStore';
import { getProcessedComments } from '../../hooks/apiService';

const AutoReview = () => {
  const { importComplete, currentProjectId, resetImport, checkProcessingStatus, appState } = useContext(ImportContext);
  const navigate = useNavigate();
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Use the hook to get all review state and actions
  const {
    comments,
    isLoading,
    error,
    currentPage,
    totalPages,
    totalComments,
    pageSize,
    selectedCategory,
    confidenceThreshold,
    categoryStats,
    projectStatus,
    handlePageChange,
    handleCategoryChange,
    setPageSize,
    refreshComments,
    refreshStats
  } = useAutoReview(currentProjectId);
  
  // Handle page processing status check on component mount and after navigation
  useEffect(() => {
    const checkStatus = async () => {
      if (currentProjectId) {
        setIsRefreshing(true);
        try {
          const response = await checkProcessingStatus(currentProjectId);
          
          if (response.success) {
            // If processing is complete or error, refresh comments and stats
            if (response.status === 'completed' || response.status === 'error') {
              await refreshStats();
              await refreshComments();
            }
          }
        } catch (error) {
          console.error("Error checking processing status:", error);
        } finally {
          setIsRefreshing(false);
        }
      }
    };
    
    checkStatus();
  }, [currentProjectId, checkProcessingStatus, refreshStats, refreshComments]);
  
  // Handle row click to navigate to manual review
  const handleRowClick = useCallback((comment) => {
    // For single comment view (from the comments list)
    // Just navigate to the specific comment without category parameter
    // This ensures the list navigation won't appear for single comments
    navigate(`/manual-review?id=${comment.id}`);
  }, [navigate]);
  
  // Handle reset success
  const handleResetSuccess = useCallback(() => {
    setResetSuccess(true);
    
    setTimeout(() => {
      navigate('/data-import');
    }, 1500);
  }, [navigate]);

  // Listen for application reset events
  useEffect(() => {
    const handleReset = () => {
      setResetSuccess(false);
    };
    
    window.addEventListener('applicationReset', handleReset);
    window.addEventListener('importStatusReset', handleReset);
    
    return () => {
      window.removeEventListener('applicationReset', handleReset);
      window.removeEventListener('importStatusReset', handleReset);
    };
  }, []);

  // Check if we should render the filter section
  const shouldRenderFilterSection = () => {
    return importComplete && 
           !isLoading && 
           !error && 
           projectStatus?.status !== 'in_progress' && 
           comments?.length > 0 &&
           appState === APP_STATES.COMPLETE;
  };

  // Function to render the filter section
  const renderFilterSection = () => {
    if (!shouldRenderFilterSection()) {
      return null;
    }
    
    return (
      <FilterSection 
        selectedCategory={selectedCategory} 
        onCategoryChange={handleCategoryChange}
        stats={categoryStats}
      />
    );
  };

  // Check if we should render the stats section
  const shouldRenderStatsSection = () => {
    return shouldRenderFilterSection();
  };

  // Function to render the stats section
  const renderStatsSection = () => {
    if (!shouldRenderStatsSection()) {
      return null;
    }
    
    return (
      <StatsSection 
        stats={categoryStats} 
        selectedCategory={selectedCategory}
        currentProjectId={currentProjectId}
      />
    );
  };

  return (
    <Box 
      sx={{ width: '100%' }}
      component={motion.div}
      variants={fadeIn}
      initial="hidden"
      animate="visible"
    >
      <AutoReviewHeader 
        resetSuccess={resetSuccess} 
        currentProjectId={currentProjectId} 
        handleResetSuccess={handleResetSuccess}
        importComplete={importComplete}
      />
      
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
        {renderFilterSection()}
        
        {renderStatsSection()}
        
        <Box sx={{ p: 2 }}>
          <AutoReviewStateDisplay 
            importComplete={importComplete}
            isLoading={isLoading || isRefreshing}
            error={error}
            projectStatus={projectStatus}
            comments={comments}
            confidenceThreshold={confidenceThreshold}
            handleRowClick={handleRowClick}
            currentPage={currentPage}
            totalPages={totalPages}
            handlePageChange={handlePageChange}
            pageSize={pageSize}
            setPageSize={setPageSize}
            totalComments={totalComments}
            appState={appState}
            selectedCategory={selectedCategory}
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default React.memo(AutoReview);