import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Slider,
  Chip,
  OutlinedInput,
  alpha
} from '@mui/material';
import { getCategoryColor } from '../../../utils/categoryUtils';

const ExportFilterSection = ({
  selectedCategories = [],
  onCategoryChange,
  confidenceFilter = 0,
  onConfidenceChange,
  availableCategories = [],
  title = "Filter Comments"
}) => {
  return (
    <Box 
      sx={{ 
        p: 3, 
        borderBottom: `1px solid ${alpha('#6366F1', 0.1)}`,
        backgroundColor: alpha('#1E293B', 0.3),
        borderRadius: 2,
        mb: 3
      }}
    >
      <Typography variant="h6" fontWeight="500" gutterBottom>
        {title}
      </Typography>
      
      {/* Category filter */}
      <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
        <InputLabel id="category-filter-label">Filter by Categories</InputLabel>
        <Select
          labelId="category-filter-label"
          id="category-filter"
          multiple
          value={selectedCategories}
          onChange={onCategoryChange}
          input={<OutlinedInput label="Filter by Categories" />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => (
                <Chip 
                  key={value} 
                  label={value} 
                  color={getCategoryColor(value)}
                  sx={{ fontWeight: 500 }}
                />
              ))}
            </Box>
          )}
          sx={{ 
            borderRadius: 2,
            backgroundColor: alpha('#1E293B', 0.5),
            backdropFilter: 'blur(4px)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: alpha('#6366F1', 0.2),
            }
          }}
        >
          {availableCategories.filter(cat => cat !== "All Tags" && cat !== "Needs Review").map((category) => (
            <MenuItem key={category} value={category}>
              <Checkbox 
                checked={selectedCategories.indexOf(category) > -1} 
                color={getCategoryColor(category)}
              />
              {category}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      {/* Confidence filter */}
      <Box sx={{ width: '100%' }}>
        <Typography id="confidence-slider-label" gutterBottom>
          Minimum Confidence: {confidenceFilter}%
        </Typography>
        <Slider
          value={confidenceFilter}
          onChange={onConfidenceChange}
          aria-labelledby="confidence-slider-label"
          valueLabelDisplay="auto"
          step={10}
          marks
          min={0}
          max={100}
          sx={{
            color: 'primary.main',
            '& .MuiSlider-thumb': {
              backgroundColor: 'primary.main',
            },
            '& .MuiSlider-track': {
              background: 'linear-gradient(to right, #6366F1, #8B5CF6)',
            }
          }}
        />
      </Box>
    </Box>
  );
};

export default ExportFilterSection;