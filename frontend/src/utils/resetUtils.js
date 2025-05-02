import { resetApplicationState } from './stateManager';

/**
 * Clear all project-related data from localStorage
 * Uses the centralized state manager for consistent state reset
 */
export const clearAllProjectData = () => {
  resetApplicationState();
};

/**
 * Initialize data import state with default values
 * This function remains for backward compatibility
 */
export const initializeDataImportState = () => {
  // No longer needed as the state manager now handles initialization
  // But kept for backward compatibility with existing components
};

/**
 * Get a reset handler with proper cleanup
 * @param {Function} additionalCallback - Optional additional function to call after reset
 * @returns {Function} - A function that performs reset and calls the callback
 */
export const getResetHandler = (additionalCallback) => {
  return () => {
    // Use central reset function
    resetApplicationState();
    
    // Call additional callback if provided
    if (additionalCallback && typeof additionalCallback === 'function') {
      additionalCallback();
    }
    
    // Return true to indicate successful reset
    return true;
  };
};

export default {
  clearAllProjectData,
  initializeDataImportState,
  getResetHandler
};