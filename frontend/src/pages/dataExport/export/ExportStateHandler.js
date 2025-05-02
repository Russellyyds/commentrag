import React from 'react';
import EmptyStateDisplay from './states/EmptyStateDisplay';
import LoadingStateDisplay from './states/LoadingStateDisplay';
import ErrorStateDisplay from './states/ErrorStateDisplay';
import ProcessingStateDisplay from './states/ProcessingStateDisplay';
import NoDataStateDisplay from './states/NoDataStateDisplay';

const ExportStateHandler = ({ 
  importComplete,
  isLoading,
  error,
  projectStatus,
  comments,
  children 
}) => {
  // Render empty state if no import
  if (!importComplete) {
    return <EmptyStateDisplay />;
  }
  
  // Render loading state
  if (isLoading) {
    return <LoadingStateDisplay />;
  }
  
  // Render error state
  if (error) {
    return <ErrorStateDisplay error={error} />;
  }
  
  // Process in progress state
  if (projectStatus && projectStatus.status === 'in_progress') {
    return <ProcessingStateDisplay />;
  }
  
  // Render no data state
  if (!comments || comments.length === 0) {
    return <NoDataStateDisplay />;
  }
  
  // Render main content
  return children;
};

export default ExportStateHandler;