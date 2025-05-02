import React, { useContext, useEffect, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  CssBaseline
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

import SidebarNavigation from './SidebarNavigation';
import DataImport from '../pages/dataImport/DataImport';
import AutoReview from '../pages/autoReview/AutoReview';
import ManualReview from '../pages/manualReview/ManualReview';
import DataExport from '../pages/dataExport/DataExport';
import AgentPage from '../pages/agent/AgentPage';
import { ImportContext } from '../App';
import ParticleBackground from '../components/particles/ParticleBackground';
import { fadeIn, slideUp } from '../utils/animations';
import { clearReviewState, APP_STATES } from '../utils/stateManager';

// Custom animated routes container
const AnimatedRoutes = ({ children }) => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={fadeIn}
        style={{ height: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { importComplete, appState } = useContext(ImportContext);
  
  // Use a ref to track the previous path
  const prevPathRef = useRef(location.pathname);
  
  // Clear manual review localStorage when route changes away from manual-review
  useEffect(() => {
    // Check if we navigated away from the manual-review page to a completely different section
    if (prevPathRef.current.startsWith('/manual-review') && 
        !location.pathname.startsWith('/manual-review') &&
        !location.pathname.startsWith('/auto-review')) { // Only clear when going to unrelated pages
      clearReviewState();
    }
    
    // Update the previous path ref for the next check
    prevPathRef.current = location.pathname;
  }, [location.pathname]);
  
  // Redirect based on app state
  useEffect(() => {
    // If no data and not on data import page, redirect to data import
    if (appState === APP_STATES.NO_DATA && 
        location.pathname !== '/' && 
        location.pathname !== '/ai-agent' && 
        location.pathname !== '/data-import') {
      navigate('/data-import');
    }
  }, [appState, location.pathname, navigate]);
  
  // Function to get page title based on current path
  const getPageTitle = (path) => {
    const basePath = path.split('?')[0]; // Remove query params
    switch (basePath) {
      case '/data-import':
        return 'Import & Process Comments';
      case '/auto-review':
        return 'Auto Review';
      case '/manual-review':
        return 'Manual Review';
      case '/ai-agent':
        return 'AI Agent';
      case '/export':
        return 'Data Export';
      default:
        return 'AI Comment Review System';
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      <CssBaseline />
      <ParticleBackground />
      
      {/* Glowing accent shapes */}
      <Box 
        sx={{ 
          position: 'fixed', 
          top: -100, 
          right: -100, 
          width: 300, 
          height: 300, 
          borderRadius: '50%', 
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(15, 23, 42, 0) 70%)',
          filter: 'blur(40px)',
          zIndex: 0
        }} 
      />
      
      <Box 
        sx={{ 
          position: 'fixed', 
          bottom: -50, 
          left: -50, 
          width: 200, 
          height: 200, 
          borderRadius: '50%', 
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0) 70%)',
          filter: 'blur(40px)',
          zIndex: 0
        }} 
      />
      
      <AppBar
        position="fixed"
        elevation={0}
        sx={{ 
          width: `calc(100% - 280px)`, 
          ml: `280px`,
          backgroundColor: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.1)'
        }}
        component={motion.div}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 30 }}
      >
        <Toolbar>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, type: "spring" }}
          >
            <Typography variant="h4" noWrap component="div" color="text.primary" fontWeight="600">
              {getPageTitle(location.pathname)}
            </Typography>
          </motion.div>
        </Toolbar>
      </AppBar>
      
      <SidebarNavigation />
      
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          bgcolor: 'background.default', 
          p: 3,
          position: 'relative',
          overflow: 'hidden',
          zIndex: 1
        }}
      >
        <Toolbar />
        <Container maxWidth="xl">
          <AnimatedRoutes>
            <Routes location={location} key={location.pathname}>
              <Route path="/data-import" element={
                <motion.div variants={slideUp}>
                  <DataImport />
                </motion.div>
              } />
              <Route path="/auto-review" element={
                <motion.div variants={slideUp}>
                  <AutoReview />
                </motion.div>
              } />
              <Route path="/manual-review" element={
                <motion.div variants={slideUp}>
                  <ManualReview />
                </motion.div>
              } />
              <Route path="/export" element={
                <motion.div variants={slideUp}>
                  <DataExport />
                </motion.div>
              } />
              <Route path="/ai-agent" element={
                <motion.div variants={slideUp}>
                  <AgentPage />
                </motion.div>
              } />
            </Routes>
          </AnimatedRoutes>
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;