import React, { useEffect, useRef } from 'react';
import {
  Box
} from '@mui/material';
import { motion } from 'framer-motion';
import { fadeIn } from '../../utils/animations';
import useDataExport from '../../hooks/useDataExport';

// Import components from export modules
import {
  ExportCommentTable,
  ExportFilterSection,
  ExportFormatSection,
  ExportHeader
} from './export';

// Import decomposed components
import ExportStateHandler from './export/ExportStateHandler';
import NotificationBar from './export/NotificationBar';
import ResetProjectSection from './export/ResetProjectSection';
import ExportContentWrapper from './export/ExportContentWrapper';
import ExportGridLayout from './export/ExportGridLayout';

const DataExport = () => {
  // Track if component is mounted
  const isMounted = useRef(true);
  // Track render count for debugging
  const renderCount = useRef(0);
  
  // Only log the first 10 renders to avoid flooding the console
  useEffect(() => {
    const count = ++renderCount.current;
    if (count <= 10) {
      console.log(`DataExport rendered: ${count} times`);
    }
    
    return () => {
      isMounted.current = false;
      if (count <= 10) {
        console.log('DataExport unmounted');
      }
    };
  });
  
  // Use custom hook to get all export states and handlers
  const {
    comments,
    isLoading,
    error,
    isRefreshing,
    selectedComments,
    exportFormat,
    selectedCategories,
    confidenceFilter,
    exportInProgress,
    exportError,
    exportSuccess,
    resetSuccess,
    categoryStats,
    projectStatus,
    availableCategories,
    filteredComments,
    filteredCount,
    selectedCount,
    areAllFilteredSelected,
    handleToggleSelect,
    handleSelectAllFiltered,
    handleClearAllSelection,
    handleSelectAllToggle,
    handleCategoryFilterChange,
    handleConfidenceChange,
    handleFormatChange,
    handleExport,
    handleResetSuccess
  } = useDataExport();

  return (
    <Box 
      sx={{ width: '100%' }}
      component={motion.div}
      variants={fadeIn}
      initial="hidden"
      animate="visible"
    >
      {/* Notifications */}
      <NotificationBar 
        resetSuccess={resetSuccess} 
        exportSuccess={exportSuccess} 
        exportError={exportError} 
      />
      
      {/* Reset project button */}
      <ResetProjectSection 
        onResetSuccess={handleResetSuccess} 
      />
      
      {/* Main content - state dependent */}
      <ExportStateHandler
        importComplete={comments.length > 0}
        isLoading={isLoading || isRefreshing}
        error={error}
        projectStatus={projectStatus}
        comments={comments}
      >
        <ExportContentWrapper>
          {/* Header with selection controls */}
          <ExportHeader 
            onSelectAll={handleSelectAllFiltered}
            onClearAll={handleClearAllSelection}
            selectedCount={selectedCount}
            filteredCount={filteredCount}
            areAllSelected={areAllFilteredSelected}
            title="Export Comments"
          />
          
          {/* Comment table with internal scrolling */}
          <Box sx={{ p: 2 }}>
            <ExportCommentTable 
              filteredComments={filteredComments}
              selectedComments={selectedComments}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAllToggle}
              confidenceThreshold={80}
              selectedCount={selectedCount}
              filteredCount={filteredCount}
              tableHeight={400}
              isLoading={isLoading || isRefreshing}
            />
          </Box>
          
          {/* Export settings section */}
          <ExportGridLayout 
            filterSection={
              <ExportFilterSection 
                selectedCategories={selectedCategories}
                onCategoryChange={handleCategoryFilterChange}
                confidenceFilter={confidenceFilter}
                onConfidenceChange={handleConfidenceChange}
                availableCategories={availableCategories}
                title="Filter Settings"
              />
            }
            formatSection={
              <ExportFormatSection 
                exportFormat={exportFormat}
                onFormatChange={handleFormatChange}
                onExport={handleExport}
                selectedCount={selectedCount}
                filteredCount={filteredCount}
                totalCount={comments.length}
                isExporting={exportInProgress}
                disabled={selectedCount === 0}
              />
            }
          />
        </ExportContentWrapper>
      </ExportStateHandler>
    </Box>
  );
};

export default React.memo(DataExport);