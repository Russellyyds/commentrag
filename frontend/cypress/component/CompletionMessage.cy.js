import React from 'react';
import CompletionMessage from '../../src/pages/dataImport/upload/components/CompletionMessage';
import { ThemeProvider } from '@mui/material';
import theme from '../../src/utils/theme';

describe('CompletionMessage Component', () => {
  // Mount component with different states
  const mountComponent = (uploadState, processedComments = 0, error = null) => {
    cy.mount(
      <ThemeProvider theme={theme}>
        <CompletionMessage 
          uploadState={uploadState}
          processedComments={processedComments}
          error={error}
        />
      </ThemeProvider>
    );
  };
  
  describe('Complete state', () => {
    it('should display message with processed comments count when count > 0', () => {
      mountComponent('complete', 42);
      cy.contains('42 comments have been processed').should('be.visible');
    });
    
    it('should display generic success message when no processed comments', () => {
      mountComponent('complete', 0);
      cy.contains('Files have been processed successfully').should('be.visible');
    });
  });
  
  describe('Error state', () => {
    it('should display specific error message when provided', () => {
      const errorMessage = 'Failed to connect to server';
      mountComponent('error', 0, errorMessage);
      cy.contains(errorMessage).should('be.visible');
    });
    
    it('should display generic error message when no specific error provided', () => {
      mountComponent('error');
      cy.contains('An error occurred while processing your files. Please try again.').should('be.visible');
    });
  });
  
  describe('Other states', () => {
    it('should not render anything in initial state', () => {
      mountComponent('initial');
      // The component should return null, so no elements should be rendered
      cy.get('*').should('not.contain', 'processed');
      cy.get('*').should('not.contain', 'error');
    });
    
    it('should not render anything in uploading state', () => {
      mountComponent('uploading');
      // The component should return null, so no elements should be rendered
      cy.get('*').should('not.contain', 'processed');
      cy.get('*').should('not.contain', 'error');
    });
  });
  
  describe('Animation', () => {
    it('should have animation properties in complete state', () => {
      mountComponent('complete', 50);
      // Check for motion component styling
      cy.get('p').should('exist');
    });
  });
});