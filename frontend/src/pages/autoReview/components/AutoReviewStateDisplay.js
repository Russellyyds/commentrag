import React from 'react';
import EmptyState from '../states/EmptyState';
import LoadingState from '../states/LoadingState';
import ErrorState from '../states/ErrorState';
import ProcessingState from '../states/ProcessingState';
import EmptyDataState from '../states/EmptyDataState';
import CommentsListSection from './CommentsListSection';

const AutoReviewStateDisplay = ({ 
  importComplete, 
  isLoading, 
  error, 
  projectStatus, 
  comments, 
  confidenceThreshold,
  handleRowClick,
  currentPage,
  totalPages,
  handlePageChange,
  pageSize,
  setPageSize,
  totalComments,
  selectedCategory
}) => {
  if (!importComplete) {
    return <EmptyState />;
  }
  
  if (isLoading) {
    return <LoadingState />;
  }
  
  if (error || (projectStatus && projectStatus.has_errors)) {
    return <ErrorState 
      error={error || "Error occurred during processing"} 
    />;
  }
  
  if (projectStatus && projectStatus.status === 'in_progress') {
    return <ProcessingState />;
  }
  
  if (!comments || comments.length === 0) {
    return <EmptyDataState />;
  }
  
  return (
    <CommentsListSection 
      comments={comments}
      confidenceThreshold={confidenceThreshold}
      onRowClick={handleRowClick}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      totalItems={totalComments}
      selectedCategory={selectedCategory}
    />
  );
};

export default AutoReviewStateDisplay;