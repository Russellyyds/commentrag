// start-instrumented.js
process.env.NODE_ENV = 'development';
require('@cypress/instrument-cra');
require('react-scripts/scripts/start');