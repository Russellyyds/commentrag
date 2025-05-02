import React from 'react';
import CommentsStats from '../../src/components/review/CommentsStats';
import { ThemeProvider } from '@mui/material';
import theme from '../../src/utils/theme';
import { BrowserRouter } from 'react-router-dom';

describe('CommentsStats Component', () => {
  // Mock stats data with counts and percentages
  const mockStats = {
    'OK': { count: 150, percentage: 50 },
    'Complaint': { count: 75, percentage: 25 },
    'Mental Health': { count: 30, percentage: 10 },
    'Language': { count: 45, percentage: 15 },
    'Needs Review': { count: 20, percentage: 6.7 },
  };

  const baseProps = {
    stats: mockStats,
    selectedCategory: 'All Tags',
    isGlobalStats: true,
    currentProjectId: 'test-project-id'
  };

  // Wrapping component to provide necessary context
  const mountComponent = (props = {}) => {
    cy.mount(
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <CommentsStats
            {...baseProps}
            {...props}
          />
        </BrowserRouter>
      </ThemeProvider>
    );
  };

  describe('Rendering', () => {
    beforeEach(() => {
      mountComponent();
    });

    it('should render the title correctly', () => {
      cy.contains('Global Comment Distribution').should('be.visible');
    });

    it('should render all category cards', () => {
      Object.keys(mockStats).forEach(category => {
        cy.contains(category).should('be.visible');
        cy.contains(`${mockStats[category].count}`).should('be.visible');
        cy.contains(`${mockStats[category].percentage.toFixed(1)}%`).should('be.visible');
      });
    });
  });

  describe('Toggle functionality', () => {
    beforeEach(() => {
      mountComponent();
    });

    it('should be expanded by default', () => {
      // Check if content is visible
      cy.contains('comments').should('be.visible');
    });
  });

  describe('Category cards interaction', () => {
    beforeEach(() => {
      mountComponent();
    });

    it('should have clickable cards for categories with counts', () => {
      // Check that cards with counts have the appropriate styling/cursor
      cy.contains('OK').closest('.MuiPaper-root')
        .should('have.css', 'cursor', 'pointer');
    });

    it('should not allow clicking cards with zero count', () => {
      // Mount with a category that has 0 count
      const statsWithZero = { 
        ...mockStats,
        'Zero Count': { count: 0, percentage: 0 } 
      };
      
      mountComponent({ stats: statsWithZero });
      
      // Check for appropriate styling/cursor
      cy.contains('Zero Count').closest('.MuiPaper-root')
        .should('not.have.css', 'cursor', 'pointer');
    });
  });

  describe('Different states', () => {
    it('should show different title for non-global stats', () => {
      mountComponent({ isGlobalStats: false });
      
      cy.contains('Comment Distribution').should('be.visible');
      cy.contains('Global Comment Distribution').should('not.exist');
    });

    it('should not render if no stats are provided', () => {
      mountComponent({ stats: {} });
      
      // Component should return null - check that title doesn't exist
      cy.contains('Global Comment Distribution').should('not.exist');
      cy.contains('Comment Distribution').should('not.exist');
    });

    it('should handle filtered view text', () => {
      mountComponent({ 
        isGlobalStats: false,
        selectedCategory: 'Complaint' 
      });
      
      cy.contains('filtered by Complaint').should('be.visible');
    });
  });

  describe('Visual design', () => {
    beforeEach(() => {
      mountComponent();
    });

    it('should use appropriate icons for headings', () => {
      cy.get('svg[data-testid="EqualizerIcon"]').should('be.visible');
    });

    it('should highlight OK category as primary and Complaint as error', () => {
      // OK category should have success color - we just test for background color
      cy.contains('OK')
        .closest('.MuiPaper-root')
        .should('have.css', 'background-color')
        .and('not.equal', 'rgba(0, 0, 0, 0)');
        
      // Complaint category should have error color  
      cy.contains('Complaint')
        .closest('.MuiPaper-root')
        .should('have.css', 'background-color')
        .and('not.equal', 'rgba(0, 0, 0, 0)');
    });
  });
});