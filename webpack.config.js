const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
var webpack = require('webpack');

var FlowBabelWebpackPlugin = require('flow-babel-webpack-plugin');

module.exports = {
  entry:  ['jquery','./app/javascripts/app.js'],
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'app.js'
  },
  resolve: {
      alias: {
        'semantic-ui': path.join(__dirname, "node_modules", "semantic-ui-css", "semantic.js"),
      },
    //  extensions: ['', '.js', '.jsx'],
    },
    node: {
    fs: "empty",
    module: "empty"
   },
  plugins: [
    new webpack.ProvidePlugin({
   $: "jquery",
   jQuery: "jquery"
 }),
    // Copy our app's index.html to the build folder.
    new CopyWebpackPlugin([
      { from: './app/index.html', to: "index.html" }
    ])
  ],
  module: {
    rules: [
      {
       test: /\.css$/,
       use: [ 'style-loader', 'css-loader' ]
      }
    ],
    loaders: [
      { test: /\.json$/, use: 'json-loader' },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015'],
          plugins: [new FlowBabelWebpackPlugin(),'transform-runtime']
        }
      }
    ]
  }
}
