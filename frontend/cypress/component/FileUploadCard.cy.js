import React from 'react';
import FileUploadCard from '../../src/pages/dataImport/upload/FileUploadCard';
import { ThemeProvider } from '@mui/material';
import theme from '../../src/utils/theme';

describe('FileUploadCard Component', () => {
  // Move stub declarations inside beforeEach
  let mockHandlers;
  
  beforeEach(() => {
    // Create stubs for all the required props/callbacks
    mockHandlers = {
      onFileSelect: cy.stub().as('fileSelectHandler'),
      onDrop: cy.stub().as('dropHandler'),
      onDragOver: cy.stub().as('dragOverHandler'),
      onCancel: cy.stub().as('cancelHandler'),
      onReset: cy.stub().as('resetHandler'),
      onProcessFiles: cy.stub().as('processHandler'),
      onAutoReview: cy.stub().as('autoReviewHandler'),
      onManualReview: cy.stub().as('manualReviewHandler'),
      onProjectCreated: cy.stub().as('projectCreatedHandler')
    };
  });

  // Initial state (empty files list)
  const mountComponentInitialState = () => {
    cy.mount(
      <ThemeProvider theme={theme}>
        <FileUploadCard
          uploadState="initial"
          progress={0}
          processedComments={0}
          currentFile={0}
          totalFiles={0}
          files={[]}
          onFileSelect={mockHandlers.onFileSelect}
          onDrop={mockHandlers.onDrop}
          onDragOver={mockHandlers.onDragOver}
          onCancel={mockHandlers.onCancel}
          onReset={mockHandlers.onReset}
          onProcessFiles={mockHandlers.onProcessFiles}
          onAutoReview={mockHandlers.onAutoReview}
          onManualReview={mockHandlers.onManualReview}
          onProjectCreated={mockHandlers.onProjectCreated}
        />
      </ThemeProvider>
    );
  };

  // Initial state with files
  const mountComponentWithFiles = () => {
    const mockFiles = [
      {
        name: 'test1.csv',
        size: 1024,
        type: 'text/csv',
        status: 'selected',
        progress: 0
      },
      {
        name: 'test2.csv',
        size: 2048,
        type: 'text/csv',
        status: 'selected',
        progress: 0
      }
    ];

    cy.mount(
      <ThemeProvider theme={theme}>
        <FileUploadCard
          uploadState="initial"
          progress={0}
          processedComments={0}
          currentFile={0}
          totalFiles={2}
          files={mockFiles}
          onFileSelect={mockHandlers.onFileSelect}
          onDrop={mockHandlers.onDrop}
          onDragOver={mockHandlers.onDragOver}
          onCancel={mockHandlers.onCancel}
          onReset={mockHandlers.onReset}
          onProcessFiles={mockHandlers.onProcessFiles}
          onAutoReview={mockHandlers.onAutoReview}
          onManualReview={mockHandlers.onManualReview}
          onProjectCreated={mockHandlers.onProjectCreated}
        />
      </ThemeProvider>
    );
  };

  // Uploading state
  const mountComponentUploading = () => {
    const mockFiles = [
      {
        name: 'test1.csv',
        size: 1024,
        type: 'text/csv',
        status: 'processing',
        progress: 50
      },
      {
        name: 'test2.csv',
        size: 2048,
        type: 'text/csv',
        status: 'processing',
        progress: 50
      }
    ];

    cy.mount(
      <ThemeProvider theme={theme}>
        <FileUploadCard
          uploadState="uploading"
          progress={50}
          processedComments={0}
          currentFile={1}
          totalFiles={2}
          files={mockFiles}
          onFileSelect={mockHandlers.onFileSelect}
          onDrop={mockHandlers.onDrop}
          onDragOver={mockHandlers.onDragOver}
          onCancel={mockHandlers.onCancel}
          onReset={mockHandlers.onReset}
          onProcessFiles={mockHandlers.onProcessFiles}
          onAutoReview={mockHandlers.onAutoReview}
          onManualReview={mockHandlers.onManualReview}
          onProjectCreated={mockHandlers.onProjectCreated}
        />
      </ThemeProvider>
    );
  };

  // Complete state
  const mountComponentComplete = () => {
    const mockFiles = [
      {
        name: 'test1.csv',
        size: 1024,
        type: 'text/csv',
        status: 'complete',
        progress: 100
      },
      {
        name: 'test2.csv',
        size: 2048,
        type: 'text/csv',
        status: 'complete',
        progress: 100
      }
    ];

    cy.mount(
      <ThemeProvider theme={theme}>
        <FileUploadCard
          uploadState="complete"
          progress={100}
          processedComments={50}
          currentFile={2}
          totalFiles={2}
          files={mockFiles}
          onFileSelect={mockHandlers.onFileSelect}
          onDrop={mockHandlers.onDrop}
          onDragOver={mockHandlers.onDragOver}
          onCancel={mockHandlers.onCancel}
          onReset={mockHandlers.onReset}
          onProcessFiles={mockHandlers.onProcessFiles}
          onAutoReview={mockHandlers.onAutoReview}
          onManualReview={mockHandlers.onManualReview}
          onProjectCreated={mockHandlers.onProjectCreated}
        />
      </ThemeProvider>
    );
  };

  // Error state
  const mountComponentError = () => {
    const mockFiles = [
      {
        name: 'test1.csv',
        size: 1024,
        type: 'text/csv',
        status: 'error',
        progress: 0
      }
    ];

    cy.mount(
      <ThemeProvider theme={theme}>
        <FileUploadCard
          uploadState="error"
          progress={0}
          processedComments={0}
          currentFile={0}
          totalFiles={1}
          files={mockFiles}
          error="An error occurred during file processing"
          onFileSelect={mockHandlers.onFileSelect}
          onDrop={mockHandlers.onDrop}
          onDragOver={mockHandlers.onDragOver}
          onCancel={mockHandlers.onCancel}
          onReset={mockHandlers.onReset}
          onProcessFiles={mockHandlers.onProcessFiles}
          onAutoReview={mockHandlers.onAutoReview}
          onManualReview={mockHandlers.onManualReview}
          onProjectCreated={mockHandlers.onProjectCreated}
        />
      </ThemeProvider>
    );
  };

  describe('Initial State (No Files)', () => {
    beforeEach(() => {
      mountComponentInitialState();
    });

    it('should render the upload dropzone', () => {
      cy.contains('Drop your files here').should('be.visible');
      cy.contains('or click to select').should('be.visible');
    });

    it('should trigger drop handler when files are dropped', () => {
      // Create a mock file drop event
      const file = new File(['dummy content'], 'test.csv', { type: 'text/csv' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      // Trigger the drop event on the dropzone
      cy.get('[data-cy="upload-dropzone"]').trigger('drop', { 
        dataTransfer: dataTransfer
      });
      
      cy.get('@dropHandler').should('have.been.called');
    });
  });

  describe('Initial State (With Files)', () => {
    beforeEach(() => {
      mountComponentWithFiles();
    });

    it('should display the file list', () => {
      cy.contains('Files Selected').should('be.visible');
      cy.contains('test1.csv').should('be.visible');
      cy.contains('test2.csv').should('be.visible');
    });

    it('should have Process Files and Add More Files buttons', () => {
      cy.contains('button', 'Process Files').should('be.visible');
      cy.contains('button', 'Add More Files').should('be.visible');
    });

    it('should trigger process files when the button is clicked', () => {
      cy.contains('button', 'Process Files').click();
      cy.get('@processHandler').should('have.been.called');
    });
  });

  describe('Uploading State', () => {
    beforeEach(() => {
      mountComponentUploading();
    });

    it('should display the progress indicator', () => {
      cy.contains('Processing Files').should('be.visible');
      // Check for percentage display
      cy.contains('50%').should('be.visible');
    });

    it('should show files with processing status', () => {
      cy.contains('Processing').should('be.visible');
    });
  });

  describe('Complete State', () => {
    beforeEach(() => {
      mountComponentComplete();
    });

    it('should show completion message', () => {
      cy.contains('Import Complete!').should('be.visible');
      cy.contains('50 comments have been processed').should('be.visible');
    });

    it('should have Auto Review and Manual Review buttons', () => {
      cy.contains('button', 'Auto Review').should('be.visible');
      cy.contains('button', 'Manual Review').should('be.visible');
    });

    it('should trigger auto review when the button is clicked', () => {
      cy.contains('button', 'Auto Review').click();
      cy.get('@autoReviewHandler').should('have.been.called');
    });

    it('should trigger manual review when the button is clicked', () => {
      cy.contains('button', 'Manual Review').click();
      cy.get('@manualReviewHandler').should('have.been.called');
    });
  });

  describe('Error State', () => {
    beforeEach(() => {
      mountComponentError();
    });

    it('should display error message', () => {
      cy.contains('Error Occurred').should('be.visible');
      cy.contains('An error occurred during file processing').should('be.visible');
    });

    it('should have a Start Over button', () => {
      cy.contains('button', 'Start Over').should('be.visible');
    });

    it('should trigger reset when the Start Over button is clicked', () => {
      cy.contains('button', 'Start Over').click();
      cy.get('@resetHandler').should('have.been.called');
    });
  });
});