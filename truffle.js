var DefaultBuilder = require("truffle-default-builder");


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
   // Webpack builder
  networks: {
     development: {
       host: "localhost",
       port: 8545,
       network_id: "*"
     }
   }
};
