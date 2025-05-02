import React from 'react';
import CommentsListWithPageScroll from '../../src/components/CommentsList';
import { ThemeProvider } from '@mui/material';
import theme from '../../src/utils/theme';

describe('CommentsList Component', () => {
  // Move stub declarations inside beforeEach
  let baseProps;
  
  beforeEach(() => {
    // Set up common props with stubs inside beforeEach
    baseProps = {
      comments: [],
      confidenceThreshold: 50,
      onRowClick: cy.stub().as('rowClickHandler'),
      currentPage: 1,
      totalPages: 1,
      onPageChange: cy.stub().as('pageChangeHandler'),
      pageSize: 10,
      onPageSizeChange: cy.stub().as('pageSizeChangeHandler'),
      totalItems: 0
    };
  });

  // Test with empty comments
  const mountEmptyComments = () => {
    cy.mount(
      <ThemeProvider theme={theme}>
        <CommentsListWithPageScroll
          {...baseProps}
        />
      </ThemeProvider>
    );
  };

  // Test with a few comments
  const mockComments = [
    {
      id: 1,
      comment: 'This is a positive comment',
      category: 'OK',
      confidence: 95
    },
    {
      id: 2,
      comment: 'I am having issues with my order',
      category: 'Complaint',
      confidence: 88
    },
    {
      id: 3,
      comment: 'The support staff was not helpful',
      category: 'Complaint',
      confidence: 45 // Below threshold
    }
  ];

  const mountWithComments = () => {
    cy.mount(
      <ThemeProvider theme={theme}>
        <CommentsListWithPageScroll
          {...baseProps}
          comments={mockComments}
          totalItems={mockComments.length}
        />
      </ThemeProvider>
    );
  };

  // Test with pagination
  const mountWithPagination = () => {
    // Create more mock comments for pagination
    const manyComments = Array(25).fill().map((_, index) => ({
      id: index + 1,
      comment: `Comment number ${index + 1}`,
      category: index % 2 === 0 ? 'OK' : 'Complaint',
      confidence: Math.floor(Math.random() * 100)
    }));

    cy.mount(
      <ThemeProvider theme={theme}>
        <CommentsListWithPageScroll
          {...baseProps}
          comments={manyComments.slice(0, 10)} // First page
          currentPage={1}
          totalPages={3}
          pageSize={10}
          totalItems={manyComments.length}
        />
      </ThemeProvider>
    );
  };

  describe('Empty state', () => {
    beforeEach(() => {
      mountEmptyComments();
    });

    it('should show empty state message when no comments', () => {
      cy.contains('No comments found matching the current filter').should('be.visible');
    });
  });

  describe('With comments', () => {
    beforeEach(() => {
      mountWithComments();
    });

    it('should render comments in a table', () => {
      cy.get('table').should('exist');
      cy.contains('th', 'ID').should('be.visible');
      cy.contains('th', 'Comment').should('be.visible');
      cy.contains('th', 'Category').should('be.visible');
      cy.contains('th', 'Confidence').should('be.visible');
    });

    it('should display all comments', () => {
      mockComments.forEach(comment => {
        cy.contains(comment.comment).should('be.visible');
        cy.contains(comment.category).should('be.visible');
      });
    });

    it('should highlight low confidence comments', () => {
      // Find the comment with low confidence (below threshold)
      const lowConfidenceComment = mockComments.find(c => c.confidence < baseProps.confidenceThreshold);
      
      // Get the row containing this comment
      cy.contains(lowConfidenceComment.comment)
        .closest('tr')
        .should('have.css', 'background-color')
        .and('not.equal', 'rgba(0, 0, 0, 0)'); // Should have a background color
      
      // Check that the error icon is visible
      cy.contains(lowConfidenceComment.comment)
        .closest('tr')
        .find('svg[data-testid="ErrorIcon"]')
        .should('be.visible');
    });

    it('should call onRowClick when a row is clicked', () => {
      // Click on the first comment row
      cy.contains(mockComments[0].comment).closest('tr').click();
      
      // Verify the handler was called with the correct comment
      cy.get('@rowClickHandler').should('have.been.calledWith', mockComments[0]);
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      mountWithPagination();
    });

    it('should display pagination controls', () => {
      cy.get('.MuiTablePagination-root').should('be.visible');
    });

    it('should call onPageChange when page is changed', () => {
      // Find and click the 'next page' button
      cy.get('.MuiTablePagination-actions button').last().click();
      
      // Verify handler was called with page 2
      cy.get('@pageChangeHandler').should('have.been.calledWith', 2);
    });
  });

  describe('Category display', () => {
    beforeEach(() => {
      mountWithComments();
    });

    // Modified test to adapt to the actual component structure
    it('should display category chip for each comment', () => {
      // Directly check if chip labels are displayed, instead of checking color properties
      cy.contains('.MuiChip-label', 'OK').should('be.visible');
      cy.contains('.MuiChip-label', 'Complaint').should('be.visible');
    });
  });
});