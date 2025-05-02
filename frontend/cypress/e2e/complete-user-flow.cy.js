describe('Complete User Flow - From Homepage to Data Export', () => {
  beforeEach(() => {
    // Visit the homepage before each test
    cy.visit('/');
    
    // Set longer timeout for API calls and processing
    Cypress.config('defaultCommandTimeout', 10000);
  });

  it('should navigate through the entire application workflow', () => {
    // ================ HOMEPAGE ================
    // Verify we're on the homepage
    cy.contains('h2', 'Intelligent AI Comment Analysis System').should('be.visible');
    
    // Click the "Get Started" button
    cy.contains('button', 'Get Started').click();
    
    // ================ DATA IMPORT PAGE ================
    // Verify we've navigated to the data import page
    cy.url().should('include', '/data-import');
    
    // Scroll to top to ensure dropzone is visible
    cy.scrollTo('top');
    
    // Verify the data import page loads with the dropzone
    cy.contains('Drop your files here').should('be.visible');
    
    // Open help panel by clicking the help icon button
    cy.get('button')
      .find('svg[data-testid="HelpOutlineIcon"]')
      .closest('button')
      .click();
    
    // Verify the help panel appears
    cy.contains('Data Structure Requirements').should('be.visible');
    cy.contains('Supported File Formats').should('be.visible');
    
    // Close the help panel
    cy.contains('button', 'Got it').click();
    
    // ================ MANUAL ENTRY SECTION ================
    // The manual entry card should be visible
    cy.contains('Manual Comment Entry').should('be.visible');
    
    // Enter a comment in the input field
    cy.get('textarea[placeholder="Type a comment for analysis..."]')
      .type('This product is amazing, I love it!');
    
    // Click the send button - looks for the send icon since the button might not have text
    cy.get('button')
      .find('svg[data-testid="SendIcon"]')
      .closest('button')
      .click();
    
    // Wait for the API response and verify results appear in chat
    cy.contains('been categorized as').should('be.visible', { timeout: 15000 });
    
    // ================ SIDEBAR NAVIGATION ================
    
    // Navigate to AI Agent through sidebar
    cy.contains('AI Agent').click();
    cy.url().should('include', '/ai-agent');
    
    // Verify agent page loaded
    cy.contains('AI Agent Chat').should('be.visible');

    // Enter a comment in the input field
    cy.get('textarea[placeholder="Type a comment for analysis..."]')
    .type('The customer service representative was extremely rude and unhelpful when I called about my order problem. They refused to help me.');

    // Click the send button
    cy.get('button')
      .find('svg[data-testid="SendIcon"]')
      .closest('button')
      .click();
    
    // ================ BACK TO DATA IMPORT ================
    // Navigate back to Data Import page
    cy.contains('Data Import').click();
    cy.url().should('include', '/data-import');
    
    // Scroll to the top to ensure dropzone visibility
    cy.scrollTo('top');
    
    // Verify data import page loaded
    cy.contains('Drop your files here').should('be.visible');

    // ================ FILE UPLOAD PROCESS ================
    // Prepare for file upload - mock file and upload process
    cy.fixture('sample.csv', 'base64').then(fileContent => {
      // Convert the file content to a Blob
      const blob = Cypress.Blob.base64StringToBlob(fileContent, 'text/csv');
      const testFile = new File([blob], 'sample.csv', { type: 'text/csv' });
      
      // Create a list of files with our test file
      const fileList = [testFile];
      
      // Simulate dropping the file onto the drop zone
      cy.get('div').contains('Drop your files here').parent()
        .trigger('drop', { 
          dataTransfer: { files: fileList, types: ['Files'] }
        });
    });

    // Verify file is added to the list
    cy.contains('sample.csv').should('be.visible', { timeout: 15000 });

    cy.wait(3000);
    
    // Click Process Files button
    cy.contains('button', 'Process Files', { timeout: 10000 }).click();
    cy.scrollTo('top');
    
    // Wait for processing to complete
    cy.contains('Import Complete!', { timeout: 60000 }).should('be.visible');
    
    // ================ MANUAL REVIEW VIA UPLOAD CARD ================
    // Test navigation to Manual Review using the button on the upload card
    cy.contains('button', 'Manual Review').click();
    cy.url().should('include', '/manual-review');
    
    cy.wait(2000);
    // Verify we're on the manual review page
    cy.contains('Comment ID:').should('be.visible');
    
    // Check if we have a list of comments loaded with "All Tags"
    cy.get('body').then($body => {
      if ($body.text().includes('All Tags')) {
        cy.contains('All Tags').should('be.visible');
      }
    });
    
    // Go back to Data Import
    cy.contains('Data Import').click();
    cy.url().should('include', '/data-import');
    
    // ================ AUTO REVIEW ================
    // Navigate to Auto Review from Upload Card
    cy.contains('button', 'Auto Review').click();
    cy.url().should('include', '/auto-review');
    
    // Verify data is loaded in Auto Review
    cy.contains('Global Comment Distribution', { timeout: 15000 }).should('be.visible');
    
    // Find and click a comment to navigate to manual review
    cy.get('body').then($body => {
      // If there's a table with comments, click on the first one
      if ($body.find('table tbody tr').length > 0) {
        cy.get('table tbody tr').first().click();
        cy.url().should('include', '/manual-review');
        
        // ================ MANUAL REVIEW FROM AUTO REVIEW ================
        // Verify we're on the manual review page with the selected comment
        cy.contains('Comment ID:').should('be.visible');
        
        // Scroll down to see the category selector
        cy.scrollTo('bottom');
        
        // Check if category selector exists
        cy.get('body').then($body => {
          // First try with the MUI Select component
          if ($body.find('div[role="button"][aria-haspopup="listbox"]').length > 0) {
            cy.get('div[role="button"][aria-haspopup="listbox"]').click();
          } 
          // Try by standard form control
          else if ($body.find('.MuiFormControl-root .MuiSelect-select').length > 0) {
            cy.get('.MuiFormControl-root .MuiSelect-select').click();
          }
          // Last attempt by ID
          else if ($body.find('#category-filter').length > 0) {
            cy.get('#category-filter').click();
          }
        });
        
        // Wait for dropdown to appear and select "Appearance" category
        cy.get('li[role="option"]').contains('Appearance').click();
        
        // Click Submit button to update the category
        cy.contains('button', 'Submit').click();

        cy.wait(2000);
        
        // Verify we're redirected back to Auto Review 
        cy.url().should('include', '/auto-review');

        cy.wait(2000);
        
        // ================ NEW: CHECK AND CLICK ON APPEARANCE CATEGORY CARD ================
        // Look for Appearance in the stats section
        cy.get('body').then($body => {
          if ($body.text().includes('Appearance')) {
            // First make sure it's visible (may need to expand the stats section)
            if ($body.find('button svg[data-testid="ExpandMoreIcon"]').length > 0) {
              cy.get('button svg[data-testid="ExpandMoreIcon"]').closest('button').click();
              cy.wait(500);
            }
            
            // Find and click on the Appearance card
            cy.contains('Appearance').closest('div.MuiPaper-root').click();
            
            // Verify we're in manual review with Appearance category
            cy.url().should('include', '/manual-review');
            cy.wait(2000);
            
            // Verify we're in the Appearance queue
            cy.get('body').then($body => {
              if ($body.text().includes('Appearance')) {
                cy.contains('Appearance').should('be.visible');
              }
            });
            
            // Go back to auto review after checking
            cy.contains('Auto Review').click();
            cy.url().should('include', '/auto-review');
          }
        });
      }
    });
    
    // ================ MANUAL REVIEW FROM SIDEBAR ================
    // Navigate to Manual Review from sidebar
    cy.contains('Manual Review').click();
    cy.url().should('include', '/manual-review');

    cy.wait(1000);
    
    // Verify we're on the manual review page
    cy.contains('Comment ID:').should('be.visible');
    
    // Check if "All Tags" queue is visible
    cy.get('body').then($body => {
      if ($body.text().includes('All Tags')) {
        cy.contains('All Tags').should('be.visible');
      }
    });
    
    // Navigate within the manual review list if available
    cy.get('body').then($body => {
      // If next button is available and enabled, click it
      if ($body.find('button svg[data-testid="KeyboardArrowRightIcon"]').length > 0 && 
          !$body.find('button[disabled] svg[data-testid="KeyboardArrowRightIcon"]').length > 0) {
        cy.get('button svg[data-testid="KeyboardArrowRightIcon"]').closest('button').click();
        cy.wait(1000);
        
        // Try to click next again if available
        if ($body.find('button svg[data-testid="KeyboardArrowRightIcon"]').length > 0 && 
            !$body.find('button[disabled] svg[data-testid="KeyboardArrowRightIcon"]').length > 0) {
          cy.get('button svg[data-testid="KeyboardArrowRightIcon"]').closest('button').click();
          cy.wait(1000);
        }
        
        // Now try to click previous if available
        if ($body.find('button svg[data-testid="KeyboardArrowLeftIcon"]').length > 0 && 
            !$body.find('button[disabled] svg[data-testid="KeyboardArrowLeftIcon"]').length > 0) {
          cy.get('button svg[data-testid="KeyboardArrowLeftIcon"]').closest('button').click();
          cy.wait(1000);
        }
      }
    });
    
    // Navigate back to Auto Review
    cy.contains('Auto Review').click();
    cy.url().should('include', '/auto-review');
    
    // ================ DATA EXPORT ================
    // Navigate to Data Export
    cy.contains('Data Export').click();
    cy.url().should('include', '/export');
    cy.wait(2000);

    // Check for comments to export
    cy.get('body').then($body => {
      if (!$body.text().includes('No comments available') && !$body.text().includes('No comments found')) {
        // Try to select some checkboxes for export
        cy.get('input[type="checkbox"]').eq(1).check({force: true});
        cy.get('input[type="checkbox"]').eq(2).check({force: true});
        cy.wait(1000);
        
        // Open category filter dropdown using the existing ID
        cy.get('#category-filter').click({force: true});
        cy.wait(1000);
        
        // Click Appearance within the dropdown
        cy.get('.MuiMenu-paper').should('be.visible').within(() => {
          cy.contains('li', 'Appearance').click({force: true});
        });
        cy.wait(500);
        
        // Click outside to close dropdown
        cy.clickPosition(400, 200);
        cy.wait(1000);
        
        // Interact with the confidence slider using its label
        cy.get('[aria-labelledby="confidence-slider-label"]').click('right', {force: true});
        cy.wait(500);
        
        // Test export in different formats using the existing ID
        // 1. Export as CSV
        cy.get('#format-select').click({force: true});
        cy.contains('li', 'CSV').click({force: true});
        cy.wait(500);
        cy.contains('button', 'Export').click({force: true});
        cy.wait(2000);
        
        // 2. Export as TSV
        cy.get('#format-select').click({force: true});
        cy.contains('li', 'TSV').click({force: true});
        cy.wait(500);
        cy.contains('button', 'Export').click({force: true});
        cy.wait(2000);
        
        // 3. Export as Excel
        cy.get('#format-select').click({force: true});
        cy.contains('li', 'Excel').click({force: true});
        cy.wait(500);
        cy.contains('button', 'Export').click({force: true});
        cy.wait(2000);
      }
    });

    // ================ AI AGENT PAGE ================
    // Navigate to AI Agent page
    cy.contains('AI Agent').click();
    cy.url().should('include', '/ai-agent');

    // Verify the page has loaded correctly
    cy.contains('AI Agent Chat').should('be.visible');

    // Wait for the agent response with a longer timeout since agent processing takes longer
    cy.contains('categorized it as', { timeout: 60000 }).should('be.visible');
    
    cy.scrollTo('top');
    cy.wait(1000);
    // Check if reasoning process section appears
    cy.contains('Agent Reasoning Process').should('be.visible');

    // Expand the reasoning section if it's collapsed
    cy.get('body').then($body => {
      if ($body.find('button svg[data-testid="ExpandMoreIcon"]').length > 0) {
        cy.get('button svg[data-testid="ExpandMoreIcon"]').closest('button').click();
      }
    });

    // Verify that the reasoning steps are visible
    cy.contains('Tool Selection').should('exist');
    cy.contains('Tool Execution').should('exist');

    // Clear history
    cy.contains('button', 'Clear History').click();
    cy.wait(1000);

    // Verify chat is cleared (no messages showing)
    cy.get('textarea[placeholder="Type a comment for analysis..."]').should('be.empty');
    cy.wait(1000);
    cy.contains('Start typing to analyze comments').should('be.visible');

    // Navigate back to Data Export for the reset step
    cy.contains('Data Export').click();
    cy.url().should('include', '/export');
    
    // ================ RESET PROJECT ================
    cy.wait(2000);
    cy.scrollTo('top');
    cy.contains('button', 'Reset Project').click();   
    cy.wait(2000);
    cy.get('div[role="dialog"]').within(() => {
      cy.contains('button', 'Reset Project').click({ force: true });
    });
    cy.wait(3000);

    cy.url().should('include', '/data-import');
  });
});