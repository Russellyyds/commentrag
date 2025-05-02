import React, { useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Chip,
  Typography,
  alpha,
  Paper
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import { getCategoryColor } from '../../../utils/categoryUtils';

// Checkbox-enabled comment row component
const CommentTableRow = React.memo(({ 
  comment, 
  isSelected, 
  onToggleSelect, 
  confidenceThreshold,
  isFiltered
}) => {
  // console.log(comment);
  // Get category color for display
  const categoryColor = getCategoryColor(comment.category);
  
  return (
    <TableRow
      hover
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
        opacity: isFiltered ? 1 : 0.5,
        transition: 'all 0.2s ease'
      }}
    >
      <TableCell padding="checkbox">
        <Checkbox
          checked={isSelected}
          onChange={(e) => onToggleSelect(comment.id, e.target.checked)}
          disabled={!isFiltered}
          sx={{ 
            color: 'primary.main',
            '&.Mui-disabled': {
              color: 'rgba(99, 102, 241, 0.3)'
            }
          }}
        />
      </TableCell>
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
        <Chip 
          label={comment.category} 
          color={categoryColor} 
          variant="filled" 
          sx={{ 
            fontWeight: 500,
            boxShadow: '0 0 8px rgba(99, 102, 241, 0.2)'
          }}
        />
      </TableCell>
      <TableCell sx={{ 
        color: comment.confidence < confidenceThreshold ? 'error.main' : 'inherit',
        fontWeight: comment.confidence < confidenceThreshold ? 600 : 400,
        borderBottom: 'none'
      }}>
        {comment.confidence}%
      </TableCell>
    </TableRow>
  );
});

// Table header row with select all checkbox
const TableHeaderRow = React.memo(({ 
  onSelectAllClick, 
  numSelected, 
  rowCount, 
  allFilteredSelected,
  filteredCount
}) => {
  return (
    <TableHead
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: alpha('#1E293B', 0.9),
        backdropFilter: 'blur(8px)'
      }}
    >
      <TableRow>
        <TableCell padding="checkbox">
          <Checkbox
            color="primary"
            indeterminate={numSelected > 0 && numSelected < filteredCount}
            checked={filteredCount > 0 && allFilteredSelected}
            onChange={onSelectAllClick}
            disabled={filteredCount === 0}
          />
        </TableCell>
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
  );
});

// Empty state component
const EmptyTableState = React.memo(({ message }) => (
  <Box sx={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100%',
    minHeight: 300,
    p: 3
  }}>
    <Typography variant="body1" color="text.secondary" align="center">
      {message || "No comments available to display."}
    </Typography>
  </Box>
));

// Main export comment table component
const ExportCommentTable = ({ 
  filteredComments = [],
  selectedComments = {},
  onToggleSelect,
  onSelectAll,
  confidenceThreshold = 80,
  selectedCount = 0,
  filteredCount = 0,
  tableHeight = 400,
  isLoading = false
}) => {
  // Determine if all filtered comments are selected
  const areAllFilteredSelected = useMemo(() => {
    return filteredComments.every(comment => 
      !comment.isFiltered || selectedComments[comment.id]
    );
  }, [filteredComments, selectedComments]);

  // Empty state message
  const emptyMessage = useMemo(() => {
    if (isLoading) {
      return "Loading comments...";
    } else if (filteredComments.length === 0) {
      return "No comments available.";
    } else if (filteredCount === 0) {
      return "No comments match the current filters.";
    }
    return "No comments to display.";
  }, [filteredComments, filteredCount, isLoading]);

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        mb: 3,
        backgroundColor: alpha('#1E293B', 0.3),
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(99, 102, 241, 0.1)',
        overflow: 'hidden'
      }}
    >
      <TableContainer 
        sx={{ 
          height: tableHeight,
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: alpha('#1E293B', 0.3),
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: alpha('#6366F1', 0.5),
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: alpha('#6366F1', 0.7),
            }
          }
        }}
      >
        <Table stickyHeader>
          <TableHeaderRow
            onSelectAllClick={onSelectAll}
            numSelected={selectedCount}
            rowCount={filteredComments.length}
            allFilteredSelected={areAllFilteredSelected}
            filteredCount={filteredCount}
          />
          
          {filteredComments.length > 0 ? (
            <TableBody>
              {filteredComments.map((comment) => (
                <CommentTableRow
                  key={comment.id}
                  comment={comment}
                  isSelected={!!selectedComments[comment.id]}
                  onToggleSelect={onToggleSelect}
                  confidenceThreshold={confidenceThreshold}
                  isFiltered={comment.isFiltered}
                />
              ))}
            </TableBody>
          ) : (
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} sx={{ border: 'none' }}>
                  <EmptyTableState message={emptyMessage} />
                </TableCell>
              </TableRow>
            </TableBody>
          )}
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ExportCommentTable;