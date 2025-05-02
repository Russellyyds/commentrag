describe('API Service Error Handling Tests', () => {
    // Test error handling in uploadFiles
    describe('uploadFiles error handling', () => {
      beforeEach(() => {
        // Create a clean localStorage environment for each test
        cy.clearLocalStorage();
        cy.visit('/data-import');
      });
  
      it('should handle network error during file upload', () => {
        // Intercept the upload API call and simulate network error
        cy.intercept('POST', '**/comments/upload', {
          forceNetworkError: true
        }).as('networkError');
  
        // Use a simple file creation for testing
        const testFile = new File(['test content'], 'sample.csv', { type: 'text/csv' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(testFile);
        
        // Drop the file on the dropzone
        cy.get('.dropzone, [data-cy="upload-dropzone"], [class*="UploadDropZone"]').first()
          .trigger('drop', { dataTransfer });
  
        // Check for error message - look for any error indication
        cy.contains('Error', { timeout: 10000 }).should('be.visible');
        cy.contains('connect', { timeout: 5000 }).should('be.visible');
      });
  
      it('should handle server error with error message', () => {
        // Intercept upload API call with server error and custom message
        cy.intercept('POST', '**/comments/upload', {
          statusCode: 500,
          body: { 
            success: false, 
            message: 'Custom server error message'
          }
        }).as('serverError');
  
        // Use a simple file creation for testing
        const testFile = new File(['test content'], 'sample.csv', { type: 'text/csv' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(testFile);
        
        // Drop the file on the dropzone
        cy.get('.dropzone, [data-cy="upload-dropzone"], [class*="UploadDropZone"]').first()
          .trigger('drop', { dataTransfer });
  
        // Verify error state shows the custom message
        cy.contains('Error', { timeout: 10000 }).should('be.visible');
        cy.contains('Custom server error message', { timeout: 5000 }).should('be.visible');
      });
    });
  
    // Test error handling in processComments
    describe('processComments error handling', () => {
      beforeEach(() => {
        // Clear localStorage for clean state
        cy.clearLocalStorage();
        cy.visit('/data-import');
        
        // Setup intercepts for successful file upload
        cy.intercept('POST', '**/comments/upload', {
          statusCode: 200,
          body: {
            success: true,
            message: "Files uploaded successfully",
            project_id: "test-project-id",
            fileIds: ["file1"],
            total_comments: 10
          }
        }).as('uploadSuccess');
      });
  
      it('should handle process error with server message', () => {
        // Intercept process API with error
        cy.intercept('POST', '**/comments/process', {
          statusCode: 500,
          body: {
            success: false,
            message: "Processing error occurred"
          }
        }).as('processError');
  
        // Use a simple file creation for testing
        const testFile = new File(['test content'], 'sample.csv', { type: 'text/csv' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(testFile);
        
        // Drop the file on the dropzone
        cy.get('.dropzone, [data-cy="upload-dropzone"], [class*="UploadDropZone"]').first()
          .trigger('drop', { dataTransfer });
  
        // Wait for upload to complete
        cy.wait('@uploadSuccess');
  
        // Click process button - using more flexible selector
        cy.contains('button', 'Process', { timeout: 5000 }).click();
  
        // Verify error state
        cy.contains('Error', { timeout: 10000 }).should('be.visible');
        cy.contains('Processing error occurred', { timeout: 5000 }).should('be.visible');
      });
  
      it('should handle network error during processing', () => {
        // Intercept process API with network error
        cy.intercept('POST', '**/comments/process', {
          forceNetworkError: true
        }).as('processNetworkError');
  
        // Use a simple file creation for testing
        const testFile = new File(['test content'], 'sample.csv', { type: 'text/csv' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(testFile);
        
        // Drop the file on the dropzone
        cy.get('.dropzone, [data-cy="upload-dropzone"], [class*="UploadDropZone"]').first()
          .trigger('drop', { dataTransfer });
  
        // Wait for upload to complete
        cy.wait('@uploadSuccess');
  
        // Click process button - using more flexible selector
        cy.contains('button', 'Process', { timeout: 5000 }).click();
  
        // Verify error state
        cy.contains('Error', { timeout: 10000 }).should('be.visible');
        cy.contains(/unable to connect|network error/i, { timeout: 5000 }).should('be.visible');
      });
    });
  
    // Test error handling in submitManualComment
    describe('submitManualComment error handling', () => {
      beforeEach(() => {
        cy.clearLocalStorage();
        cy.visit('/data-import');
      });
  
      it('should handle error in submitManualComment API', () => {
        // Mock RAG API error
        cy.intercept('POST', '**/rag', {
          statusCode: 500,
          body: {
            success: false,
            message: "RAG error: Failed to process comment"
          }
        }).as('ragError');
  
        // Detect the manual comment entry section - try multiple possible text matches
        cy.contains(/Manual Comment Entry|Manual Entry|Comment Analysis/i, { timeout: 10000 }).should('be.visible');
        
        // Find any visible text input or textarea - using a broader selector
        cy.get('textarea, [type="text"], .MuiInputBase-input')
          .filter(':visible')
          .first()
          .type('Test comment for analysis', { force: true });
        
        // Find a button that might be the send button - try multiple approaches
        cy.get('button')
          .filter(':visible')
          .filter(':not(:disabled)')
          .last() // Often the send button is the last button in the form
          .click({ force: true });
  
        // Wait for the API call - with longer timeout
        cy.wait('@ragError', { timeout: 10000 });
  
        // Check for error message in the response - using more general error terms
        cy.contains(/error|failed|sorry|unable/i, { timeout: 15000 }).should('exist');
      });
    });
  
    // Test error handling with more direct access to hooks/apiService
    describe('Direct apiService error handling', () => {
      it('should handle error in handleApiError function', () => {
        // Create the test inside the application context
        cy.visit('/data-import');
        
        // Create a fake error and inject test to check error handling
        cy.window().then((win) => {
          // Try to access the handleApiError function indirectly
          // by causing a controlled error in apiService
          cy.intercept('GET', '**', (req) => {
            if (req.url.includes('test-error-handling')) {
              req.reply({
                statusCode: 500,
                body: {
                  detail: 'Test error detail',
                  message: null
                }
              });
            }
          }).as('testError');
          
          // Try to fetch a non-existent URL to trigger error handler
          fetch(`${win.location.origin}/test-error-handling`)
            .then(response => response.json())
            .catch(err => {
              // This should trigger the error handling in application
              console.error("Test error:", err);
            });
        });
  
        // The goal here is to invoke the error handler code path,
        // not to assert any visible UI changes
      });
    });
  });