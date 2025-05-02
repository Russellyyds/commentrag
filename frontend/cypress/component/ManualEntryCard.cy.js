import React from 'react';
import ManualEntryCard from '../../src/pages/dataImport/upload/ManualEntryCard';
import { ThemeProvider } from '@mui/material';
import theme from '../../src/utils/theme';
import * as apiService from '../../src/hooks/apiService';

describe('ManualEntryCard Component', () => {
  // Variable to store mock response
  const mockResponse = {
    success: true,
    data: {
      answer: [
        {
          id: 1,
          comment: 'Similar comment example',
          category: 'OK',
          similarity: 0.85
        }
      ],
      classification: {
        category: 'OK',
        confidence: 90,
        reasoning: 'This is a positive comment'
      }
    }
  };

  beforeEach(() => {
    // Use callsFake to ensure stub works correctly
    cy.stub(apiService, 'submitManualComment')
      .as('submitComment')
      .callsFake(() => Promise.resolve(mockResponse));

    // Mount the component
    cy.mount(
      <ThemeProvider theme={theme}>
        <ManualEntryCard />
      </ThemeProvider>
    );
  });

  it('should render with correct title and placeholder', () => {
    cy.contains('Manual Comment Entry').should('be.visible');
    cy.contains('Enter comments directly for instant AI classification').should('be.visible');
    cy.get('textarea[placeholder="Type a comment for analysis..."]').should('exist');
  });

  it('should show empty state message initially', () => {
    cy.contains('Start typing to analyze comments').should('be.visible');
  });

  it('should allow typing a comment', () => {
    const testComment = 'This is a test comment';
    cy.get('textarea[placeholder="Type a comment for analysis..."]')
      .type(testComment, { force: true });
    cy.get('textarea[placeholder="Type a comment for analysis..."]')
      .should('have.value', testComment);
  });

  it('should enable the send button when text is entered', () => {
    // First confirm button is initially disabled
    cy.get('button').last().should('be.disabled');
    
    // Button should be enabled after text input
    cy.get('textarea[placeholder="Type a comment for analysis..."]')
      .type('This is a test comment', { force: true });
    cy.get('button').last().should('not.be.disabled');
  });
});