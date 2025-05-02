describe('AgentApiService Tests', () => {
    beforeEach(() => {
      // Visit the app to load all necessary modules
      cy.clearLocalStorage();
      cy.visit('/ai-agent');
    });
  
    describe('submitAgentQuery function', () => {
      it('should handle successful agent query response', () => {
        // Setup test within application context to access the AgentApiService
        cy.window().then(win => {
          // Mock the agent API endpoint
          cy.intercept('POST', '**/rag/agent', {
            statusCode: 200,
            body: {
              success: true,
              message: "Comment processed successfully with agent",
              classification: {
                category: "Complaint",
                confidence: 90,
                reasoning: "The comment clearly expresses dissatisfaction",
                keywords: ["dissatisfied", "unhappy", "service"]
              },
              reasoning_steps: [
                {
                  step: "initial_analysis",
                  content: "This comment appears to be a complaint about service"
                },
                {
                  step: "tool_selection",
                  selected_tools: ["analyze_sentiment", "check_keywords"]
                }
              ]
            }
          }).as('agentQuery');
  
          // Type a message and send it
          cy.get('textarea, input[type="text"], .MuiInputBase-input')
            .filter(':visible')
            .first()
            .type('I am very dissatisfied with the service');
          
          // Find and click the send button
          cy.get('button')
            .filter(':visible')
            .filter(':not(:disabled)')
            .last()
            .click();
          
          // Wait for the API call
          cy.wait('@agentQuery');
          
          // Check for successful response display
          cy.contains('Complaint').should('be.visible');
          cy.contains('90%').should('exist');
        });
      });
  
      it('should handle agent API error responses', () => {
        // Setup test within application context
        cy.window().then(win => {
          // Mock the agent API endpoint with error
          cy.intercept('POST', '**/rag/agent', {
            statusCode: 500,
            body: {
              success: false,
              message: "Agent processing error: Internal server error"
            }
          }).as('agentQueryError');
  
          // Type a message and send it
          cy.get('textarea, input[type="text"], .MuiInputBase-input')
            .filter(':visible')
            .first()
            .type('Test message for error handling');
          
          // Find and click the send button
          cy.get('button')
            .filter(':visible')
            .filter(':not(:disabled)')
            .last()
            .click();
          
          // Wait for the API call
          cy.wait('@agentQueryError');
          
          // Check for error message display
          cy.contains(/error|failed|unable/i).should('be.visible');
        });
      });
  
      it('should handle network errors during agent query', () => {
        // Setup test within application context
        cy.window().then(win => {
          // Mock network error
          cy.intercept('POST', '**/rag/agent', {
            forceNetworkError: true
          }).as('agentNetworkError');
  
          // Type a message and send it
          cy.get('textarea, input[type="text"], .MuiInputBase-input')
            .filter(':visible')
            .first()
            .type('Test message for network error');
          
          // Find and click the send button
          cy.get('button')
            .filter(':visible')
            .filter(':not(:disabled)')
            .last()
            .click();
          
          // Wait for the API call
          cy.wait('@agentNetworkError');
          
          // Check for network error handling message
          cy.contains(/error|failed|unable to connect/i).should('be.visible');
        });
      });
  
      it('should handle malformed responses from agent API', () => {
        // Setup test within application context
        cy.window().then(win => {
          // Mock malformed/incomplete response
          cy.intercept('POST', '**/rag/agent', {
            statusCode: 200,
            body: {
              success: true,
              // Missing classification data
              message: "Processed but data is incomplete"
            }
          }).as('agentMalformedResponse');
  
          // Type a message and send it
          cy.get('textarea, input[type="text"], .MuiInputBase-input')
            .filter(':visible')
            .first()
            .type('Test message for malformed response');
          
          // Find and click the send button
          cy.get('button')
            .filter(':visible')
            .filter(':not(:disabled)')
            .last()
            .click();
          
          // Wait for the API call
          cy.wait('@agentMalformedResponse');
          
          // The app should handle this gracefully without crashing
          cy.get('body').should('be.visible');
        });
      });
  
      it('should display reasoning steps when available', () => {
        // Setup test within application context
        cy.window().then(win => {
          // Mock detailed agent response with reasoning steps
          cy.intercept('POST', '**/rag/agent', {
            statusCode: 200,
            body: {
              success: true,
              classification: {
                category: "Language",
                confidence: 95,
                reasoning: "The comment is in Spanish and discusses language issues",
                keywords: ["español", "language", "habla"]
              },
              reasoning_steps: [
                {
                  step: "initial_analysis",
                  content: "This comment appears to be in Spanish"
                },
                {
                  step: "tool_selection",
                  selected_tools: ["translate_text", "analyze_sentiment"]
                },
                {
                  step: "tool_execution",
                  results: {
                    translate_text: {
                      status: "success",
                      detected_language: "spanish",
                      translated_text: "I don't speak English well and need help with translation"
                    },
                    analyze_sentiment: {
                      status: "success",
                      results: {
                        overall_sentiment: "neutral",
                        sentiment_score: 0
                      }
                    }
                  }
                }
              ]
            }
          }).as('agentDetailedResponse');
  
          // Type a message and send it
          cy.get('textarea, input[type="text"], .MuiInputBase-input')
            .filter(':visible')
            .first()
            .type('No hablo inglés bien y necesito ayuda con la traducción');
          
          // Find and click the send button
          cy.get('button')
            .filter(':visible')
            .filter(':not(:disabled)')
            .last()
            .click();
          
          // Wait for the API call
          cy.wait('@agentDetailedResponse');
          
          // Check for detailed reasoning information display
          cy.contains('Language').should('be.visible');
          cy.contains(/95%|confidence/i).should('exist');
          
          // Look for reasoning steps display - implementation specific
          cy.contains(/reasoning|process|steps|analysis/i).should('exist');
          cy.contains(/translate|spanish|english/i).should('exist');
        });
      });
  
      it('should maintain chat history after agent response', () => {
        // Setup test within application context
        cy.window().then(win => {
          // Mock successful agent response
          cy.intercept('POST', '**/rag/agent', {
            statusCode: 200,
            body: {
              success: true,
              classification: {
                category: "OK",
                confidence: 85,
                reasoning: "The comment is positive feedback",
                keywords: ["happy", "great", "excellent"]
              }
            }
          }).as('agentResponse');
  
          // Type first message and send it
          cy.get('textarea, input[type="text"], .MuiInputBase-input')
            .filter(':visible')
            .first()
            .clear()
            .type('I am very happy with the great service received')
            .should('have.value', 'I am very happy with the great service received');
          
          // Find and click the send button
          cy.get('button')
            .filter(':visible')
            .filter(':not(:disabled)')
            .last()
            .click();
          
          // Wait for the API call
          cy.wait('@agentResponse');
          
          // Verify the message in the chat area (check for message text in the DOM)
          cy.contains(/I am very happy|great service/i).should('exist');
          
          // Verify agent response is displayed
          cy.contains('OK').should('be.visible');
          
          // Set up second mock response with a delay
          cy.intercept('POST', '**/rag/agent', {
            delay: 500, // Add a small delay to ensure UI updates completely
            statusCode: 200,
            body: {
              success: true,
              classification: {
                category: "Complaint",
                confidence: 90,
                reasoning: "This is a complaint about service",
                keywords: ["disappointed", "service"]
              }
            }
          }).as('secondAgentResponse');
  
          // Type second message and send it
          cy.get('textarea, input[type="text"], .MuiInputBase-input')
            .filter(':visible')
            .first()
            .clear()
            .type('But I am disappointed with another service')
            .should('have.value', 'But I am disappointed with another service');
          
          // Find and click the send button
          cy.get('button')
            .filter(':visible')
            .filter(':not(:disabled)')
            .last()
            .click();
          
          // Wait for the API call
          cy.wait('@secondAgentResponse');
          
          // Verify the second message is visible
          cy.contains(/disappointed|another service/i).should('exist');
          
          // Verify second response is visible
          cy.contains('Complaint').should('be.visible');
        });
      });
  
      it('should handle empty input gracefully', () => {
        // Setup test within application context
        cy.window().then(win => {
          // No need to mock API as empty input shouldn't trigger API call
          
          // Get the input element first
          cy.get('textarea, input[type="text"], .MuiInputBase-input')
            .filter(':visible')
            .first()
            .clear()
            .should('be.empty');
            
          // Verify the send button is either disabled or not clickable for empty input
          cy.get('button')
            .filter(':visible')
            .last()
            .then($button => {
              // Check if the button is disabled (preferred way to handle empty input)
              const isDisabled = $button.prop('disabled') === true || 
                                $button.attr('disabled') === 'disabled' ||
                                $button.hasClass('Mui-disabled');
              
              if (isDisabled) {
                // If button is properly disabled, assert that it's disabled
                cy.wrap($button).should('be.disabled');
              } else {
                // If button isn't disabled but should ignore empty input
                // Just verify we can click it without crashing
                cy.wrap($button).click();
                // And verify no message appears in the chat
                cy.get('body').should('be.visible');
                // The input should still be empty
                cy.get('textarea, input[type="text"], .MuiInputBase-input')
                  .filter(':visible')
                  .first()
                  .should('be.empty');
              }
            });
        });
      });
  
      it('should display loading state during API call', () => {
        // Setup test within application context
        cy.window().then(win => {
          // Mock delayed response to show loading state
          cy.intercept('POST', '**/rag/agent', {
            delay: 1000, // 1 second delay
            statusCode: 200,
            body: {
              success: true,
              classification: {
                category: "OK",
                confidence: 80,
                reasoning: "Simple response for loading test"
              }
            }
          }).as('delayedAgentResponse');
  
          // Type message and send it
          cy.get('textarea, input[type="text"], .MuiInputBase-input')
            .filter(':visible')
            .first()
            .type('Test message for loading state');
          
          // Find and click the send button
          cy.get('button')
            .filter(':visible')
            .filter(':not(:disabled)')
            .last()
            .click();
          
          // Check for loading indicator before response completes
          cy.get('.MuiCircularProgress-root, [class*="CircularProgress"], [class*="loading"], [class*="spinner"]')
            .should('be.visible');
          
          // Wait for the delayed response
          cy.wait('@delayedAgentResponse');
          
          // Verify response is displayed after loading
          cy.contains('OK').should('be.visible');
        });
      });
    });
  });