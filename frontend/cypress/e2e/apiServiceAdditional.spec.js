// cypress/e2e/directApiService.spec.js

import * as apiService from '../../src/hooks/apiService';

describe('Direct API Service Tests', () => {
  beforeEach(() => {
    // Start with a clean localStorage
    cy.clearLocalStorage();
  });

  context('Manual Comment Entry API', () => {
    it('should make API call for manual comment analysis', () => {
      // Mock the /rag endpoint
      cy.intercept('POST', '**/rag', {
        statusCode: 200,
        body: {
          success: true,
          classification: {
            category: 'Complaint',
            confidence: 85,
            reasoning: 'The comment contains negative sentiment'
          },
          answer: [
            { comment: 'Similar complaint', category: 'Complaint', similarity: 0.9 }
          ]
        }
      }).as('ragRequest');
      
      // Call the API function directly
      cy.window().then(win => {
        // Expose the function to the window object
        win.executeTest = () => {
          return apiService.submitManualComment('I had a terrible experience with your service');
        };
        
        // Execute the test function
        cy.wrap(win.executeTest()).then(response => {
          // Assert on the response
          expect(response.success).to.be.true;
          expect(response.data).to.exist;
        });
      });
      
      // Wait for the API request to be made
      cy.wait('@ragRequest').then(interception => {
        expect(interception.request.body).to.have.property('comment', 'I had a terrible experience with your service');
      });
    });
  });
  
  context('Project Operations', () => {
    it('should get project status and stats', () => {
      // Mock the project status API
      cy.intercept('GET', '**/projects/*/status', {
        statusCode: 200,
        body: {
          success: true,
          status: 'completed',
          progress: 100,
          categories: {
            'OK': { count: 5, percentage: 50 },
            'Complaint': { count: 3, percentage: 30 },
            'Cultural': { count: 2, percentage: 20 }
          }
        }
      }).as('getStatus');
      
      // Call the API function directly
      cy.window().then(win => {
        win.executeStatusTest = () => {
          return apiService.getProjectStatusAndStats('test-project');
        };
        
        cy.wrap(win.executeStatusTest()).then(response => {
          expect(response.success).to.be.true;
          expect(response.data.status).to.equal('completed');
        });
      });
      
      cy.wait('@getStatus');
    });
    
    it('should get project progress', () => {
      // Mock the progress API
      cy.intercept('GET', '**/projects/*/progress', {
        statusCode: 200,
        body: {
          success: true,
          status: 'in_progress',
          progress: 50,
          has_errors: false
        }
      }).as('getProgress');
      
      // Call the API function directly
      cy.window().then(win => {
        win.executeProgressTest = () => {
          return apiService.getProjectProgress('test-project');
        };
        
        cy.wrap(win.executeProgressTest()).then(response => {
          expect(response.success).to.be.true;
          expect(response.status).to.equal('in_progress');
          expect(response.progress).to.equal(50);
        });
      });
      
      cy.wait('@getProgress');
    });
  });
  
  context('Comment Operations', () => {
    it('should get comments by ID', () => {
      // Mock the comment retrieval API
      cy.intercept('GET', '**/projects/*/comments/*', {
        statusCode: 200,
        body: {
          id: 1,
          comment: 'Test comment',
          category: 'OK',
          confidence: 75,
          similar_comments: [
            { id: 2, comment: 'Another comment', category: 'OK', similarity: 0.85 }
          ]
        }
      }).as('getComment');
      
      // Call the API function directly
      cy.window().then(win => {
        win.executeGetCommentTest = () => {
          return apiService.getCommentById(1, 'test-project');
        };
        
        cy.wrap(win.executeGetCommentTest()).then(response => {
          expect(response.success).to.be.true;
          expect(response.data.id).to.equal(1);
          expect(response.data.similar_comments).to.have.length(1);
        });
      });
      
      cy.wait('@getComment');
    });
  });
});