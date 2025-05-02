import React from 'react';
import ActionButtonsRow from '../../src/pages/dataImport/upload/components/ActionButtonsRow';
import { ThemeProvider } from '@mui/material';
import theme from '../../src/utils/theme';

describe('ActionButtonsRow Component', () => {
  // Move stub declarations inside beforeEach
  let mockHandlers;
  
  beforeEach(() => {
    // Create stubs inside beforeEach
    mockHandlers = {
      onAddMore: cy.stub().as('addMoreHandler'),
      onProcess: cy.stub().as('processHandler'),
      onReset: cy.stub().as('resetHandler'),
      onCancel: cy.stub().as('cancelHandler'),
      onAutoReview: cy.stub().as('autoReviewHandler'),
      onManualReview: cy.stub().as('manualReviewHandler')
    };
  });

  // Mount component with different upload states
  const mountComponent = (uploadState) => {
    cy.mount(
      <ThemeProvider theme={theme}>
        <ActionButtonsRow 
          uploadState={uploadState}
          onAddMore={mockHandlers.onAddMore}
          onProcess={mockHandlers.onProcess}
          onReset={mockHandlers.onReset}
          onCancel={mockHandlers.onCancel}
          onAutoReview={mockHandlers.autoReview}
          onManualReview={mockHandlers.manualReview}
        />
      </ThemeProvider>
    );
  };
  
  describe('Initial state', () => {
    beforeEach(() => {
      mountComponent('initial');
    });
    
    it('should display Add More Files and Process Files buttons', () => {
      cy.contains('button', 'Add More Files').should('be.visible');
      cy.contains('button', 'Process Files').should('be.visible');
    });
    
    it('should call onAddMore when Add More Files button is clicked', () => {
      cy.contains('button', 'Add More Files').click();
      cy.get('@addMoreHandler').should('have.been.called');
    });
    
    it('should call onProcess when Process Files button is clicked', () => {
      cy.contains('button', 'Process Files').click();
      cy.get('@processHandler').should('have.been.called');
    });
  });
  
  describe('Complete state', () => {
    beforeEach(() => {
      mountComponent('complete');
    });
    
    it('should display Auto Review and Manual Review buttons', () => {
      cy.contains('button', 'Auto Review').should('be.visible');
      cy.contains('button', 'Manual Review').should('be.visible');
    });
  });
  
  describe('Error state', () => {
    beforeEach(() => {
      mountComponent('error');
    });
    
    it('should display Start Over button', () => {
      cy.contains('button', 'Start Over').should('be.visible');
    });
    
    it('should call onReset when Start Over button is clicked', () => {
      cy.contains('button', 'Start Over').click();
      cy.get('@resetHandler').should('have.been.called');
    });
  });
  
  describe('Visual styling', () => {
    it('should have appropriate button styles in initial state', () => {
      mountComponent('initial');
      
      // Add More Files button should be outlined
      cy.contains('button', 'Add More Files')
        .should('have.class', 'MuiButton-outlined');
      
      // Process Files button should be contained (primary)
      cy.contains('button', 'Process Files')
        .should('have.class', 'MuiButton-contained');
    });
    
    it('should have rounded buttons', () => {
      mountComponent('complete');
      
      cy.contains('button', 'Auto Review')
        .should('have.css', 'border-radius')
        .and('not.equal', '0px');
    });
  });
});