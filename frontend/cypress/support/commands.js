// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to check if element is visible and has specific text
Cypress.Commands.add('containsAndVisible', (selector, text) => {
    cy.get(selector).should('be.visible').and('contain', text);
  });
  
  // Custom command for waiting a specific UI animation to complete
  Cypress.Commands.add('waitForAnimations', () => {
    cy.wait(1000); // Wait for animations to complete
  });
  
  // Custom command to simulate loading a file
  Cypress.Commands.add('mockFileUpload', (fileUploadSelector, fileName) => {
    cy.get(fileUploadSelector).then(subject => {
      cy.fixture(fileName, 'base64').then(content => {
        const blob = Cypress.Blob.base64StringToBlob(content);
        const testFile = new File([blob], fileName);
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(testFile);
        
        const input = subject[0];
        input.files = dataTransfer.files;
        return cy.wrap(subject).trigger('change', { force: true });
      });
    });
  });

  // Add this to your cypress/support/commands.js file
Cypress.Commands.add('clickPosition', (x, y) => {
  cy.window().then((win) => {
    const element = win.document.elementFromPoint(x, y);
    if (element) {
      cy.wrap(element).click({force: true});
    } else {
      throw new Error(`No element found at position (${x}, ${y})`);
    }
  });
});