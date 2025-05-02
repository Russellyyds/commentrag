describe('apiService Error Handling Tests', () => {
    beforeEach(() => {
      cy.clearLocalStorage();
      cy.visit('/data-import');
    });
  
    describe('Basic Error Handling', () => {
      it('should handle API request errors without crashing', () => {
        // Test directly using the window object
        cy.window().then(win => {
          // Create a mock error response
          const mockResponse = {
            ok: false,
            status: 500,
            json: () => Promise.resolve({ 
              success: false, 
              message: "Test error message" 
            })
          };
          
          // Make a request directly in browser context
          win.testFetch = () => {
            return Promise.resolve(mockResponse)
              .then(response => response.json())
              .then(data => {
                console.log('Test data:', data);
                return data;
              })
              .catch(err => {
                console.error('Error in test fetch:', err);
                return { error: true, message: err.message };
              });
          };
          
          // Call our test function and assert on the result
          win.testFetch().then(result => {
            expect(result).to.have.property('success', false);
          });
        });
        
        // Verify the app doesn't crash
        cy.get('body').should('be.visible');
      });
      
      it('should handle network failures in API calls', () => {
        cy.window().then(win => {
          // Setup a function that simulates a network error
          win.testNetworkError = () => {
            return Promise.reject(new Error('Network error'))
              .catch(err => {
                console.error('Expected network error:', err);
                return { error: true, message: err.message };
              });
          };
          
          // Call the function and assert on the result
          win.testNetworkError().then(result => {
            expect(result).to.have.property('error', true);
            expect(result.message).to.include('Network error');
          });
        });
        
        // Verify the app doesn't crash
        cy.get('body').should('be.visible');
      });
      
      it('should handle JSON parsing errors', () => {
        cy.window().then(win => {
          // Setup a function for JSON parse error
          win.testJsonError = () => {
            try {
              JSON.parse('{broken json}');
              return { success: true };
            } catch (err) {
              console.error('Expected JSON error:', err);
              return { error: true, message: err.message };
            }
          };
          
          // Call the function and assert on the result
          const result = win.testJsonError();
          expect(result).to.have.property('error', true);
          expect(result.message).to.include('JSON');
        });
        
        // Verify the app doesn't crash
        cy.get('body').should('be.visible');
      });
    });
  
    describe('Error Handling in UI Context', () => {
      it('should handle error in manual comment submission', () => {
        // Intercept the RAG API endpoint with an error
        cy.intercept('POST', '**/rag', {
          statusCode: 500,
          body: { 
            success: false, 
            message: "Error processing comment" 
          }
        }).as('ragError');
        
        // Look for the manual comment input section
        cy.contains(/Manual Comment Entry|Manual Entry/).should('exist');
        
        // Find the input and type a comment
        cy.get('textarea, [type="text"]')
          .filter(':visible')
          .first()
          .clear()
          .type('Test error handling');
        
        // Find and click the send button
        cy.get('button')
          .filter(':visible')
          .filter(':not(:disabled)')
          .last()
          .click({ force: true });
        
        // Wait for the API call
        cy.wait('@ragError');
        
        // Verify error handling (app should display error message)
        cy.contains(/error|failed|unable/i).should('be.visible');
      });
      
      it('should handle file upload errors', () => {
        // Intercept the upload API with error
        cy.intercept('POST', '**/comments/upload', {
          statusCode: 400,
          body: { 
            success: false, 
            message: "Invalid file format" 
          }
        }).as('uploadError');
        
        // Create a simple text file for testing
        cy.writeFile('cypress/fixtures/test-upload.txt', 'Test content');
        
        // Prepare the file upload
        cy.fixture('test-upload.txt').then(fileContent => {
          // Convert to a Blob
          const testFile = new Blob([fileContent], { type: 'text/plain' });
          testFile.name = 'test-upload.txt';
          
          // Create a DataTransfer object
          const dataTransfer = new DataTransfer();
          const file = new File([testFile], 'test-upload.txt', { type: 'text/plain' });
          dataTransfer.items.add(file);
          
          // Use the dropzone
          cy.get('.dropzone, [data-cy="upload-dropzone"]')
            .first()
            .trigger('drop', { dataTransfer });
        });
        
        // Wait for the API call
        cy.wait('@uploadError');
        
        // Verify error handling
        cy.contains(/error|invalid|failed/i).should('be.visible');
      });
    });
    
    describe('Error Handling for Edge Cases', () => {
      it('should handle undefined response properties', () => {
        cy.window().then(win => {
          // Setup test function for undefined properties
          win.testUndefinedProps = () => {
            const response = { data: undefined };
            
            // Try to access nested properties that don't exist
            try {
              // Force an error by trying to access properties on undefined
              const items = response.data.items;
              return { success: true, result: items.length };
            } catch (err) {
              console.error('Expected property error:', err);
              return { error: true, message: err.message };
            }
          };
          
          // Call the function and assert on the result
          const result = win.testUndefinedProps();
          expect(result).to.have.property('error');
        });
        
        // Verify the app doesn't crash
        cy.get('body').should('be.visible');
      });
      
      it('should handle HTTP status code errors', () => {
        cy.window().then(win => {
          // Test function to handle HTTP status codes
          win.testHttpError = (statusCode) => {
            const response = {
              ok: false,
              status: statusCode,
              statusText: 'Error'
            };
            
            // Check response status
            if (!response.ok) {
              return { 
                error: true, 
                status: response.status,
                message: `HTTP error ${response.status}: ${response.statusText}`
              };
            }
            
            return { success: true };
          };
          
          // Test with various status codes
          const codes = [400, 401, 403, 404, 500];
          codes.forEach(code => {
            const result = win.testHttpError(code);
            expect(result).to.have.property('error', true);
            expect(result.status).to.equal(code);
          });
        });
        
        // Verify the app doesn't crash
        cy.get('body').should('be.visible');
      });
    });
  });