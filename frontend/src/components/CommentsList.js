import React, { useCallback } from 'react';
import {
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Box,
  Typography,
  TablePagination
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import { getCategoryColor } from '../utils/categoryUtils';

// Optimize row component with memo to prevent unnecessary renders
const CommentRow = React.memo(({ comment, confidenceThreshold, onRowClick, selectedCategory }) => {
  // Get category color
  const categoryColor = getCategoryColor(comment.category);
  
  // Handle row click
  const handleClick = useCallback(() => {
    onRowClick(comment, selectedCategory);
  }, [comment, onRowClick, selectedCategory]);

  return (
    <TableRow
      onClick={handleClick}
      sx={{ 
        cursor: 'pointer',
        backgroundColor: comment.confidence < confidenceThreshold 
          ? 'rgba(239, 68, 68, 0.08)' 
          : 'transparent',
        borderBottom: '1px solid rgba(99, 102, 241, 0.05)',
        '&:last-child td, &:last-child th': {
          borderBottom: 0
        },
        '&:hover': {
          backgroundColor: 'rgba(99, 102, 241, 0.1) !important',
        },
        transition: 'background-color 0.2s ease'
      }}
    >
      <TableCell sx={{ borderBottom: 'none' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {comment.id}
          {comment.confidence < confidenceThreshold && (
            <ErrorIcon 
              color="error" 
              fontSize="small" 
              sx={{ 
                ml: 1, 
                verticalAlign: 'middle',
                filter: 'drop-shadow(0 0 3px rgba(239, 68, 68, 0.5))'
              }} 
            />
          )}
        </Box>
      </TableCell>
      <TableCell 
        sx={{ 
          maxWidth: 300, 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          borderBottom: 'none'
        }}
      >
        {comment.comment}
      </TableCell>
      <TableCell sx={{ borderBottom: 'none' }}>
        {comment.category !== "Needs Review" ? (
          <Chip 
            label={comment.category} 
            color={categoryColor} 
            variant="filled" 
            sx={{ 
              fontWeight: 500,
              boxShadow: '0 0 8px rgba(99, 102, 241, 0.2)'
            }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            Low Confidence
          </Typography>
        )}
      </TableCell>
      <TableCell sx={{ 
        color: comment.confidence < confidenceThreshold ? 'error.main' : 'inherit',
        fontWeight: comment.confidence < confidenceThreshold ? 600 : 400,
        borderBottom: 'none'
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          position: 'relative'
        }}>
          <Box sx={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: comment.confidence < confidenceThreshold 
              ? 'rgba(239, 68, 68, 0.1)' 
              : 'rgba(99, 102, 241, 0.1)',
            mr: 1,
            position: 'relative'
          }}>
            <Typography variant="body2" fontWeight="bold">
              {comment.confidence}
            </Typography>
          </Box>
          <Typography variant="body2">%</Typography>
        </Box>
      </TableCell>
    </TableRow>
  );
});

const CommentsListWithPageScroll = ({ 
  comments, 
  confidenceThreshold = 50,
  onRowClick,
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalItems,
  selectedCategory = "All Tags"
}) => {
  // Handle page change
  const handleChangePage = (event, newPage) => {
    onPageChange(newPage + 1); // +1 because MUI pagination starts at 0
  };
  
  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    onPageSizeChange(parseInt(event.target.value, 10));
    onPageChange(1); // Reset to first page
  };

  // Show empty state if no comments
  if (!comments || comments.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No comments found matching the current filter.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <TableContainer 
        component={Paper}
        sx={{ 
          bgcolor: 'transparent',
          backgroundImage: 'none',
          boxShadow: 'none',
          border: 'none'
        }}
      >
        <Table sx={{ minWidth: 650, tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell 
                sx={{ 
                  color: 'text.secondary', 
                  fontWeight: 600,
                  borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
                  width: '10%'
                }}
              >
                ID
              </TableCell>
              <TableCell 
                sx={{ 
                  color: 'text.secondary', 
                  fontWeight: 600,
                  borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
                  width: '50%'
                }}
              >
                Comment
              </TableCell>
              <TableCell 
                sx={{ 
                  color: 'text.secondary', 
                  fontWeight: 600,
                  borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
                  width: '20%'
                }}
              >
                Category
              </TableCell>
              <TableCell 
                sx={{ 
                  color: 'text.secondary', 
                  fontWeight: 600,
                  borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
                  width: '20%'
                }}
              >
                Confidence
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {comments.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                confidenceThreshold={confidenceThreshold}
                onRowClick={onRowClick}
                selectedCategory={selectedCategory}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Pagination controls */}
      <TablePagination
        component="div"
        count={totalItems}
        page={currentPage - 1} // MUI pagination starts at 0
        onPageChange={handleChangePage}
        rowsPerPage={pageSize}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 20, 50, 100]}
        sx={{
          borderTop: '1px solid rgba(99, 102, 241, 0.1)',
          '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
            color: 'text.secondary'
          }
        }}
      />
    </Box>
  );
};

export default React.memo(CommentsListWithPageScroll);