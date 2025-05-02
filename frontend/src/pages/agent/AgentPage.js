import React, { useContext, useEffect, useState } from 'react';
import { Box, Paper, Typography, Fade, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import { fadeIn } from '../../utils/animations';
import AgentChat from './AgentChat';
import { ImportContext } from '../../App';
import { useAgentRequestPolling } from '../../hooks/useAgentRequestPolling';
import AgentRequestManager from '../../utils/agentRequestManager';
import { useAppStore } from '../../utils/zustandStore';

const AgentPage = () => {
  const { importComplete, appState } = useContext(ImportContext);
  const [showPendingBanner, setShowPendingBanner] = useState(false);
  
  // Custom hook to check for pending agent requests
  const { isPending } = useAgentRequestPolling();
  
  // Effect to check for pending requests on mount and show banner if needed
  useEffect(() => {
    const pendingRequest = AgentRequestManager.getPendingRequest();
    if (pendingRequest) {
      setShowPendingBanner(true);
      
      // Hide banner after 5 seconds
      const timer = setTimeout(() => {
        setShowPendingBanner(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  // Update banner visibility when polling status changes
  useEffect(() => {
    setShowPendingBanner(isPending);
  }, [isPending]);

  return (
    <Box 
      sx={{ width: '100%' }}
      component={motion.div}
      variants={fadeIn}
      initial="hidden"
      animate="visible"
    >
      {/* Pending Request Banner */}
      <Fade in={showPendingBanner} timeout={500}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            backgroundColor: alpha('#8B5CF6', 0.1),
            border: '1px solid rgba(139, 92, 246, 0.2)',
            display: showPendingBanner ? 'block' : 'none'
          }}
        >
          <Typography variant="body2" color="#8B5CF6">
            Processing your last agent request in the background. Results will appear shortly.
          </Typography>
        </Paper>
      </Fade>
      
      <AgentChat />
    </Box>
  );
};

export default AgentPage;