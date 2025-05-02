describe('Network Error Tests', () => {
    beforeEach(() => {
      cy.visit('/data-import');
    });
  
    it('should handle API errors during file upload', () => {
      // Intercept the upload API call and force it to fail
      cy.intercept('POST', '/comments/upload', {
        statusCode: 500,
        body: { success: false, message: 'Server error' }
      }).as('uploadFailure');
  
      // Upload a file
      cy.fixture('sample.csv', 'base64').then(fileContent => {
        const blob = Cypress.Blob.base64StringToBlob(fileContent, 'text/csv');
        const testFile = new File([blob], 'sample.csv', { type: 'text/csv' });
        const fileList = [testFile];
        
        cy.get('[data-cy="upload-dropzone"]').trigger('drop', { 
          dataTransfer: { files: fileList, types: ['Files'] }
        });
      });
  
      // Verify error state appears
      cy.contains('Error Occurred').should('be.visible');
      cy.contains('Server error').should('be.visible');
    });
  });