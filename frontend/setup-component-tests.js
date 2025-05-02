// This script sets up your component tests correctly
const fs = require('fs');
const path = require('path');

// Helper function to ensure a directory exists
function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Create necessary directories
const cypress_dir = path.join(process.cwd(), 'cypress');
const componentDir = path.join(cypress_dir, 'component');
const supportDir = path.join(cypress_dir, 'support');

ensureDirExists(cypress_dir);
ensureDirExists(componentDir);
ensureDirExists(supportDir);

// Create the component-index.html file
const componentIndexHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>Components App</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" />
  </head>
  <body>
    <div data-cy-root></div>
  </body>
</html>`;

const componentIndexPath = path.join(supportDir, 'component-index.html');
fs.writeFileSync(componentIndexPath, componentIndexHtml);
console.log(`Created ${componentIndexPath}`);

// Update component.js if needed
const componentJsPath = path.join(supportDir, 'component.js');
const componentJs = `// ***********************************************************
// This support/component.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Import cypress code coverage collection
import '@cypress/code-coverage/support'

// Import React mount function
import { mount } from 'cypress/react18'

// Import additional testing library commands
import '@testing-library/cypress/add-commands'

// Add the mount command
Cypress.Commands.add('mount', mount)

// Example use:
// cy.mount(<MyComponent />)`;

fs.writeFileSync(componentJsPath, componentJs);
console.log(`Updated ${componentJsPath}`);

// List of component test files we've created
const testFiles = [
  'FileUploadCard.cy.js',
  'ManualEntryCard.cy.js',
  'CommentsList.cy.js',
  'FilterSection.cy.js',
  'CommentsStats.cy.js',
  'ActionButtons.cy.js',
  'HighlightedComment.cy.js',
  'UploadDropZone.cy.js'
];

// Move each test file to the cypress/component directory
let movedCount = 0;
testFiles.forEach(file => {
  const sourcePath = path.join(process.cwd(), file);
  const destPath = path.join(componentDir, file);
  
  if (fs.existsSync(sourcePath)) {
    console.log(`Moving ${file} to cypress/component directory...`);
    fs.copyFileSync(sourcePath, destPath);
    fs.unlinkSync(sourcePath);
    movedCount++;
  } else if (!fs.existsSync(destPath)) {
    console.log(`Warning: Could not find ${file} in any location.`);
  }
});

console.log(`Component test setup complete! Moved ${movedCount} test files.`);
console.log('To run component tests: npx cypress run --component');