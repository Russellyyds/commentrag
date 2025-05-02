import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  alpha
} from '@mui/material';
import { motion } from 'framer-motion';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useAppStore } from '../../utils/zustandStore';

const FilterSection = ({ 
  selectedCategory, 
  onCategoryChange, 
  stats = {} 
}) => {
  // Create a dynamic list of categories based on stats
  // Exclude categories with zero comments and default system categories
  const availableCategories = [
    'All Tags', // Always include this option
    ...Object.keys(stats)
      .filter(category => 
        stats[category]?.count > 0 && 
        !['All Tags'].includes(category)
      )
      .sort((a, b) => stats[b].count - stats[a].count)
  ];

  // If no categories exist, return null
  if (availableCategories.length <= 1) {
    return null;
  }

  return (
    <Box 
      sx={{ 
        p: 3, 
        borderBottom: `1px solid ${alpha('#6366F1', 0.1)}`,
        background: 'linear-gradient(to right, rgba(99, 102, 241, 0.05), transparent)'
      }}
      component={motion.div}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 3
      }}>
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
            mr: 2,
            boxShadow: '0 0 10px rgba(99, 102, 241, 0.1)'
          }}
        >
          <FilterListIcon color="primary" />
        </Box>
        <Typography 
          variant="h5" 
          fontWeight="500"
          component={motion.h5}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          Filter Comments
        </Typography>
      </Box>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <FormControl variant="outlined" sx={{ minWidth: 280 }}>
          <InputLabel id="category-select-label">Filter by Category</InputLabel>
          <Select
            labelId="category-select-label"
            id="category-select"
            value={selectedCategory}
            onChange={onCategoryChange}
            label="Filter by Category"
            sx={{ 
              borderRadius: 3,
              backgroundColor: alpha('#1E293B', 0.5),
              backdropFilter: 'blur(4px)',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha('#6366F1', 0.2),
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha('#6366F1', 0.4),
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
              },
              '& .MuiSelect-select': {
                color: 'text.primary'
              }
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: '#1E293B',
                  backgroundImage: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.05), transparent 70%)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(99, 102, 241, 0.1)',
                  borderRadius: 2,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                  '& .MuiMenuItem-root': {
                    '&:hover': {
                      backgroundColor: alpha('#6366F1', 0.1),
                    },
                    '&.Mui-selected': {
                      backgroundColor: alpha('#6366F1', 0.15),
                      '&:hover': {
                        backgroundColor: alpha('#6366F1', 0.2),
                      }
                    }
                  }
                }
              }
            }}
          >
            {availableCategories.map((category) => (
              <MenuItem key={category} value={category}>
                {category} 
                {stats[category] && stats[category].count > 0 && (
                  <Typography 
                    component="span" 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ ml: 1 }}
                  >
                    ({stats[category].count})
                  </Typography>
                )}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </motion.div>
    </Box>
  );
};

export default FilterSection;