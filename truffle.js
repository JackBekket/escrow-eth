var DefaultBuilder = require("truffle-default-builder");

// Allows us to use ES6 in our migrations and tests.
require('babel-register')

module.exports = {
  /**
  DefaultBuilder
  build: new DefaultBuilder({
     "index.html": "index.html",
     "app.js": [
       "javascripts/app.js"
     ],
     "app.css": [
       "stylesheets/app.css"
     ],
     "images/": "images/"
   }),
   **/
   // Webpack builder configuration is in webpack.config.js
  networks: {
     development: {
       host: "localhost",
       port: 8545,
       network_id: "*"
     }
   }
};
