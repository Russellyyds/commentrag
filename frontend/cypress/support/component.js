// ***********************************************************
// This support/component.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
// ***********************************************************

// Mock process.env to fix environment variable issues
window.process = {
    env: {
      REACT_APP_API_URL: 'http://localhost:8088',
      REACT_APP_USE_MOCK_DATA: 'true'
    }
  };

// Import commands.js using ES2015 syntax:
import './commands'

// Import cypress code coverage collection
import '@cypress/code-coverage/support'

// Import React mount function
import { mount } from 'cypress/react'

// Import additional testing library commands
import '@testing-library/cypress/add-commands'

// Add the mount command
Cypress.Commands.add('mount', mount)

// Example use:
// cy.mount(<MyComponent />)