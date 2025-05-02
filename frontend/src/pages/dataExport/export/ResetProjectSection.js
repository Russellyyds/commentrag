import React, { useEffect, useRef } from 'react';
import {
  Box
} from '@mui/material';
import { useAppStore } from '../../../utils/zustandStore';
import ResetProjectButton from '../../dataImport/upload/ResetProjectButton';

const ResetProjectSection = ({ onResetSuccess }) => {
  // Get current project ID and app state from Zustand store
  const currentProjectId = useAppStore(state => state.projectId);
  const importComplete = useAppStore(state => state.importComplete);
  
  // Track component mount status with ref
  const isMounted = useRef(true);
  
  // Set component unmount flag
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Don't render anything if no project ID or import not complete
  if (!currentProjectId || !importComplete) {
    return null;
  }
  
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
      <ResetProjectButton 
        projectId={currentProjectId} 
        onSuccess={onResetSuccess}
      />
    </Box>
  );
};

export default React.memo(ResetProjectSection);