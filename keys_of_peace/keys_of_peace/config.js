var requirejs = require('requirejs');
requirejs.config({
  baseUrl: 'static/js',
  nodeRequire: require,
  paths: {
    backbone: '../../bower_components/backbone/backbone',
    jquery: '../../bower_components/jquery/dist/jquery',
    underscore: '../../bower_components/underscore/underscore'
  },
  packages: [
    {
      name: 'crypto-js',
      location: '../../bower_components/crypto-js',
      main: 'index'
    }
  ],
  shim: {}
});
