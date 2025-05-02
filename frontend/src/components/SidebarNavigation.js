import React, { useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Box,
  alpha
} from '@mui/material';
import { motion } from 'framer-motion';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AutoAwesomeMotionIcon from '@mui/icons-material/AutoAwesomeMotion';
import RateReviewIcon from '@mui/icons-material/RateReview';
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { ImportContext } from '../App';
import { slideRight, staggerChildren } from '../utils/animations';
import { getProcessedComments } from '../hooks/apiService';
import { APP_STATES, setReviewState, clearReviewState } from '../utils/stateManager';

const drawerWidth = 280;

// Custom motion components
const MotionListItem = motion(ListItem);
const MotionListItemIcon = motion(ListItemIcon);
const MotionBadge = motion(Badge);

// Define a keyframe animation for the beta badge pulse effect
const betaBadgeAnimation = {
  '@keyframes pulseBeta': {
    '0%': { 
      boxShadow: '0 0 0 0 rgba(139, 92, 246, 0.5)' 
    },
    '70%': { 
      boxShadow: '0 0 0 6px rgba(139, 92, 246, 0)' 
    },
    '100%': { 
      boxShadow: '0 0 0 0 rgba(139, 92, 246, 0)' 
    }
  }
};

const SidebarNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Use import status from context
  const { importComplete, appState, currentProjectId } = useContext(ImportContext);
  
  const handleNavigation = async (path) => {
    // Special case for pages that require data to be loaded
    if ((path === '/auto-review' || path === '/export' || path === '/manual-review')
        && appState === APP_STATES.NO_DATA) {
      // Redirect to data import page if no data is available
      navigate('/data-import');
      return;
    }
    
    // Clear review state if navigating away from manual review
    if (location.pathname.startsWith('/manual-review') && path !== '/manual-review') {
      clearReviewState();
    }
    
    // Force a remount by adding timestamp to URL for certain paths
    if ((path === '/auto-review' || path === '/export' || path === '/ai-agent')) {
      // Always add timestamp to force remount
      navigate(`${path}?t=${Date.now()}`);
    } else if (path === '/manual-review') {
      // Special handling for manual review to set up the review state
      await navigateToManualReview(path);
    } else {
      navigate(path);
    }
  };
  
  // Helper to navigate to manual review with proper state setup
  const navigateToManualReview = async (path) => {
    try {
      const projectId = currentProjectId;
      // Always start by trying to fetch "Needs Review" comments
      const category = "Needs Review";
      
      if (projectId) {
        // Try to get "Needs Review" comments
        const commentsResponse = await getProcessedComments(
          1,
          100,
          category,
          projectId
        );
        
        if (commentsResponse.success && commentsResponse.data && 
            commentsResponse.data.comments && commentsResponse.data.comments.length > 0) {
          
          // Update review state using state manager
          setReviewState({
            commentsList: commentsResponse.data.comments,
            category: "Needs Review",
            index: 0,
            totalCount: commentsResponse.data.pagination.total || commentsResponse.data.comments.length
          });
          
          const firstComment = commentsResponse.data.comments[0];
          navigate(`/manual-review?id=${firstComment.id}&category=${encodeURIComponent(category)}`);
          return;
        } else {
          // If no "Needs Review" comments, ALWAYS try "All Tags"
          const allCommentsResponse = await getProcessedComments(
            1,
            100,
            "All Tags",
            projectId
          );
          
          if (allCommentsResponse.success && allCommentsResponse.data && 
              allCommentsResponse.data.comments && allCommentsResponse.data.comments.length > 0) {
            
            // Update review state using state manager 
            setReviewState({
              commentsList: allCommentsResponse.data.comments,
              category: "All Tags",
              index: 0,
              totalCount: allCommentsResponse.data.pagination.total || allCommentsResponse.data.comments.length
            });
            
            const firstComment = allCommentsResponse.data.comments[0];
            navigate(`/manual-review?id=${firstComment.id}&category=${encodeURIComponent("All Tags")}`);
            return;
          }
        }
      }
      
      // If all else fails, just navigate to the path
      navigate(path);
      
    } catch (error) {
      console.error("Error navigating to manual review:", error);
      navigate(path);
    }
  };

  const navigationItems = [
    { 
      path: '/data-import', 
      text: 'Data Import', 
      icon: <CloudUploadIcon />,
      badge: false
    },
    { 
      path: '/auto-review', 
      text: 'Auto Review', 
      icon: <AutoAwesomeMotionIcon />,
      disabled: !importComplete,
      badge: importComplete
    },
    { 
      path: '/manual-review', 
      text: 'Manual Review', 
      icon: <RateReviewIcon />,
      disabled: !importComplete,
      badge: importComplete
    },
    { 
      path: '/export', 
      text: 'Data Export', 
      icon: <DownloadForOfflineIcon />,
      disabled: !importComplete,
      badge: importComplete
    },
    { 
      path: '/ai-agent', 
      text: 'AI Agent', 
      icon: <SmartToyIcon />,
      badge: false,
      beta: true
    }
  ];

  // Extract base path without query params for active state
  const currentPath = location.pathname;

  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          border: 'none',
          boxShadow: '0px 0px 15px rgba(0, 0, 0, 0.3)',
          background: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
          borderRight: '1px solid rgba(99, 102, 241, 0.1)',
        },
        // Add keyframe animation to the global styles
        '@global': betaBadgeAnimation
      }}
      variant="permanent"
      anchor="left"
    >
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
      }}>
        <Box 
          sx={{ p: 2, mb: 2 }}
          component={motion.div}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <Typography 
            variant="h5" 
            component="div" 
            color="primary" 
            fontWeight="700" 
            sx={{ 
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <Box 
              component={motion.div}
              whileHover={{ 
                rotate: 360,
                transition: { duration: 0.8, ease: "easeInOut" }
              }}
              sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                boxShadow: '0 0 15px rgba(99, 102, 241, 0.5)',
              }}
            >
              AI
            </Box>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Comment AI
            </motion.span>
          </Typography>
        </Box>
        
        <Divider sx={{ my: 1, borderColor: alpha('#6366F1', 0.2) }} />
        
        <List 
          sx={{ px: 2, py: 1 }}
          component={motion.ul}
          variants={staggerChildren}
          initial="hidden"
          animate="visible"
        >
          {navigationItems.map((item, index) => {
            const isActive = currentPath === item.path;
            
            return (
              <MotionListItem 
                key={item.path} 
                disablePadding 
                sx={{ mb: 0.5 }}
                variants={slideRight}
                custom={index}
                initial="hidden"
                animate="visible"
                whileHover={{ x: 5 }}
                transition={{ delay: index * 0.1 + 0.2 }}
              >
                <ListItemButton 
                  selected={isActive}
                  onClick={() => handleNavigation(item.path)}
                  disabled={item.disabled}
                  sx={{ 
                    borderRadius: 12,
                    py: 1.5,
                    pl: 2,
                    pr: 3,
                    opacity: item.disabled ? 0.6 : 1,
                    backgroundColor: isActive ? alpha('#6366F1', 0.15) : 'transparent',
                    '&:hover': {
                      backgroundColor: isActive ? alpha('#6366F1', 0.25) : alpha('#6366F1', 0.08),
                    },
                    '&.Mui-selected': {
                      backgroundColor: alpha('#6366F1', 0.2),
                      '&:hover': {
                        backgroundColor: alpha('#6366F1', 0.25),
                      },
                    },
                    '&.Mui-disabled': {
                      opacity: 0.6,
                    }
                  }}
                >
                  <MotionListItemIcon 
                    sx={{
                      minWidth: 40,
                      color: isActive ? 'primary.main' : 'text.secondary',
                    }}
                    whileHover={{ 
                      rotate: [0, -10, 10, -10, 0],
                      transition: { duration: 0.5 }
                    }}
                  >
                    {item.badge ? (
                      <MotionBadge 
                        color="success" 
                        variant="dot"
                        overlap="circular"
                        sx={{
                          '& .MuiBadge-badge': {
                            backgroundColor: '#10B981',
                            boxShadow: '0 0 5px #10B981'
                          }
                        }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500 }}
                      >
                        {item.icon}
                      </MotionBadge>
                    ) : (
                      item.icon
                    )}
                  </MotionListItemIcon>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            fontWeight: isActive ? 600 : 400,
                            color: isActive ? 'primary.main' : 'text.primary',
                          }}
                        >
                          {item.text}
                        </Typography>
                        
                        {item.beta && (
                          <Box
                            component={motion.div}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.1 }}
                            transition={{ delay: 0.5, type: "spring", stiffness: 400 }}
                            sx={{
                              ml: 1,
                              px: 1,
                              py: 0.2,
                              borderRadius: 4,
                              fontSize: '0.6rem',
                              fontWeight: 'bold',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase',
                              background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                              color: 'white',
                              boxShadow: '0 2px 6px rgba(139, 92, 246, 0.4)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              lineHeight: 1,
                              animation: 'pulseBeta 2s infinite',
                            }}
                          >
                            Beta
                          </Box>
                        )}
                      </Box>
                    } 
                  />
                </ListItemButton>
              </MotionListItem>
            );
          })}
        </List>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Divider sx={{ my: 1, borderColor: alpha('#6366F1', 0.2) }} />
        
        <Box 
          sx={{ p: 2 }}
          component={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <Typography variant="body2" color="text.secondary">
            Version 2.8.3
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};

export default SidebarNavigation;