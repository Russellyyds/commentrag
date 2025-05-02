const { defineConfig } = require('cypress');

module.exports = defineConfig({
  // Common configuration options
  viewportWidth: 1280,
  viewportHeight: 720,
  video: false,
  screenshotOnRunFailure: true,

  reporter: 'cypress-mochawesome-reporter',
  
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx,cy.js,spec.js}',
    setupNodeEvents(on, config) {
      // E2E testing node events setup
      require('@cypress/code-coverage/task')(on, config)
      return config
    },
  },
  
  component: {
    indexHtmlFile: 'cypress/support/component-index.html',
    devServer: {
      framework: 'react',
      bundler: 'webpack',
      // Simplified webpack config - just enough to work with React + MUI
      webpackConfig: {
        mode: 'development',
        module: {
          rules: [
            {
              test: /\.(js|jsx|ts|tsx)$/,
              exclude: /node_modules/,
              use: {
                loader: 'babel-loader',
                options: {
                  presets: ['@babel/preset-env', '@babel/preset-react']
                }
              }
            },
            {
              test: /\.css$/,
              use: ['style-loader', 'css-loader']
            },
            {
              // Handle static assets
              test: /\.(png|svg|jpg|jpeg|gif)$/i,
              type: 'asset/resource'
            },
            {
              // Handle fonts
              test: /\.(woff|woff2|eot|ttf|otf)$/i,
              type: 'asset/resource'
            }
          ]
        },
        resolve: {
          extensions: ['.js', '.jsx', '.ts', '.tsx']
        }
      }
    },
    setupNodeEvents(on, config) {
      // Component testing node events setup
      require('@cypress/code-coverage/task')(on, config)
      return config
    },
  },
});