describe('State Persistence Tests', () => {
    beforeEach(() => {
        // 在每个测试前访问主页
        cy.visit('/');
    });
    it('should persist manual review state across page refreshes', () => {
      // First, navigate through the happy path to get data and a comment to review
      cy.visit('/');
      cy.contains('button', 'Get Started').click();
      cy.url().should('include', '/data-import');
      
      // Upload and process a file
      cy.fixture('sample.csv', 'base64').then(fileContent => {
        const blob = Cypress.Blob.base64StringToBlob(fileContent, 'text/csv');
        const testFile = new File([blob], 'sample.csv', { type: 'text/csv' });
        const fileList = [testFile];
        
        cy.get('[data-cy="upload-dropzone"]').trigger('drop', { 
          dataTransfer: { files: fileList, types: ['Files'] }
        });
      });
      cy.wait(1000);
      cy.contains('button', 'Process Files').click();
      cy.scrollTo('top');
      cy.contains('Import Complete!', { timeout: 60000 }).should('be.visible');
      
      // Navigate to manual review
      cy.contains('button', 'Manual Review').click();
      cy.url().should('include', '/manual-review');
      
      // Get the current comment ID from URL
      cy.url().then(url => {
        const match = url.match(/id=(\d+)/);
        if (match && match[1]) {
          const commentId = match[1];
          cy.wrap(commentId).as('currentCommentId');
        }
      });
      
      // Refresh the page
      cy.reload();
      
      // Verify we're still on the same comment
      cy.get('@currentCommentId').then(commentId => {
        cy.url().should('include', `id=${commentId}`);
        cy.contains('Comment ID:').should('be.visible');
      });
    });

    it('should persist auto review stats section expanded/collapsed state', () => {
        // 导航到数据导入页面
        cy.visit('/');
        cy.contains('button', 'Get Started').click();
        cy.url().should('include', '/data-import');
        
        // 上传并处理文件
        cy.fixture('sample.csv', 'base64').then(fileContent => {
          const blob = Cypress.Blob.base64StringToBlob(fileContent, 'text/csv');
          const testFile = new File([blob], 'sample.csv', { type: 'text/csv' });
          const fileList = [testFile];
          
          cy.get('div').contains('Drop your files here').parent()
            .trigger('drop', { 
              dataTransfer: { files: fileList, types: ['Files'] }
            });
        });
        cy.wait(1000);
        cy.contains('button', 'Process Files').click();
        cy.scrollTo('top');
        cy.contains('Import Complete!', { timeout: 60000 }).should('be.visible');
        
        // 导航到自动审核页面
        cy.contains('button', 'Auto Review').click();
        cy.url().should('include', '/auto-review');
        cy.wait(1000); // 等待页面完全加载
        
        // 检查 CommentsStats 组件是否显示
        cy.contains('Global Comment Distribution').should('be.visible');
        
        // 查找折叠/展开按钮
        cy.get('button')
          .find('svg[data-testid="KeyboardArrowUpIcon"]')
          .closest('button')
          .as('toggleButton');
        
        // 初始状态应该是展开的 (检查内容是否可见)
        cy.contains('comment').should('be.visible');
        
        // 点击折叠按钮
        cy.get('@toggleButton').click();
        cy.wait(500);
        
        // 确认内容已被折叠 (内容应该不可见)
        cy.get('body').then($body => {
          // 根据UI的实现方式，折叠的内容可能完全不可见或者隐藏在折叠区域
          // 如果内容是完全隐藏的:
          const commentTextVisible = $body.find('.MuiCollapse-entered').length > 0;
          if (!commentTextVisible) {
            cy.log('Confirmed content is collapsed');
          } else {
            // 如果折叠区域仍然存在但内容不可见:
            cy.get('.MuiCollapse-hidden').should('exist');
          }
        });
        
        // 刷新页面
        cy.reload();
        cy.wait(2000); // 等待页面重新加载
        
        // 验证折叠状态被保持 (内容应该仍然是折叠的)
        cy.get('body').then($body => {
          // 如果初始加载后内容是折叠的:
          if ($body.find('.MuiCollapse-hidden').length > 0 || 
              $body.find('.MuiCollapse-entered').length === 0) {
            cy.log('Collapse state was successfully maintained after refresh');
          } else {
            // 如果内容重新展开，测试失败
            cy.get('.MuiCollapse-hidden').should('exist');
          }
        });
        
        // 重新展开并再次检查状态保持
        cy.get('button')
          .find('svg[data-testid="KeyboardArrowUpIcon"]')
          .closest('button')
          .click();
        cy.wait(500);
        
        // 确认内容再次可见
        cy.contains('comment').should('be.visible');
        
        // 再次刷新
        cy.reload();
        cy.wait(2000);
        
        // 验证展开状态被保持
        cy.contains('comment').should('be.visible');
      });
  });