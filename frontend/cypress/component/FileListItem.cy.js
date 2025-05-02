import React from 'react';
import FileListItem from '../../src/pages/dataImport/upload/FileListItem';
import { ThemeProvider } from '@mui/material';
import theme from '../../src/utils/theme';

describe('FileListItem Component', () => {
  // Mount component with different file properties
  const mountComponent = (fileProps = {}, index = 0, animationDelay = 0, overallProgress = 0) => {
    const defaultProps = {
      name: 'test.csv',
      size: 1024,
      status: 'uploaded',
      progress: 0
    };

    const file = { ...defaultProps, ...fileProps };

    cy.mount(
      <ThemeProvider theme={theme}>
        <FileListItem 
          file={file}
          index={index}
          animationDelay={animationDelay}
          overallProgress={overallProgress}
        />
      </ThemeProvider>
    );
  };
  
  describe('Basic rendering', () => {
    beforeEach(() => {
      mountComponent();
    });
    
    it('should display file name', () => {
      cy.contains('test.csv').should('be.visible');
    });
    
    it('should format and display file size', () => {
      cy.contains('1.0 KB').should('be.visible');
    });
    
    it('should display correct status', () => {
      cy.contains('Ready to Process').should('be.visible');
    });
  });
  
  describe('Different file types', () => {
    it('should show appropriate icon for CSV file', () => {
      mountComponent({ name: 'data.csv' });
      cy.get('svg[data-testid="TableChartIcon"]').should('exist');
    });
    
    it('should show appropriate icon for JSON file', () => {
      mountComponent({ name: 'data.json' });
      cy.get('svg[data-testid="DataObjectIcon"]').should('exist');
    });
    
    it('should show appropriate icon for Excel file', () => {
      mountComponent({ name: 'data.xlsx' });
      cy.get('svg[data-testid="TableChartIcon"]').should('exist');
    });
    
    it('should show default icon for other file types', () => {
      mountComponent({ name: 'data.txt' });
      cy.get('svg[data-testid="InsertDriveFileIcon"]').should('exist');
    });
  });
  
  describe('Different file statuses', () => {
    it('should display "Ready to Process" for uploaded status', () => {
      mountComponent({ status: 'uploaded' });
      cy.contains('Ready to Process').should('be.visible');
    });
    
    it('should display "Processing" with progress for processing status', () => {
      mountComponent({ status: 'processing' }, 0, 0, 75);
      cy.contains('Processing (75%)').should('be.visible');
    });
    
    it('should display "Completed" for complete status', () => {
      mountComponent({ status: 'complete' });
      cy.contains('Completed').should('be.visible');
      cy.get('svg[data-testid="FileDownloadDoneIcon"]').should('exist');
    });
    
    it('should update processing to complete when overall progress reaches 100%', () => {
      mountComponent({ status: 'processing' }, 0, 0, 100);
      // Should show completed instead of processing
      cy.contains('Completed').should('be.visible');
    });
  });
  
  describe('File size formatting', () => {
    it('should format bytes correctly', () => {
      mountComponent({ size: 512 });
      cy.contains('512 B').should('be.visible');
    });
    
    it('should format kilobytes correctly', () => {
      mountComponent({ size: 1536 });
      cy.contains('1.5 KB').should('be.visible');
    });
    
    it('should format megabytes correctly', () => {
      mountComponent({ size: 2 * 1024 * 1024 });
      cy.contains('2.0 MB').should('be.visible');
    });
  });
  
  describe('Visual styling', () => {
    it('should have different background colors based on status', () => {
      // Test processing status
      mountComponent({ status: 'processing' }, 0, 0, 50);
      cy.get('.MuiPaper-root').should('have.css', 'background-color')
        .and('not.equal', 'rgba(0, 0, 0, 0)');
        
      // Test complete status
      mountComponent({ status: 'complete' });
      cy.get('.MuiPaper-root').should('have.css', 'background-color')
        .and('not.equal', 'rgba(0, 0, 0, 0)');
    });
    
    it('should have a status indicator line with appropriate color', () => {
      mountComponent({ status: 'processing' });
      cy.get('.MuiPaper-root > div').first().should('have.css', 'background-color')
        .and('not.equal', 'rgba(0, 0, 0, 0)');
    });
  });
});