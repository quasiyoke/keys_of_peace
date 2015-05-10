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

  describe('header\'s who performed last save field', function() {
    describe('parsing', function() {
      it('should be ignored', function() {
        var store = {};
        var storeSerializer = new StoreSerializer(store, {});
        var field = {
          code: 0x05,
          data: new jDataView(base64.decode("b6vNVA=="), 0, undefined, true)
        };
        assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
        assert.deepEqual({}, store);
      });
    });
  });

  describe('header\'s what performed last save field', function() {
    describe('parsing', function() {
      it('should work', function() {
        var WHAT_PERFORMED_LAST_SAVE = 'pwsafe V0.94';
        var store = {};
        var storeSerializer = new StoreSerializer(store, {});
        var field = {
          code: 0x06,
          data: new jDataView(WHAT_PERFORMED_LAST_SAVE, 0, undefined, true)
        };
        assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
        assert.equal(WHAT_PERFORMED_LAST_SAVE, store.whatPerformedLastSave);
      });
    });
  });

  describe('header\'s last saved by user field', function() {
    describe('parsing', function() {
      it('should work', function() {
        var LAST_SAVED_BY_USER = 'John Doe';
        var store = {};
        var storeSerializer = new StoreSerializer(store, {});
        var field = {
          code: 0x07,
          data: new jDataView(LAST_SAVED_BY_USER, 0, undefined, true)
        };
        assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
        assert.equal(LAST_SAVED_BY_USER, store.lastSavedByUser);
      });
    });
  });

  describe('header\'s last saved on host field', function() {
    describe('parsing', function() {
      it('should work', function() {
        var LAST_SAVED_ON_HOST = 'John Doe\'s laptop';
        var store = {};
        var storeSerializer = new StoreSerializer(store, {});
        var field = {
          code: 0x08,
          data: new jDataView(LAST_SAVED_ON_HOST, 0, undefined, true)
        };
        assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
        assert.equal(LAST_SAVED_ON_HOST, store.lastSavedOnHost);
      });
    });
  });

  describe('header\'s database name field', function() {
    describe('parsing', function() {
      it('should work', function() {
        var DATABASE_NAME = 'John Doe\'s database';
        var store = {};
        var storeSerializer = new StoreSerializer(store, {});
        var field = {
          code: 0x09,
          data: new jDataView(DATABASE_NAME, 0, undefined, true)
        };
        assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
        assert.equal(DATABASE_NAME, store.databaseName);
      });
    });
  });

  describe('header\'s database description field', function() {
    describe('parsing', function() {
      it('should work', function() {
        var DATABASE_DESCRIPTION = 'John Doe\'s favorite database';
        var store = {};
        var storeSerializer = new StoreSerializer(store, {});
        var field = {
          code: 0x0a,
          data: new jDataView(DATABASE_DESCRIPTION, 0, undefined, true)
        };
        assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
        assert.equal(DATABASE_DESCRIPTION, store.databaseDescription);
      });
    });
  });

  describe('header\'s recently used entries field', function() {
    describe('parsing', function() {
      it('should work', function() {
        var store = {};
        var storeSerializer = new StoreSerializer(store, {});
        var field = {
          code: 0x0f,
          data: new jDataView('02086f1a06ebe7409ba91ec706d8617bd39d7dc37a63ae45dd9b689d564e2cda02', 0, undefined, true)
        };
        assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
        assert.deepEqual(['086f1a06ebe7409ba91ec706d8617bd3', '9d7dc37a63ae45dd9b689d564e2cda02'], store.recentlyUsedEntries);
      });

      describe('length doesn\'t match', function() {
        it('should be ignored', function() {
          var store = {};
          var storeSerializer = new StoreSerializer(store, {});
          var field = {
            code: 0x0f,
            data: new jDataView('05407efc5ba04c2a3adf4381feb0edc48def6ff192c2721f5a0b5fc28e7088be', 0, undefined, true)
          };
          assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
          assert.deepEqual({}, store);
        });
      });

      describe('incorrect length specified', function() {
        it('should be ignored', function() {
          var store = {};
          var storeSerializer = new StoreSerializer(store, {});
          var field = {
            code: 0x0f,
            data: new jDataView('ww407efc5ba04c2a3adf4381feb0edc48def6ff192c2721f5a0b5fc28e7088be', 0, undefined, true)
          };
          assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
          assert.deepEqual({}, store);
        });
      });

      describe('incorrect UUID', function() {
        it('should be ignored', function() {
          var store = {};
          var storeSerializer = new StoreSerializer(store, {});
          var field = {
            code: 0x0f,
            data: new jDataView('02086f1a06ebe7409ba91ec706d8617bd3!!!!c37a63ae45dd9b689d564e2cda02', 0, undefined, true)
          };
          assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
          assert.deepEqual(['086f1a06ebe7409ba91ec706d8617bd3'], store.recentlyUsedEntries);
        });
      });
    });
  });

});
