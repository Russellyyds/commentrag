import React, { useState, useEffect, memo } from 'react';
import {
  ListItem,
  Paper,
  Typography,
  Box,
  Chip
} from '@mui/material';
import { motion } from 'framer-motion';
import { getCategoryColor } from '../../utils/categoryUtils';

// Simpler animation for typing effect - less CPU intensive
const TypingAnimation = () => {
  return (
    <Box sx={{ display: 'flex', gap: 1, my: 1, mx: 'auto', justifyContent: 'center' }}>
      {[0, 1, 2].map((dot) => (
        <motion.div
          key={dot}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 0.8, // Slower animation is less CPU intensive
            repeat: Infinity,
            repeatType: 'loop',
            delay: dot * 0.15
          }}
          style={{
            width: 6,
            height: 6,
            backgroundColor: 'white',
            borderRadius: '50%'
          }}
        />
      ))}
    </Box>
  );
};

// Cache test for category patterns as a global regex to avoid recreating it
const categoryPattern = /"([^"]+)"\s+\((\d+)%\s+similarity,\s+Category:\s+([^)]+)\)/g;
const mainCategoryPattern = /categorized as "([\w\s]+)" with (\d+)% confidence/;
const agentCategoryPattern = /categorized it as "([\w\s]+)" with (\d+)% confidence/;

// Helper to check if text contains a category pattern - memoized by message text
const extractCategoryInfo = (() => {
  // Cache for previous results to avoid regex processing on the same text
  const cache = new Map();
  
  return (text) => {
    // Return cached result if available
    if (cache.has(text)) {
      return cache.get(text);
    }
    
    let matches = [];
    let match;
    
    // Create a new regex instance for execution
    const categoryRegex = new RegExp(categoryPattern);
    
    // Check for similar comments with categories
    while ((match = categoryRegex.exec(text)) !== null) {
      matches.push({
        comment: match[1],
        similarity: match[2],
        category: match[3]
      });
    }
    
    // Check for main classification - standard pattern
    let mainMatch = mainCategoryPattern.exec(text);
    
    // If standard pattern doesn't match, try agent pattern
    if (!mainMatch) {
      mainMatch = agentCategoryPattern.exec(text);
    }
    
    const result = mainMatch ? {
      hasCategory: true,
      mainCategory: {
        category: mainMatch[1],
        confidence: mainMatch[2]
      },
      similarCategories: matches
    } : {
      hasCategory: matches.length > 0,
      mainCategory: null,
      similarCategories: matches
    };
    
    // Cache the result
    cache.set(text, result);
    
    // Limit cache size to avoid memory leaks (keep last 50 results)
    if (cache.size > 50) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  };
})();

// Format text with highlighted categories - this can be heavy and slow with lots of text
const formatTextWithCategories = (text) => {
  const { hasCategory, mainCategory, similarCategories } = extractCategoryInfo(text);
  
  if (!hasCategory) return <Typography variant="body2">{text}</Typography>;
  
  // Split text by line breaks to handle main classification and similar comments sections
  const lines = text.split('\n\n');
  
  return (
    <>
      {lines.map((line, lineIndex) => {
        // Skip empty lines for better performance
        if (!line.trim()) return null;
        
        // Main classification line (usually first line)
        if (lineIndex === 0 && mainCategory) {
          const parts = line.split(`"${mainCategory.category}"`);
          return (
            <Typography key={lineIndex} variant="body2" sx={{ mb: 1 }}>
              {parts[0]}"
              <Chip 
                label={mainCategory.category}
                size="small"
                color={getCategoryColor(mainCategory.category)}
                sx={{ 
                  mx: 0.5, 
                  height: 20, 
                  '& .MuiChip-label': { px: 1, py: 0.2, fontSize: '0.75rem' } 
                }}
              />
              " with {mainCategory.confidence}% confidence.
              {parts[1] ? parts[1].split('confidence.')[1] : ''}
            </Typography>
          );
        }
        
        // Check if this is a similar comment line with a category
        for (const categoryInfo of similarCategories) {
          if (line.includes(`"${categoryInfo.comment}"`)) {
            const parts = line.split(`Category: ${categoryInfo.category}`);
            const prefix = parts[0].substring(0, parts[0].lastIndexOf('('));
            
            return (
              <Typography key={lineIndex} variant="body2" sx={{ mb: 0.5 }}>
                {prefix}(
                {categoryInfo.similarity}% similarity, Category: 
                <Chip 
                  label={categoryInfo.category}
                  size="small"
                  color={getCategoryColor(categoryInfo.category)}
                  sx={{ 
                    mx: 0.5, 
                    height: 20, 
                    '& .MuiChip-label': { px: 1, py: 0.2, fontSize: '0.75rem' } 
                  }}
                />
                )
              </Typography>
            );
          }
        }
        
        // Regular line
        return line.trim() ? (
          <Typography key={lineIndex} variant="body2" sx={{ mb: 0.5 }}>
            {line}
          </Typography>
        ) : null;
      })}
    </>
  );
};

const MessageBubble = ({ message, isUser }) => {
  // Only show typing animation for AI messages with a delay
  const [showTyping, setShowTyping] = useState(!isUser);
  const [showContent, setShowContent] = useState(isUser);
  
  useEffect(() => {
    if (!isUser) {
      // Show typing animation briefly - reduced from 1000ms to 600ms
      const typingTimer = setTimeout(() => {
        setShowTyping(false);
        setShowContent(true);
      }, 600);
      
      return () => clearTimeout(typingTimer);
    }
  }, [isUser]);

  // Memoize the formatted text to avoid recalculating on every render
  const formattedContent = React.useMemo(() => {
    if (!showContent) return null;
    
    return isUser ? (
      <Typography variant="body2">{message.text}</Typography>
    ) : (
      formatTextWithCategories(message.text)
    );
  }, [showContent, isUser, message.text]);

  return (
    <ListItem 
      alignItems="flex-start" 
      sx={{
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        px: 1,
        py: 0.5
      }}
    >
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          maxWidth: '80%',
          backgroundColor: isUser ? 'primary.main' : 'background.paper',
          backgroundImage: isUser 
            ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' 
            : 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))',
          color: isUser ? 'white' : 'text.primary',
          borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
          boxShadow: isUser 
            ? '0 4px 12px rgba(99, 102, 241, 0.2)' 
            : '0 4px 12px rgba(0, 0, 0, 0.1)',
          wordBreak: 'break-word',
          border: isUser 
            ? 'none'
            : '1px solid rgba(99, 102, 241, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {showTyping && !isUser && <TypingAnimation />}
        
        {showContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }} // Faster transition
          >
            <Box
              sx={{ 
                position: 'relative',
                zIndex: 1,
                fontWeight: isUser ? 400 : 500,
                lineHeight: 1.6
              }}
            >
              {formattedContent}
            </Box>
          </motion.div>
        )}
        
        {/* Add subtle gradient background for AI messages - simplified animation */}
        {!isUser && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.05), transparent 70%)',
              zIndex: 0
            }}
          />
        )}
        
        {/* Add subtle glow for user messages - simplified animation */}
        {isUser && (
          <Box
            component={motion.div}
            animate={{ 
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ 
              duration: 3, // Slower animation is less CPU intensive
              repeat: Infinity,
              repeatType: 'reverse'
            }}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.1), transparent 70%)',
              filter: 'blur(8px)',
              zIndex: 0
            }}
          />
        )}
      </Paper>
    </ListItem>
  );
};

// Use memo to prevent unnecessary rerenders
export default memo(MessageBubble);