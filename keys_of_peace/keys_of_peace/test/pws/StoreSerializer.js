require('../../config.js');
var _;
var assert = require('assert');
var base64 = require('base64-arraybuffer');
var Error;
var jDataView;
var requirejs = require('requirejs');
var sinon = require('sinon');
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

  describe('._parseTime()', function() {
    it('should work', function() {
      var data = new jDataView(base64.decode("b6vNVA=="), 0, undefined, true);
      assert.equal(1422764911000, StoreSerializer._parseTime(data).getTime());
    });

    describe('wrong length', function() {
      it('should throw pws/Error', function() {
        var data = new jDataView('12345', 0, undefined, true);
        assert.throws(
          function() {
            StoreSerializer._parseTime(data);
          },
          Error
        );
      });
    });

    describe('PasswordSafe prior v. 3.09 format', function() {
      it('should be parsed', function() {
        var data = new jDataView('6fabcd54', 0, undefined, true);
        assert.equal(1422764911000, StoreSerializer._parseTime(data).getTime());
      });
    });
  });

  describe('header\'s version field', function() {
    describe('parsing', function() {
      it('should work', function() {
        var store = {};
        var storeSerializer = new StoreSerializer(store, {});
        var field = {
          code: 0x00,
          data: new jDataView(base64.decode("DQM="), 0, undefined, true)
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
            data: new jDataView(base64.decode("DQQ="), 0, undefined, true) // v. 4.10
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
            data: new jDataView('123', 0, undefined, true)
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
          data: new jDataView(base64.decode("OshS0gzEReaTfl21RbfscA=="), 0, undefined, true)
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
            data: new jDataView(base64.decode("OshS0gzEReaTfl21RbfscCE="), 0, undefined, true) // 17 bytes
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
          data: new jDataView(PREFERENCES, 0, undefined, true)
        };
        assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
        assert.equal(PREFERENCES, store.preferences);
      });
    });
  });

  describe('header\'s tree display status field', function() {
    describe('parsing', function() {
      it('should work', function() {
        var store = {};
        var storeSerializer = new StoreSerializer(store, {});
        var field = {
          code: 0x03,
          data: new jDataView('10101100', 0, undefined, true)
        };
        assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
        assert.deepEqual([true, false, true, false, true, true, false, false], store.treeDisplayStatus);
      });
    });
  });

  describe('header\'s last save field', function() {
    describe('parsing', function() {
      it('calls ._parseTime()', function() {
        var LAST_SAVE_BASE64 = "b6vNVA==";
        var store = {};
        var storeSerializer = new StoreSerializer(store, {});
        var spy = sinon.spy(StoreSerializer, '_parseTime');
        var field = {
          code: 0x04,
          data: new jDataView(base64.decode(LAST_SAVE_BASE64), 0, undefined, true)
        };
        assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
        assert(spy.calledOnce);
        assert.equal(spy.firstCall.returnValue.getTime(), store.lastSave.getTime());
        assert.equal(LAST_SAVE_BASE64, base64.encode(spy.firstCall.args[0].buffer));
      });
    });
  });

});
