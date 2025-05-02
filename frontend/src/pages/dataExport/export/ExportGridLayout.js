import React from 'react';
import {
  Box,
  Grid
} from '@mui/material';

const ExportGridLayout = ({ filterSection, formatSection }) => {
  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          {filterSection}
        </Grid>
        
        <Grid item xs={12} md={6}>
          {formatSection}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExportGridLayout;