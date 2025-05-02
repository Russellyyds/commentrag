import React from 'react';
import CommentsListWithPageScroll from '../../../components/CommentsList';

const CommentsListSection = React.memo(({
  comments,
  confidenceThreshold,
  onRowClick,
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalItems,
  selectedCategory
}) => {
  return (
    <CommentsListWithPageScroll
      comments={comments}
      confidenceThreshold={confidenceThreshold}
      onRowClick={onRowClick}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      pageSize={pageSize}
      onPageSizeChange={onPageSizeChange}
      totalItems={totalItems}
      selectedCategory={selectedCategory}
    />
  );
});

export default CommentsListSection;