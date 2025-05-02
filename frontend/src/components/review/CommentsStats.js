import React, { useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Chip,
  alpha,
  useTheme,
  IconButton,
  Collapse,
  CircularProgress
} from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import InfoIcon from '@mui/icons-material/Info';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { getCategoryColor } from '../../utils/categoryUtils';
import { getProcessedComments } from '../../hooks/apiService';
import { useAppStore } from '../../utils/zustandStore';

const CommentsStats = React.memo(({ stats, selectedCategory, isGlobalStats = false, currentProjectId }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  // Use Zustand for expanded state instead of localStorage
  const statsExpanded = useAppStore(state => 
    isGlobalStats 
      ? state.uiPreferences.statsExpanded.global
      : state.uiPreferences.statsExpanded.filtered
  );
  const setStatsExpanded = useAppStore(state => state.setStatsExpanded);
  
  // Toggle expanded state using Zustand
  const handleToggleExpand = () => {
    const section = isGlobalStats ? 'global' : 'filtered';
    setStatsExpanded(section, !statsExpanded);
  };
  
  // Loading state for category click
  const [loadingCategory, setLoadingCategory] = React.useState(null);
  
  // Handle category card click - navigate to manual review with category filter
  const handleCategoryClick = async (category, count) => {
    // Skip navigation for categories with no comments
    if (count === 0) return;
    
    try {
      // Set loading state for this category
      setLoadingCategory(category);
      
      // Fetch comments for this category (first page, reasonable page size)
      const response = await getProcessedComments(
        1, // First page
        100, // Get up to 100 comments at once
        category,
        currentProjectId
      );
      
      if (!response.success || !response.data || !response.data.comments || response.data.comments.length === 0) {
        console.error('Failed to fetch comments for category:', category);
        setLoadingCategory(null);
        return;
      }
      
      // Get comments list from response
      const commentsList = response.data.comments;
      const firstComment = commentsList[0];
      
      // Use Zustand to store review state
      const setReviewState = useAppStore.getState().setReviewState;
      setReviewState({
        commentsList,
        category,
        index: 0,
        totalCount: response.data.pagination.total || commentsList.length
      });
      
      // Navigate to manual review page with first comment ID
      // IMPORTANT: Include the category parameter to trigger list navigation display
      navigate(`/manual-review?id=${firstComment.id}&category=${encodeURIComponent(category)}`);
    } catch (error) {
      console.error('Error fetching category comments:', error);
    } finally {
      setLoadingCategory(null);
    }
  };
  
  // Use memoized color getter
  const getSafeColor = useMemo(() => {
    return (category) => {
      const colorName = getCategoryColor(category);
      // Check if color exists in theme
      if (theme.palette[colorName] && theme.palette[colorName].main) {
        return colorName;
      }
      // Use primary as fallback
      return 'primary';
    };
  }, [theme]);
  
  // Process stats data
  const statsData = useMemo(() => {
    // Return empty data if no stats
    if (!stats || Object.keys(stats).length === 0) {
      return { statsArray: [], totalComments: 0 };
    }
    
    // Convert stats to array
    let statsArray = Object.entries(stats)
      .map(([category, data]) => ({
        category,
        count: data.count || 0,
        percentage: data.percentage || 0
      }));
    
    // Find "Needs Review" entry if it exists
    const needsReviewIndex = statsArray.findIndex(item => item.category === "Needs Review");
    const okIndex = statsArray.findIndex(item => item.category === "OK");
    // Store items that need special sorting
    let needsReviewItem = null;
    let okItem = null;
    // If "Needs Review" is found, remove it first
    if (needsReviewIndex !== -1) {
      needsReviewItem = statsArray.splice(needsReviewIndex, 1)[0];
    }
    // If "OK" is found, also remove it (note: index may change after removal)
    if (okIndex !== -1) {
      // If "Needs Review" was already removed and it was before "OK", the index needs adjustment
      const adjustedOkIndex = (needsReviewIndex !== -1 && needsReviewIndex < okIndex) ? okIndex - 1 : okIndex;
      okItem = statsArray.splice(adjustedOkIndex, 1)[0];
    }
    // Sort the remaining items by count
    statsArray.sort((a, b) => b.count - a.count);
    // Add back "Needs Review" and "OK" in specific order
    if (okItem && needsReviewItem) {
      // Both exist, order as: Needs Review, OK, others
      statsArray = [needsReviewItem, okItem, ...statsArray];
    } else if (needsReviewItem) {
      // Only "Needs Review" exists
      statsArray = [needsReviewItem, ...statsArray];
    } else if (okItem) {
      // Only "OK" exists
      statsArray = [okItem, ...statsArray];
    }
    
    // Calculate total comments, excluding "Needs Review" category
    const totalComments = statsArray.reduce((sum, stat) => 
      stat.category !== "Needs Review" ? sum + stat.count : sum, 0);
    
    return { statsArray, totalComments };
  }, [stats]);
  
  // Return null if no stats, but after all hooks
  if (!stats || Object.keys(stats).length === 0) {
    return null;
  }
  
  const { statsArray, totalComments } = statsData;
  
  return (
    <Box 
      sx={{ 
        p: 3, 
        borderBottom: `1px solid ${alpha('#6366F1', 0.1)}`
      }}
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: statsExpanded ? 2 : 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isGlobalStats ? (
            <EqualizerIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          ) : (
            <InfoIcon sx={{ mr: 1, color: theme.palette.info.main }} />
          )}
          <Typography variant="h6" fontWeight="500">
            {isGlobalStats ? "Global Comment Distribution" : "Comment Distribution"}
            {!isGlobalStats && selectedCategory !== 'All Tags' && (
              <Typography component="span" color="text.secondary" variant="body2" sx={{ ml: 1 }}>
                (filtered by {selectedCategory})
              </Typography>
            )}
            {isGlobalStats && (
              <Typography component="span" color="text.secondary" variant="body2" sx={{ ml: 1 }}>
                (showing all comments regardless of filter)
              </Typography>
            )}
          </Typography>
        </Box>
        
        {/* Toggle button */}
        <IconButton 
          onClick={handleToggleExpand}
          size="small"
          sx={{ 
            backgroundColor: alpha('#6366F1', 0.1),
            '&:hover': {
              backgroundColor: alpha('#6366F1', 0.2),
            },
            transition: 'transform 0.3s ease',
            transform: statsExpanded ? 'rotate(0deg)' : 'rotate(180deg)',
          }}
        >
          <KeyboardArrowUpIcon />
        </IconButton>
      </Box>
      
      {/* Collapsible content */}
      <Collapse in={statsExpanded} timeout="auto" unmountOnExit>
        <Grid container spacing={2}>
          {statsArray.map((stat, index) => {
            // Get color safely
            const safeColorName = getSafeColor(stat.category);
            const isLoading = loadingCategory === stat.category;
            
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={stat.category}>
                <Paper
                  elevation={0}
                  component={motion.div}
                  whileHover={stat.count > 0 ? { scale: 1.03, y: -4 } : {}}
                  whileTap={stat.count > 0 ? { scale: 0.98 } : {}}
                  onClick={() => stat.count > 0 && !isLoading && handleCategoryClick(stat.category, stat.count)}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: alpha(
                      theme.palette[safeColorName].main,
                      0.08
                    ),
                    border: `1px solid ${alpha(
                      theme.palette[safeColorName].main, 
                      0.1
                    )}`,
                    height: '100%',
                    cursor: stat.count > 0 && !isLoading ? 'pointer' : 'default',
                    transition: 'all 0.2s ease-in-out',
                    position: 'relative',
                    '&:hover': stat.count > 0 && !isLoading ? {
                      backgroundColor: alpha(
                        theme.palette[safeColorName].main,
                        0.12
                      ),
                      boxShadow: `0 4px 12px ${alpha(
                        theme.palette[safeColorName].main,
                        0.2
                      )}`,
                    } : {}
                  }}
                >
                  {isLoading && (
                    <Box sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: alpha('#1E293B', 0.6),
                      borderRadius: 2,
                      zIndex: 10
                    }}>
                      <CircularProgress size={30} color={safeColorName} />
                    </Box>
                  )}
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
                    <Typography variant="body2" fontWeight="500">
                      {stat.category}
                    </Typography>
                    <Chip
                      label={`${stat.percentage.toFixed(1)}%`}
                      size="small"
                      sx={{
                        backgroundColor: alpha(
                          theme.palette[safeColorName].main,
                          0.2
                        ),
                        color: theme.palette[safeColorName].main,
                        fontWeight: 'bold',
                        fontSize: '0.7rem'
                      }}
                    />
                  </Box>
                  
                  <Typography variant="h6" fontWeight="600" color={theme.palette[safeColorName].main}>
                    {stat.count}
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      comments
                    </Typography>
                    {stat.count > 0 && (
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, display: 'block', fontSize: '0.7rem' }}>
                        Click to review
                      </Typography>
                    )}
                  </Typography>
                  
                  {/* Static progress bar */}
                  <Box sx={{ mt: 1, width: '100%', height: 4, borderRadius: 2, backgroundColor: alpha('#1E293B', 0.3) }}>
                    <Box
                      sx={{
                        height: '100%',
                        width: `${stat.percentage}%`,
                        borderRadius: 8,
                        backgroundColor: theme.palette[safeColorName].main
                      }}
                    />
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
        
        <Box sx={{ mt: 2, textAlign: 'right' }}>
          <Typography variant="body2" color="text.secondary">
            Total: {totalComments} comments
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
});

export default CommentsStats;