require('../../config.js');
var _;
var assert = require('assert');
var base64 = require('base64-arraybuffer');
var jDataView;
var requirejs = require('requirejs');
var StoreSerializer;
var VersionError;

describe('pws/StoreSerializer', function() {
  before(function(done) {
    requirejs([
      'jdataview',
      'underscore',
      'pws/StoreSerializer',
      'pws/VersionError'
    ], function(
      _jDataView,
      Underscore,
      _StoreSerializer,
      _VersionError
    ) {
      jDataView = _jDataView;
      _ = Underscore;
      StoreSerializer = _StoreSerializer;
      VersionError = _VersionError;
      done();
    });
  });

  describe('version field', function() {
    describe('parsing', function() {
      it('should work', function() {
        var store = {};
        var storeSerializer = new StoreSerializer(store, {});
        var field = {
          code: 0,
          data: new jDataView(base64.decode("DQM="))
        };
        assert(undefined === storeSerializer._parseHeaderField(field));
        assert.equal(0x03, store.version.major);
        assert.equal(0x0d, store.version.minor);
      });

      describe('another major version', function() {
        it('should throw VersionError', function() {
          var store = {};
          var storeSerializer = new StoreSerializer(store, {});
          var field = {
            code: 0,
            data: new jDataView(base64.decode("DQQ=")) // v. 4.10
          };
          assert.throws(
            function() {
              storeSerializer._parseHeaderField(field)
            },
            VersionError
          );
        });
      });

      describe('wrong length', function() {
        it('should throw VersionError', function() {
          var store = {};
          var storeSerializer = new StoreSerializer(store, {});
          var field = {
            code: 0,
            data: new jDataView('123')
          };
          assert.throws(
            function() {
              storeSerializer._parseHeaderField(field)
            },
            VersionError
          );
        });
      });
    });
  });
});
