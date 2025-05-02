import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  alpha
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';

const ExportFormatSection = ({
  exportFormat = 'csv',
  onFormatChange,
  onExport,
  selectedCount = 0,
  filteredCount = 0,
  totalCount = 0,
  isExporting = false,
  disabled = false
}) => {
  return (
    <Box 
      sx={{ 
        p: 3, 
        borderTop: `1px solid ${alpha('#6366F1', 0.1)}`,
        backgroundColor: alpha('#1E293B', 0.2),
        backdropFilter: 'blur(4px)',
        borderRadius: 2
      }}
    >
      <Typography variant="h6" fontWeight="500" gutterBottom>
        Export Options
      </Typography>
      
      <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
        <InputLabel id="format-select-label">Export Format</InputLabel>
        <Select
          labelId="format-select-label"
          id="format-select"
          value={exportFormat}
          onChange={onFormatChange}
          label="Export Format"
          sx={{ 
            borderRadius: 2,
            backgroundColor: alpha('#1E293B', 0.5),
            backdropFilter: 'blur(4px)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: alpha('#6366F1', 0.2),
            }
          }}
        >
          <MenuItem value="csv">CSV (Comma Separated)</MenuItem>
          <MenuItem value="tsv">TSV (Tab Separated)</MenuItem>
          <MenuItem value="excel">Excel (.xlsx)</MenuItem>
        </Select>
      </FormControl>
      
      <Box sx={{ mt: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={isExporting ? <CircularProgress size={24} color="inherit" /> : <CloudDownloadIcon />}
          disabled={disabled || selectedCount === 0 || isExporting}
          onClick={onExport}
          fullWidth
          sx={{ 
            py: 1.5,
            borderRadius: 100,
            backgroundImage: 'linear-gradient(45deg, #6366F1, #8B5CF6)'
          }}
          disableElevation
        >
          {isExporting ? 'Exporting...' : `Export ${selectedCount} Comments`}
        </Button>
        
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            display: 'block', 
            textAlign: 'center',
            mt: 1
          }}
        >
          {selectedCount} of {filteredCount} filtered comments selected
          {filteredCount < totalCount && ` (${totalCount - filteredCount} comments filtered out)`}
        </Typography>
      </Box>
    </Box>
  );
};

export default ExportFormatSection;