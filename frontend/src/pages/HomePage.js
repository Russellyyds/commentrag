import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Container } from '@mui/material';
import { motion } from 'framer-motion';
import ParticleBackground from '../components/particles/ParticleBackground';
import ai from '../assets/ai.png';

const HomePage = () => {
  const navigate = useNavigate();
  
  const handleGetStarted = () => {
    navigate('/data-import');
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'background.default'
      }}
    >
      {/* Background effects */}
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
      
      <Container 
        maxWidth="xl" 
        sx={{ 
          display: 'flex',
          flexGrow: 1,
          alignItems: 'center',
          py: { xs: 6, md: 8 }
        }}
      >
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            width: '100%',
            position: 'relative',
            zIndex: 1
          }}
        >
          {/* Content Section */}
          <Box 
            sx={{ 
              flex: 1, 
              pr: { md: 6 },
              mb: { xs: 6, md: 0 },
              textAlign: { xs: 'center', md: 'left' }
            }}
            component={motion.div}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Typography 
              variant="h2" 
              fontWeight="800" 
              sx={{ 
                mb: 3,
                background: 'linear-gradient(90deg, #6366F1 0%, #8B5CF6 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' }
              }}
            >
              Intelligent AI Comment Analysis System
            </Typography>
            
            <Typography 
              variant="h6" 
              color="text.secondary" 
              sx={{ 
                mb: 4, 
                lineHeight: 1.6,
                maxWidth: { md: '80%', xs: '100%' }
              }}
            >
              Harness the power of RAG classification to automatically analyze, categorize, and moderate user comments. Our AI system identifies potential issues from cultural biases to language concerns, streamlining your content moderation workflow.
            </Typography>
            
            <Button
              variant="contained"
              size="large"
              onClick={handleGetStarted}
              sx={{ 
                borderRadius: 100,
                px: 6,
                py: 1.5,
                fontSize: '1.1rem',
                backgroundImage: 'linear-gradient(45deg, #6366F1, #8B5CF6)',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)'
              }}
              component={motion.button}
              whileHover={{ 
                scale: 1.05,
                boxShadow: '0 6px 25px rgba(99, 102, 241, 0.5)'
              }}
              whileTap={{ scale: 0.97 }}
              disableElevation
            >
              Get Started
            </Button>
          </Box>
          
          {/* Image Section */}
          <Box 
            sx={{ 
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              position: 'relative'
            }}
            component={motion.div}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            {/* Glow effect behind image */}
            <Box
              sx={{
                position: 'absolute',
                width: '80%',
                height: '80%',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15), transparent 70%)',
                filter: 'blur(40px)',
                zIndex: 0
              }}
            />
            
            <motion.img 
              src={ai} 
              alt="AI Comment Analysis" 
              style={{ 
                maxWidth: '100%', 
                height: 'auto',
                position: 'relative',
                zIndex: 1
              }}
              animate={{
                y: [0, -15, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut'
              }}
            />
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default HomePage;