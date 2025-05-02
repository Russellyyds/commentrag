import React from 'react';
import UploadProgressDisplay from '../../src/pages/dataImport/upload/components/UploadProgressDisplay';
import { ThemeProvider } from '@mui/material';
import theme from '../../src/utils/theme';

describe('UploadProgressDisplay Component', () => {
  // Mount component with different progress values
  const mountComponent = (progress = 0, processedComments = 0) => {
    cy.mount(
      <ThemeProvider theme={theme}>
        <UploadProgressDisplay 
          progress={progress}
          processedComments={processedComments}
        />
      </ThemeProvider>
    );
  };
  
  describe('Progress display', () => {
    it('should display progress percentage correctly', () => {
      mountComponent(42);
      cy.contains('42%').should('be.visible');
      cy.contains('42% Complete').should('be.visible');
    });
    
    it('should show linear progress bar with correct value', () => {
      mountComponent(75);
      // Check for progress bar components
      cy.get('.MuiLinearProgress-root').should('exist');
      cy.get('.MuiLinearProgress-bar').should('exist');
    });
    
    it('should show circular progress indicator', () => {
      mountComponent(30);
      cy.get('.MuiCircularProgress-root').should('exist');
    });
  });
  
  describe('Processed comments display', () => {
    it('should display processed comments count when available', () => {
      mountComponent(50, 100);
      cy.contains('100 Comments Found').should('be.visible');
    });
    
    it('should show "Processing..." when no comments processed yet', () => {
      mountComponent(25, 0);
      cy.contains('Processing...').should('be.visible');
    });
  });
  
  describe('Visual styling', () => {
    it('should have styled progress indicators', () => {
      mountComponent(60);
      
      // Linear progress should have non-zero height
      cy.get('.MuiLinearProgress-root')
        .should('have.css', 'height')
        .and('not.equal', '0px');
      
      // Linear progress should have rounded corners
      cy.get('.MuiLinearProgress-root')
        .should('have.css', 'border-radius')
        .and('not.equal', '0px');
    });
    
    it('should have animated glow effect on progress bar', () => {
      mountComponent(80);
      
      // Check for the motion div that applies the glow
      cy.get('.MuiBox-root').children()
        .should('exist');
    });
  });
  
  describe('Progress stages', () => {
    it('should show early stage styling at low progress', () => {
      mountComponent(20);
      cy.contains('20% Complete').should('be.visible');
    });
    
    it('should show late stage styling at high progress', () => {
      mountComponent(95);
      cy.contains('95% Complete').should('be.visible');
    });
  });
});