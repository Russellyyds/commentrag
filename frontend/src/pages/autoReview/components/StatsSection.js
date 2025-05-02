import React from 'react';
import CommentsStats from '../../../components/review/CommentsStats';

const StatsSection = React.memo(({ stats, selectedCategory, currentProjectId }) => {
  if (!stats || Object.keys(stats).length === 0) return null;
  
  return (
    <CommentsStats 
      stats={stats} 
      selectedCategory={selectedCategory}
      isGlobalStats={true}
      currentProjectId={currentProjectId}
    />
  );
});

export default StatsSection;