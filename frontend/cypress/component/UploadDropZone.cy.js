import React from 'react';
import UploadDropZone from '../../src/pages/dataImport/upload/components/UploadDropZone';
import { ThemeProvider } from '@mui/material';
import theme from '../../src/utils/theme';

describe('UploadDropZone Component', () => {
  // Move stub declarations inside beforeEach
  let mockDrop;
  let mockDragOver;
  let mockClick;
  
  beforeEach(() => {
    // Create stubs inside beforeEach
    mockDrop = cy.stub().as('dropHandler');
    mockDragOver = cy.stub().as('dragOverHandler');
    mockClick = cy.stub().as('clickHandler');

    // Mount the component with required props
    cy.mount(
      <ThemeProvider theme={theme}>
        <UploadDropZone 
          onDrop={mockDrop}
          onDragOver={mockDragOver}
          onClick={mockClick}
        />
      </ThemeProvider>
    );
  });

  it('should render correctly with proper text', () => {
    // Check if key elements are visible
    cy.contains('Drop your files here').should('be.visible');
    cy.contains('or click to select').should('be.visible');
    cy.contains('Supports CSV, TSV, Excel and JSON files').should('be.visible');
  });

  it('should trigger click handler when clicked', () => {
    // Click on the component
    cy.get('[data-cy=upload-dropzone]').click();
    cy.get('@clickHandler').should('have.been.called');
  });

  it('should trigger drop handler when files are dropped', () => {
    // Create a mock file drop event
    const file = new File(['dummy content'], 'test.csv', { type: 'text/csv' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    
    // Trigger the drop event
    cy.get('[data-cy=upload-dropzone]').trigger('drop', { 
      dataTransfer: dataTransfer
    });
    
    cy.get('@dropHandler').should('have.been.called');
  });
});