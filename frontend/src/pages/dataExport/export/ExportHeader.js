import React from 'react';
import {
  Box,
  Typography,
  Button,
  alpha
} from '@mui/material';
import { motion } from 'framer-motion';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import ClearAllIcon from '@mui/icons-material/ClearAll';

const ExportHeader = ({
  onSelectAll,
  onClearAll,
  selectedCount = 0,
  filteredCount = 0,
  areAllSelected = false,
  title = "Export Comments"
}) => {
  return (
    <Box 
      sx={{ 
        p: 3, 
        borderBottom: `1px solid ${alpha('#6366F1', 0.1)}`,
        background: 'linear-gradient(to right, rgba(99, 102, 241, 0.05), transparent)'
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 2,
        justifyContent: 'space-between'
      }}>
        <Box 
          sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Box 
            component={motion.div}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
            whileHover={{ 
              rotate: [0, -10, 10, -10, 0],
              transition: { duration: 0.5 }
            }}
            sx={{ 
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
              p: 1.5,
              borderRadius: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(99, 102, 241, 0.1)'
            }}
          >
            <CloudDownloadIcon color="primary" />
          </Box>
          <Typography 
            variant="h5" 
            fontWeight="500"
            component={motion.h5}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {title}
          </Typography>
        </Box>
        
        <Box 
          sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Button 
            variant="outlined"
            size="small"
            startIcon={<SelectAllIcon />}
            onClick={onSelectAll}
            disabled={filteredCount === 0 || areAllSelected}
            sx={{ 
              borderRadius: 100,
              border: '1px solid rgba(99, 102, 241, 0.5)'
            }}
          >
            Select All
          </Button>
          
          <Button 
            variant="outlined"
            size="small"
            startIcon={<ClearAllIcon />}
            onClick={onClearAll}
            disabled={selectedCount === 0}
            sx={{ 
              borderRadius: 100,
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: 'error.main',
              '&:hover': {
                borderColor: 'error.main',
                backgroundColor: alpha('#EF4444', 0.08),
              }
            }}
          >
            Clear All
          </Button>
        </Box>
      </Box>
      
      <Typography 
        variant="body2" 
        color="text.secondary"
      >
        Select comments to export. Use filters below to refine your selection.
      </Typography>
    </Box>
  );
};

export default ExportHeader;