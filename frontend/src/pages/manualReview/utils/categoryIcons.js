import React from 'react';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import SentimentVerySatisfiedIcon from '@mui/icons-material/SentimentVerySatisfied';
import LanguageIcon from '@mui/icons-material/Language';
import PsychologyIcon from '@mui/icons-material/Psychology';
import FaceIcon from '@mui/icons-material/Face';
import CommentIcon from '@mui/icons-material/Comment';

// Get icon for category
export const getCategoryIcon = (category) => {
  switch(category) {
    case 'Complaint':
      return <SentimentVeryDissatisfiedIcon />;
    case 'OK':
      return <SentimentVerySatisfiedIcon />;
    case 'Language':
      return <LanguageIcon />;
    case 'Mental Health':
      return <PsychologyIcon />;
    case 'Cultural':
    case 'Sexism':
      return <FaceIcon />;
    default:
      return <CommentIcon />;
  }
};