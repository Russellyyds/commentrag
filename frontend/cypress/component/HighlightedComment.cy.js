import React from 'react';
import HighlightedComment from '../../src/pages/manualReview/components/HighlightedComment';
import { ThemeProvider } from '@mui/material';
import theme from '../../src/utils/theme';

describe('HighlightedComment Component', () => {
  // Basic mounting with just text
  const mountBasic = (text = "This is a test comment") => {
    cy.mount(
      <ThemeProvider theme={theme}>
        <HighlightedComment
          text={text}
        />
      </ThemeProvider>
    );
  };

  // Mount with text and keywords to highlight
  const mountWithKeywords = (text, keywords) => {
    cy.mount(
      <ThemeProvider theme={theme}>
        <HighlightedComment
          text={text}
          keywords={keywords}
        />
      </ThemeProvider>
    );
  };

  describe('Basic rendering', () => {
    it('should render text correctly without keywords', () => {
      const testText = "This is a sample comment for testing.";
      mountBasic(testText);

      cy.contains(testText).should('be.visible');
    });

    it('should render empty state gracefully', () => {
      mountBasic("");
      cy.contains("No comment text available").should('be.visible');
    });

    it('should render null text gracefully', () => {
      mountBasic(null);
      cy.contains("No comment text available").should('be.visible');
    });
  });

  describe('Highlighting functionality', () => {
    it('should highlight a single keyword', () => {
      const text = "This is a test comment with important information.";
      const keywords = ["important"];
      
      mountWithKeywords(text, keywords);
      
      // Check that the text is visible
      cy.contains(text).should('be.visible');
      
      // Check that the keyword is highlighted
      cy.contains('span', 'important').should('have.css', 'background-color')
        .and('not.equal', 'rgba(0, 0, 0, 0)');
    });

    it('should highlight multiple keywords', () => {
      const text = "This test comment contains multiple keywords to highlight.";
      const keywords = ["test", "multiple", "highlight"];
      
      mountWithKeywords(text, keywords);
      
      // Check that each keyword is highlighted
      keywords.forEach(keyword => {
        cy.contains('span', keyword).should('have.css', 'background-color')
          .and('not.equal', 'rgba(0, 0, 0, 0)');
      });
    });

    it('should handle case-insensitive matches', () => {
      const text = "This comment has case-INSENSITIVE matching for Keywords.";
      const keywords = ["case-insensitive", "keywords"];
      
      mountWithKeywords(text, keywords);
      
      // Check that both keywords are highlighted despite case differences
      cy.contains('span', 'case-INSENSITIVE').should('have.css', 'background-color')
        .and('not.equal', 'rgba(0, 0, 0, 0)');
        
      cy.contains('span', 'Keywords').should('have.css', 'background-color')
        .and('not.equal', 'rgba(0, 0, 0, 0)');
    });
  });

  describe('Edge cases', () => {
    it('should handle keywords that are substrings of other words', () => {
      const text = "The text contains words where one is a substring of another like test and testing.";
      const keywords = ["test"];
      
      mountWithKeywords(text, keywords);
      
      // Only exact matches should be highlighted
      cy.contains('span', 'test').should('have.css', 'background-color')
        .and('not.equal', 'rgba(0, 0, 0, 0)');
    });

    it('should handle keywords with special regex characters', () => {
      const text = "This comment has (special) characters like [brackets] and other +*? symbols.";
      const keywords = ["(special)", "[brackets]", "+*?"];
      
      mountWithKeywords(text, keywords);
      
      // Special characters should be escaped correctly in the regex
      keywords.forEach(keyword => {
        cy.contains('span', keyword).should('have.css', 'background-color')
          .and('not.equal', 'rgba(0, 0, 0, 0)');
      });
    });

    it('should gracefully handle empty keywords array', () => {
      const text = "This text has no keywords to highlight.";
      
      mountWithKeywords(text, []);
      
      // The text should be displayed normally without highlights
      cy.contains(text).should('be.visible');
      
      // No highlighted spans should be present
      cy.get('span[style*="background-color"]').should('not.exist');
    });

    it('should style highlighted text properly', () => {
      const text = "This text has a styled highlight.";
      const keywords = ["styled highlight"];
      
      mountWithKeywords(text, keywords);
      
      // Check that the highlight has appropriate styling
      cy.contains('span', 'styled highlight')
        .should('have.css', 'background-color')
        .and('not.equal', 'rgba(0, 0, 0, 0)');
        
      // Should have higher font weight
      cy.contains('span', 'styled highlight')
        .should('have.css', 'font-weight')
        .and('not.equal', '400');
    });
  });

  describe('Performance considerations', () => {
    it('should handle long texts with many keywords efficiently', () => {
      // Create a longer text
      const longText = Array(20).fill("This is a paragraph with some keywords to highlight. ")
        .join(" ");
        
      // Create multiple keywords
      const manyKeywords = ["paragraph", "keywords", "highlight", "This", "some"];
      
      mountWithKeywords(longText, manyKeywords);
      
      // Check that the component renders without errors
      cy.contains("This is a paragraph").should('be.visible');
      
      // Check that keywords are highlighted
      manyKeywords.forEach(keyword => {
        // Just check the first instance of each keyword
        cy.contains('span', keyword).should('have.css', 'background-color')
          .and('not.equal', 'rgba(0, 0, 0, 0)');
      });
    });
  });
});