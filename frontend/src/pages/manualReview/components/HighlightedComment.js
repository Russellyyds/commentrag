import React from 'react';
import { Typography, Box, alpha } from '@mui/material';

/**
 * Component to display comment text with highlighted keywords
 * 
 * @param {Object} props - Component props
 * @param {string} props.text - Comment text to display
 * @param {string[]} props.keywords - Keywords to highlight (array of strings)
 * @param {Object} props.sx - Additional styles for the container
 */
const HighlightedComment = ({ text, keywords = [], sx = {} }) => {
  // If no keywords or empty text, just render the text directly
  if (!keywords || !keywords.length || !text) {
    return (
      <Typography 
        variant="body1" 
        sx={{ 
          color: 'text.primary',
          lineHeight: 1.6,
          p: 2,
          borderRadius: 2,
          backgroundColor: alpha('#1E293B', 0.3),
          ...sx
        }}
      >
        {text || "No comment text available"}
      </Typography>
    );
  }

  // Function to highlight all occurrences of all keywords
  const highlightKeywords = (text, keywords) => {
    // Nothing to highlight if text is empty
    if (!text) return [];
    
    // Prepare the text parts and their types (normal or highlight)
    const result = [];
    
    // Create a regex OR pattern with all keywords, escaping special characters
    // This will match any of the keywords in a case-insensitive way
    const escapedKeywords = keywords.map(keyword => 
      keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
    );
    const pattern = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');
    
    // Split the text using the pattern, preserving the matches
    const parts = text.split(pattern);
    
    // Check if each part is a keyword and mark it for highlighting
    let currentPos = 0;
    
    parts.forEach(part => {
      if (!part) return; // Skip empty parts
      
      // Check if this part is a keyword (case-insensitive match)
      const isKeyword = keywords.some(keyword => 
        part.toLowerCase() === keyword.toLowerCase()
      );
      
      // Add this part to the result
      result.push({
        text: part,
        isHighlighted: isKeyword,
        position: currentPos
      });
      
      currentPos += part.length;
    });
    
    return result;
  };

  // Get highlighted parts
  const parts = highlightKeywords(text, keywords);

  return (
    <Typography 
      variant="body1" 
      sx={{ 
        color: 'text.primary',
        lineHeight: 1.6,
        p: 2,
        borderRadius: 2,
        backgroundColor: alpha('#1E293B', 0.3),
        ...sx
      }}
    >
      {parts.map((part, index) => (
        <Box 
          component="span" 
          key={`${index}-${part.position}`} 
          sx={part.isHighlighted ? {
            backgroundColor: 'primary.main',
            padding: '2px 4px',
            margin: '0 1px',
            borderRadius: '3px',
            fontWeight: 600,
            color: '#F8FAFC',
            boxShadow: `0 0 4px primary.main`,
            position: 'relative',
            textShadow: '0 0 1px rgba(0,0,0,0.3)',
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: '2px',
              backgroundColor: 'primary.main',
              borderRadius: '1px'
            }
          } : {}}
        >
          {part.text}
        </Box>
      ))}
    </Typography>
  );
};

export default HighlightedComment;