require('../../config.js');
var _;
var assert = require('assert');
var base64 = require('base64-arraybuffer');
var Error;
var jDataView;
var requirejs = require('requirejs');
var StoreSerializer;
var VersionError;

describe('pws/StoreSerializer', function() {
  before(function(done) {
    requirejs([
      'pws/Error',
      'jdataview',
      'underscore',
      'pws/StoreSerializer',
      'pws/VersionError'
    ], function(
      _Error,
      _jDataView,
      Underscore,
      _StoreSerializer,
      _VersionError
    ) {
      Error = _Error;
      jDataView = _jDataView;
      _ = Underscore;
      StoreSerializer = _StoreSerializer;
      VersionError = _VersionError;
      done();
    });
  });

  describe('header\'s version field', function() {
    describe('parsing', function() {
      it('should work', function() {
        var store = {};
        var storeSerializer = new StoreSerializer(store, {});
        var field = {
          code: 0x00,
          data: new jDataView(base64.decode("DQM="))
        };
        assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
        assert.equal(0x03, store.version.major);
        assert.equal(0x0d, store.version.minor);
      });

      describe('another major version', function() {
        it('should throw VersionError', function() {
          var store = {};
          var storeSerializer = new StoreSerializer(store, {});
          var field = {
            code: 0x00,
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
            code: 0x00,
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

  describe('header\'s UUID field', function() {
    describe('parsing', function() {
      it('should work', function() {
        var store = {};
        var storeSerializer = new StoreSerializer(store, {});
        var field = {
          code: 0x01,
          data: new jDataView(base64.decode("OshS0gzEReaTfl21RbfscA=="))
        };
        assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
        assert.equal('3ac852d20cc445e6937e5db545b7ec70', store.uuid);
      });

      describe('wrong length', function() {
        it('should throw pws/Error', function() {
          var store = {};
          var storeSerializer = new StoreSerializer(store, {});
          var field = {
            code: 0x01,
            data: new jDataView(base64.decode("OshS0gzEReaTfl21RbfscCE=")) // 17 bytes
          };
          assert.throws(
            function() {
              storeSerializer._parseHeaderField(field)
            },
            Error
          );
        });
      });
    });
  });

  describe('header\'s preferences field', function() {
    describe('parsing', function() {
      it('should work', function() {
        var PREFERENCES = 'B 1 1 B 2 1 B 31 1 I 11 2 ';
        var store = {};
        var storeSerializer = new StoreSerializer(store, {});
        var field = {
          code: 0x02,
          data: new jDataView(PREFERENCES)
        };
        assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
        assert.equal(PREFERENCES, store.preferences);
      });
    });
  });

});
