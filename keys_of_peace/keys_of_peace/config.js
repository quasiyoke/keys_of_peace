var requirejs = require('requirejs');
requirejs.config({
  baseUrl: 'static/js',
  nodeRequire: require,
  paths: {
    backbone: '../../bower_components/backbone/backbone',
    jdataview: '../../bower_components/jdataview/dist/browser/jdataview',
    jquery: '../../bower_components/jquery/dist/jquery',
    'crypto-js/twofish': 'twofish',
    underscore: '../../bower_components/underscore/underscore'
  },
  packages: [
    {
      name: 'crypto-js',
      location: '../../bower_components/crypto-js',
      main: 'index'
    }
  ]
});
