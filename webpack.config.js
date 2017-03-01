const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
var webpack = require('webpack');

var FlowBabelWebpackPlugin = require('flow-babel-webpack-plugin');

module.exports = {
  entry:  ['./app/javascripts/app.js'],
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
    fs: "empty"
  //  module: "empty"
   },
  plugins: [
    new webpack.ProvidePlugin({
  $: 'jquery',
  jQuery: 'jquery'
})
,
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
     },
    { test: /\.jpe?g$|\.gif$|\.png$|\.svg$|\.woff$|\.woff2$|\.ttf$|\.eot$|\.wav$|\.mp3$/,
      use: ['file-loader']
      }
  ],
    loaders: [
      { test: /\.json$/, use: 'json-loader' },
       { test: require.resolve("jquery"), loader: "expose?$!expose?jQuery" },
      {
        test: /\.woff2?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        // Limiting the size of the woff fonts breaks font-awesome ONLY for the extract text plugin
        // loader: "url?limit=10000"
        loader: "url"
      },
      { test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "url-loader?limit=10000&mimetype=application/font-woff" },
    { test: /\.(ttf|eot|svg|png|jpg|jpeg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "file-loader" },
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
