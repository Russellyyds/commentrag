import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Paper,
  alpha,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { motion } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';
import DataObjectIcon from '@mui/icons-material/DataObject';
import TableChartIcon from '@mui/icons-material/TableChart';
import CodeIcon from '@mui/icons-material/Code';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';

const HelpPanel = ({ open, onClose }) => {
  // Sample data structure examples
  const csvExample = `id,comment,timestamp,source
1,"This service was excellent","2023-04-01","website"
2,"I had a problem with my order","2023-04-02","email"
3,"The staff was very rude to me","2023-04-03","phone"
...`;

  const jsonExample = `[
  {
    "id": 1,
    "comment": "This service was excellent",
    "timestamp": "2023-04-01",
    "source": "website"
  },
  {
    "id": 2,
    "comment": "I had a problem with my order",
    "timestamp": "2023-04-02",
    "source": "email"
  },
  ...
]`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperComponent={motion.div}
      PaperProps={{
        initial: { opacity: 0, y: -20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
        sx: {
          borderRadius: 4,
          backgroundColor: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(99, 102, 241, 0.1)',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'linear-gradient(to right, rgba(99, 102, 241, 0.05), transparent)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
          p: 3
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            component={motion.div}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            sx={{ 
              bgcolor: alpha('#6366F1', 0.1),
              p: 1.5,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.1)'
            }}
          >
            <DataObjectIcon color="primary" fontSize="medium" />
          </Box>
          <Typography variant="h5" fontWeight="500">
            Data Structure Requirements
          </Typography>
        </Box>
        <IconButton 
          onClick={onClose}
          sx={{ 
            bgcolor: alpha('#6366F1', 0.05),
            '&:hover': {
              bgcolor: alpha('#6366F1', 0.1),
            },
            transition: 'all 0.2s ease'
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight="500" gutterBottom color="primary.main">
            Supported File Formats
          </Typography>
          <Typography variant="body1" paragraph>
            The system supports the following file formats for comment imports:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            {['CSV', 'TSV', 'Excel (.xlsx/.xls)', 'JSON'].map((format) => (
              <Paper 
                key={format}
                sx={{ 
                  px: 2, 
                  py: 1, 
                  borderRadius: 2,
                  bgcolor: alpha('#6366F1', 0.05),
                  border: '1px solid rgba(99, 102, 241, 0.1)'
                }}
              >
                <Typography variant="body2" fontWeight="500">
                  {format}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 3, borderColor: alpha('#6366F1', 0.1) }} />
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight="500" gutterBottom color="primary.main">
            Data Structure Format
          </Typography>
          <Typography variant="body1" paragraph>
            Your data files need to include both comment text and ID fields. The system will automatically classify the comments.
          </Typography>
          
          <TableContainer component={Paper} sx={{ bgcolor: alpha('#1E293B', 0.4), borderRadius: 2, mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ 
                  '& th': { 
                    borderBottom: `1px solid ${alpha('#6366F1', 0.2)}`,
                    bgcolor: alpha('#1E293B', 0.6)
                  } 
                }}>
                  <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Field Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Required</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Example Column Names</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: alpha('#1E293B', 0.3) } }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                  <TableCell>Unique identifier for each comment</TableCell>
                  <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>Yes</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {['id', 'ID', 'comment_id', 'CommentID'].map(name => (
                        <Box key={name} component="span" sx={{ 
                          px: 1, 
                          py: 0.5, 
                          fontSize: '0.7rem', 
                          bgcolor: alpha('#6366F1', 0.1),
                          borderRadius: 1,
                          fontFamily: 'monospace'
                        }}>
                          {name}
                        </Box>
                      ))}
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: alpha('#1E293B', 0.3) } }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Comment Text</TableCell>
                  <TableCell>The actual comment text to be analyzed and classified</TableCell>
                  <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>Yes</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {['comment', 'Comment', 'text', 'Text', 'content', 'Content', 'RawComment'].map(name => (
                        <Box key={name} component="span" sx={{ 
                          px: 1, 
                          py: 0.5, 
                          fontSize: '0.7rem', 
                          bgcolor: alpha('#6366F1', 0.1),
                          borderRadius: 1,
                          fontFamily: 'monospace'
                        }}>
                          {name}
                        </Box>
                      ))}
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: alpha('#1E293B', 0.3) } }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Other Columns</TableCell>
                  <TableCell>Any additional data columns you wish to include</TableCell>
                  <TableCell sx={{ color: 'info.main' }}>Optional</TableCell>
                  <TableCell>timestamp, source, author, etc.</TableCell>
                </TableRow>
                <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: alpha('#1E293B', 0.3) } }}>
                  <TableCell sx={{ fontWeight: 'bold', fontStyle: 'italic' }}>...</TableCell>
                  <TableCell colSpan={3} sx={{ fontStyle: 'italic' }}>Any number of additional columns can be included in your data</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box 
            sx={{ 
              p: 2, 
              borderRadius: 2, 
              bgcolor: alpha('#10B981', 0.05),
              border: '1px solid rgba(16, 185, 129, 0.1)',
              mb: 3
            }}
          >
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <ArrowRightIcon color="success" sx={{ mr: 1, mt: -0.5 }} />
              <span>
                <strong>Note:</strong> You don't need to pre-categorize your comments. The system will 
                automatically analyze and classify the comments for you.
              </span>
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3, borderColor: alpha('#6366F1', 0.1) }} />
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight="500" gutterBottom color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TableChartIcon fontSize="small" />
            CSV/Excel Example
          </Typography>
          <Paper 
            sx={{ 
              p: 2, 
              borderRadius: 2, 
              bgcolor: alpha('#1E293B', 0.6),
              border: '1px solid rgba(99, 102, 241, 0.1)',
              overflow: 'auto'
            }}
          >
            <Typography 
              variant="body2" 
              component="pre" 
              sx={{ 
                whiteSpace: 'pre',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                color: '#F8FAFC'
              }}
            >
              {csvExample}
            </Typography>
          </Paper>
        </Box>
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight="500" gutterBottom color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CodeIcon fontSize="small" />
            JSON Example
          </Typography>
          <Paper 
            sx={{ 
              p: 2, 
              borderRadius: 2, 
              bgcolor: alpha('#1E293B', 0.6),
              border: '1px solid rgba(99, 102, 241, 0.1)',
              overflow: 'auto'
            }}
          >
            <Typography 
              variant="body2" 
              component="pre" 
              sx={{ 
                whiteSpace: 'pre',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                color: '#F8FAFC'
              }}
            >
              {jsonExample}
            </Typography>
          </Paper>
        </Box>
        
        <Box 
          sx={{ 
            p: 2, 
            borderRadius: 2, 
            bgcolor: alpha('#10B981', 0.05),
            border: '1px solid rgba(16, 185, 129, 0.1)',
            mt: 4
          }}
        >
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'flex-start' }}>
            <ArrowRightIcon color="success" sx={{ mr: 1, mt: -0.5 }} />
            <span>If your data isn't perfectly formatted, don't worry. The system will automatically detect and process your data as best it can.</span>
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(99, 102, 241, 0.1)' }}>
        <Button 
          onClick={onClose} 
          data-cy="close-help-panel"
          variant="contained"
          sx={{ 
            borderRadius: 100,
            px: 4,
            backgroundImage: 'linear-gradient(45deg, #6366F1, #8B5CF6)'
          }}
          disableElevation
        >
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HelpPanel;