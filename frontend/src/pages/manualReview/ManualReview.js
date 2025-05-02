import React, { useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Chip,
  CircularProgress,
  IconButton,
  alpha,
  Divider,
  Stack,
  FormControl,
  Select,
  MenuItem,
  useTheme
} from '@mui/material';
import { motion } from 'framer-motion';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { ImportContext } from '../../App';
import { fadeIn } from '../../utils/animations';
import { getCategoryColor, categories } from '../../utils/categoryUtils';
import { getCategoryIcon } from './utils/categoryIcons';
import { APP_STATES } from '../../utils/stateManager';
import { useManualReview } from '../../hooks/useManualReview'; 

import ActionButtons from './components/ActionButtons';
import EmptyStateMessage from './states/EmptyStateMessage';
import HighlightedComment from './components/HighlightedComment';

const ManualReview = () => {
  const { importComplete, currentProjectId, appState } = useContext(ImportContext);
  const navigate = useNavigate();
  const theme = useTheme();
  
  // Use the custom hook for all manual review state and actions
  const {
    comment,
    keywords,
    similarComments,
    selectedCategory,
    isSubmitting,
    isLoading,
    error,
    isRefreshing,
    commentsList,
    currentIndex,
    totalCount,
    listCategory,
    completedItems,
    handlePrevItem,
    handleNextItem,
    navigateBack,
    exitListMode,
    refreshCommentsList,
    handleSubmit,
    setSelectedCategory,
    setError
  } = useManualReview();

  // Check URL params to determine navigation type
  const searchParams = new URLSearchParams(window.location.search);
  const categoryParam = searchParams.get('category');

  // Monitor application state changes
  useEffect(() => {
    // If no data and not on data import page, redirect to data import
    if (appState === APP_STATES.NO_DATA) {
      navigate('/data-import');
    }
  }, [appState, navigate]);

  // Render loading state
  if (isLoading || isRefreshing) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Render empty state
  if (!importComplete || appState !== APP_STATES.COMPLETE) {
    return <EmptyStateMessage message="Please import data first from the Data Import page." />;
  } else if (!comment) {
    return <EmptyStateMessage message="No comment found for this ID." />;
  }

  // Get category color and icon
  const categoryColor = comment ? getCategoryColor(comment.category) : 'primary';
  const currentCommentId = comment?.id;
  const isCurrentCompleted = completedItems[currentCommentId];

  // Inner card style for consistency
  const innerCardStyle = {
    backgroundColor: alpha('#1E293B', 0.7),
    borderRadius: 3,
    border: '1px solid rgba(99, 102, 241, 0.1)',
    overflow: 'hidden',
    backdropFilter: 'blur(10px)',
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.02), transparent 70%)',
      zIndex: -1
    }
  };

  // Determine whether to show list navigation
  // We show navigation if:
  // 1. We have a comments list with more than 1 item
  // 2. Either:
  //    a. We have a specific category parameter in the URL, OR
  //    b. We have reviewState with a non-empty category that's not "All Tags"
  const shouldShowListNavigation = commentsList.length > 1 && 
      (searchParams.has('category') || (listCategory && listCategory !== "All Tags"));
  
  // Determine if we're in single comment mode
  const isSingleCommentMode = !shouldShowListNavigation;

  // Custom submit handler for single comment mode
  const handleSingleCommentSubmit = async () => {
    // Call the original submit handler
    await handleSubmit();
    
    // In single comment mode, after submission, navigate back to auto-review
    // with a timestamp to force refresh
    if (isSingleCommentMode) {
      navigate('/auto-review?refresh=' + Date.now());
    }
  };

  return (
    <Box 
      sx={{ width: '100%' }}
      component={motion.div}
      variants={fadeIn}
      initial="hidden"
      animate="visible"
    >
      {/* Main Card Wrapper */}
      <Paper
        elevation={0}
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
        {/* Consolidated Header with Navigation */}
        <Box sx={{ 
          p: 3, 
          borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, rgba(99, 102, 241, 0.08), transparent)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton 
              onClick={isSingleCommentMode ? navigateBack : exitListMode}
              sx={{ 
                bgcolor: alpha('#6366F1', 0.08),
                mr: 2,
                '&:hover': {
                  bgcolor: alpha('#6366F1', 0.15),
                },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" fontWeight="500">
              Comment ID: {comment?.id}
            </Typography>
          </Box>

          {comment && (
            <Chip 
              icon={getCategoryIcon(comment.category)}
              label={`${comment.category} (${comment.confidence}%)`} 
              color={categoryColor} 
              variant="filled"
              sx={{ 
                borderRadius: 4, 
                px: 1, 
                fontWeight: 500,
                boxShadow: '0 0 10px rgba(99, 102, 241, 0.2)'
              }}
            />
          )}
        </Box>

        {/* List navigation - conditionally displayed */}
        {shouldShowListNavigation && (
          <Box sx={{ 
            px: 3, 
            py: 2, 
            borderBottom: '1px solid rgba(99, 102, 241, 0.05)',
            background: alpha('#1E293B', 0.3)
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip 
                  label={`${listCategory}`}
                  color={getCategoryColor(listCategory)}
                  sx={{ mr: 2, fontWeight: 500 }}
                />
                <Typography variant="body2" color="text.secondary">
                  Comment {currentIndex + 1} of {commentsList.length} 
                  <Typography component="span" color="text.secondary" sx={{ opacity: 0.6, ml: 1 }}>
                    (Total: {totalCount})
                  </Typography>
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {isCurrentCompleted && (
                  <Chip 
                    label="Reviewed"
                    color="success"
                    size="small"
                    icon={<CheckCircleIcon />}
                    sx={{ mr: 2 }}
                  />
                )}
                
                <IconButton 
                  onClick={handlePrevItem}
                  disabled={currentIndex === 0}
                  sx={{ 
                    bgcolor: alpha('#6366F1', 0.08),
                    '&:hover': {
                      bgcolor: alpha('#6366F1', 0.15),
                    },
                    mr: 1
                  }}
                >
                  <KeyboardArrowLeftIcon />
                </IconButton>
                
                <IconButton 
                  onClick={handleNextItem}
                  disabled={currentIndex === commentsList.length - 1}
                  sx={{ 
                    bgcolor: alpha('#6366F1', 0.08),
                    '&:hover': {
                      bgcolor: alpha('#6366F1', 0.15),
                    },
                    transition: 'all 0.2s'
                  }}
                >
                  <KeyboardArrowRightIcon />
                </IconButton>
              </Box>
            </Box>
          </Box>
        )}
        
        {/* Error Message */}
        {error && (
          <Box sx={{ 
            mx: 3, 
            mt: 3, 
            p: 2, 
            backgroundColor: alpha('#EF4444', 0.05),
            borderRadius: 2,
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            <Typography color="error" align="center">
              {error}
            </Typography>
          </Box>
        )}
        
        {/* Content Section */}
        <Box sx={{ p: 3 }}>
          {/* Inner Card 1: Comment Details and Similar Comments */}
          <Paper
            elevation={0}
            sx={{
              ...innerCardStyle,
              mb: 3
            }}
          >
            <Box sx={{ p: 3 }}>
              {/* Comment Details Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight="500" mb={2}>
                  Comment:
                </Typography>
                
                {isLoading ? (
                  <Box sx={{ 
                    height: 100, 
                    backgroundColor: alpha('#1E293B', 0.3),
                    borderRadius: 2,
                    animation: 'pulse 1.5s infinite ease-in-out'
                  }} />
                ) : (
                  <HighlightedComment
                    text={comment?.comment || "No comment text available"}
                    keywords={keywords}/>
                )}
                
                {comment?.reasoning && (
                  <Typography variant="body2" color="text.secondary" mt={1} ml={2}>
                    System Reason: {comment.reasoning}
                  </Typography>
                )}
              </Box>
              
              {/* Similar Comments Section with Divider */}
              <Divider sx={{ my: 3, borderColor: alpha('#6366F1', 0.1) }} />
              
              <Box>
                <Typography variant="h6" fontWeight="500" mb={2}>
                  Similar Comments:
                </Typography>
                
                {isLoading ? (
                  <Stack spacing={2}>
                    {[1, 2].map((item) => (
                      <Box key={item} sx={{ 
                        p: 2, 
                        borderRadius: 2, 
                        backgroundColor: alpha('#1E293B', 0.3),
                        height: 80
                      }} />
                    ))}
                  </Stack>
                ) : similarComments && similarComments.length > 0 ? (
                  <Stack spacing={2}>
                    {similarComments.map((similar, index) => (
                      <Box 
                        key={`${similar.id}-${index}`} 
                        sx={{ 
                          p: 2, 
                          borderRadius: 2, 
                          backgroundColor: alpha('#1E293B', 0.3),
                          borderLeft: `4px solid ${alpha(theme.palette[getCategoryColor(similar.category || 'primary')].main, 0.7)}`,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: alpha('#1E293B', 0.4),
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" fontWeight="500">
                            ID: {similar.id}
                          </Typography>
                          {similar.category && (
                            <Chip 
                              size="small" 
                              label={similar.category} 
                              color={getCategoryColor(similar.category)}
                              sx={{ 
                                borderRadius: 4,
                                fontWeight: 500
                              }}
                            />
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {similar.comment || "No text available"}
                        </Typography>
                        {similar.similarity && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Similarity: {Math.round((similar.similarity || 0) * 100)}%
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Box sx={{ 
                    textAlign: 'center', 
                    p: 3, 
                    borderRadius: 2,
                    backgroundColor: alpha('#1E293B', 0.2),
                  }}>
                    <Typography variant="body2" color="text.secondary">
                      No similar comments found.
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Paper>
          
          {/* Inner Card 2: Manual Review Category Selection */}
          <Paper
            elevation={0}
            sx={innerCardStyle}
          >
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="500" mb={2}>
                Manual Review
              </Typography>
              
              <Typography variant="body2" color="text.secondary" mb={1}>
                Assign Category
              </Typography>
              
              {isLoading ? (
                <Box sx={{ 
                  height: 56, 
                  backgroundColor: alpha('#1E293B', 0.3),
                  borderRadius: 2,
                }} />
              ) : (
                <FormControl fullWidth>
                  <Select
                    value={selectedCategory || ""}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    displayEmpty
                    sx={{ 
                      borderRadius: 3,
                      backgroundColor: alpha('#0F172A', 0.3),
                      backdropFilter: 'blur(4px)',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: alpha('#6366F1', 0.2),
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: alpha('#6366F1', 0.4),
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main',
                      }
                    }}
                    renderValue={(selected) => {
                      if (!selected) {
                        return <Typography color="text.secondary">Select a category</Typography>;
                      }
                      
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box 
                            sx={{ 
                              mr: 1, 
                              display: 'flex',
                              color: getCategoryColor(selected) + '.main'
                            }}
                          >
                            {getCategoryIcon(selected)}
                          </Box>
                          {selected}
                        </Box>
                      );
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          backgroundColor: '#1E293B',
                          backgroundImage: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.05), transparent 70%)',
                          backdropFilter: 'blur(16px)',
                          border: '1px solid rgba(99, 102, 241, 0.1)',
                          borderRadius: 2,
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                          '& .MuiMenuItem-root': {
                            '&:hover': {
                              backgroundColor: alpha('#6366F1', 0.1),
                            },
                            '&.Mui-selected': {
                              backgroundColor: alpha('#6366F1', 0.15),
                              '&:hover': {
                                backgroundColor: alpha('#6366F1', 0.2),
                              }
                            }
                          }
                        }
                      }
                    }}
                  >
                    {categories.filter(cat => cat !== "All Tags" && cat !== "Needs Review").map((category) => (
                      <MenuItem key={category} value={category}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box 
                            sx={{ 
                              mr: 1, 
                              display: 'flex',
                              color: getCategoryColor(category) + '.main'
                            }}
                          >
                            {getCategoryIcon(category)}
                          </Box>
                          {category}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              {/* Action Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                <ActionButtons 
                  onCancel={isSingleCommentMode ? navigateBack : handleNextItem}
                  onSubmit={isSingleCommentMode ? handleSingleCommentSubmit : handleSubmit}
                  isSubmitting={isSubmitting}
                  cancelLabel={isSingleCommentMode ? "Cancel" : "Skip"}
                  submitLabel="Submit"
                />
              </Box>
            </Box>
          </Paper>
        </Box>
      </Paper>
    </Box>
  );
};

export default ManualReview;