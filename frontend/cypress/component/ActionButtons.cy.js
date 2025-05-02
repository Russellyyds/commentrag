import React from 'react';
import ActionButtons from '../../src/pages/manualReview/components/ActionButtons';
import { ThemeProvider } from '@mui/material';
import theme from '../../src/utils/theme';

describe('ActionButtons Component', () => {
  // Move stub creation inside beforeEach or it blocks
  let mockHandlers;
  
  beforeEach(() => {
    // Create stubs for the event handlers inside the beforeEach
    mockHandlers = {
      onCancel: cy.stub().as('cancelHandler'),
      onSubmit: cy.stub().as('submitHandler')
    };
  });

  // Basic component mounting with default props
  const mountComponent = (props = {}) => {
    cy.mount(
      <ThemeProvider theme={theme}>
        <ActionButtons
          onCancel={mockHandlers.onCancel}
          onSubmit={mockHandlers.onSubmit}
          {...props}
        />
      </ThemeProvider>
    );
  };

  describe('Rendering', () => {
    beforeEach(() => {
      mountComponent();
    });

    it('should render both buttons with default text', () => {
      cy.contains('button', 'Cancel').should('be.visible');
      cy.contains('button', 'Submit').should('be.visible');
    });

    it('should render with custom labels when provided', () => {
      mountComponent({
        cancelLabel: 'Go Back',
        submitLabel: 'Save Changes'
      });

      cy.contains('button', 'Go Back').should('be.visible');
      cy.contains('button', 'Save Changes').should('be.visible');
    });
  });

  describe('Button clicks', () => {
    beforeEach(() => {
      mountComponent();
    });

    it('should call onCancel when Cancel button is clicked', () => {
      cy.contains('button', 'Cancel').click();
      cy.get('@cancelHandler').should('have.been.called');
    });

    it('should call onSubmit when Submit button is clicked', () => {
      cy.contains('button', 'Submit').click();
      cy.get('@submitHandler').should('have.been.called');
    });
  });

  describe('Loading state', () => {
    it('should show loading state on Submit button when isSubmitting is true', () => {
      mountComponent({ isSubmitting: true });

      // Check that the button shows loading text
      cy.contains('button', 'Submitting...').should('be.visible');
      
      // Check for CircularProgress component
      cy.get('.MuiCircularProgress-root').should('exist');
      
      // Buttons should be disabled in loading state
      cy.contains('button', 'Submitting...').should('be.disabled');
      cy.contains('button', 'Cancel').should('be.disabled');
    });
  });

  describe('Styling and appearance', () => {
    beforeEach(() => {
      mountComponent();
    });

    it('should have Cancel as a secondary button', () => {
      cy.contains('button', 'Cancel')
        .should('not.have.class', 'MuiButton-contained');
    });

    it('should have Submit as a primary/contained button', () => {
      cy.contains('button', 'Submit')
        .should('have.class', 'MuiButton-contained');
    });

    it('should have rounded corners (high border-radius)', () => {
      cy.contains('button', 'Submit')
        .should('have.css', 'border-radius')
        .and('not.equal', '0px');
    });
  });

  describe('Edge cases', () => {

    it('should correctly render when only one handler is provided', () => {
      // Only provide submit handler
      cy.mount(
        <ThemeProvider theme={theme}>
          <ActionButtons
            onSubmit={mockHandlers.onSubmit}
          />
        </ThemeProvider>
      );

      // Both buttons should render, but only Submit should work
      cy.contains('button', 'Submit').click();
      cy.get('@submitHandler').should('have.been.called');
      
      // Cancel button should still be visible
      cy.contains('button', 'Cancel').should('be.visible');
    });
  });
});