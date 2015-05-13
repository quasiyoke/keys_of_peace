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
      'underscore',
      'pws/Error',
      'jdataview',
      'pws/StoreSerializer',
      'pws/VersionError'
    ], function(
      Underscore,
      _Error,
      _jDataView,
      _StoreSerializer,
      _VersionError
    ) {
      _ = Underscore;
      Error = _Error;
      jDataView = _jDataView;
      StoreSerializer = _StoreSerializer;
      VersionError = _VersionError;
      done();
    });
  });

  describe('._parsePasswordPolicy()', function() {
    describe('parsing named policies', function() {
      it('should work', function() {
        var data = new jDataView('06G0ogle08000280010010010011c+-=_@#$%^&;:,.<>/~\\[](){}?!|', 0, undefined, true);
        var policy = {
          name: 'G0ogle',
          length: 40,
          useLowercase: false,
          lowercaseCountMin: 1,
          useUppercase: false,
          uppercaseCountMin: 1,
          useDigits: false,
          digitsCountMin: 1,
          useHexDigits: true,
          useSymbols: false,
          symbolsCountMin: 1,
          useEasyVision: false,
          makePronounceable: false,
          specialSymbols: '+-=_@#$%^&;:,.<>/~\\[](){}?!|'
        };
        assert.deepEqual(policy, StoreSerializer._parsePasswordPolicy(data, true));
      });

      it('should work with unicode special symbols', function() {
        var data = new jDataView(base64.decode('MDNJQ1FiMjAwMDA2MDAxMDAxMDAxMDAxMDjigKIj0KvRiQ=='), 0, undefined, true);
        var policy = {
          name: 'ICQ',
          length: 6,
          useLowercase: true,
          lowercaseCountMin: 1,
          useUppercase: false,
          uppercaseCountMin: 1,
          useDigits: true,
          digitsCountMin: 1,
          useHexDigits: false,
          useSymbols: true,
          symbolsCountMin: 1,
          useEasyVision: false,
          makePronounceable: true,
          specialSymbols: '•#Ыщ'
        };
        assert.deepEqual(policy, StoreSerializer._parsePasswordPolicy(data, true));
      });

      it('should work with unicode names', function() {
        var data = new jDataView(base64.decode('MTPQnNC+0Lgg0L/QsNGA0L7Qu9C4NjYwMDAxZjAwMjAwMzAwNDAwNTAw'), 0, undefined, true);
        var policy = {
          name: 'Мои пароли',
          length: 31,
          useLowercase: false,
          lowercaseCountMin: 2,
          useUppercase: true,
          uppercaseCountMin: 3,
          useDigits: true,
          digitsCountMin: 4,
          useHexDigits: false,
          useSymbols: false,
          symbolsCountMin: 5,
          useEasyVision: true,
          makePronounceable: true,
          specialSymbols: ''
        };
        assert.deepEqual(policy, StoreSerializer._parsePasswordPolicy(data, true));
      });
    });

    describe('wrong name length', function() {
      it('should throw pws/Error', function() {
        var data = new jDataView('07G0ogle08000280010010010011c+-=_@#$%^&;:,.<>/~\\[](){}?!|', 0, undefined, true);
        assert.throws(function() {
          StoreSerializer._parsePasswordPolicy(data, true);
        }, Error);
      });
    });

    describe('wrong special symbols length', function() {
      it('should throw pws/Error', function() {
        var data = new jDataView('06G0ogle08000280010010010011d+-=_@#$%^&;:,.<>/~\\[](){}?!|', 0, undefined, true);
        assert.throws(function() {
          StoreSerializer._parsePasswordPolicy(data, true);
        }, Error);
      });
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
      it('should work with unicode chars', function() {
        var store = {};
        var storeSerializer = new StoreSerializer(store, {});
        var field = {
          code: 0x06,
          data: new jDataView(base64.decode('0J3QtdC60LDRjyDQv9GA0L7Qs9GA0LDQvNC80LAgLyBTb21lIHByb2dyYW0gdi4gMQ=='), 0, undefined, true)
        };
        assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
        assert.equal('Некая программа / Some program v. 1', store.whatPerformedLastSave);
      });
    });
  });

  describe('header\'s last saved by user field', function() {
    describe('parsing', function() {
      it('should work with unicode chars', function() {
        var store = {};
        var storeSerializer = new StoreSerializer(store, {});
        var field = {
          code: 0x07,
          data: new jDataView(base64.decode('0JDQvdC+0L3QuNC8IC8gQW5vbnltb3Vz'), 0, undefined, true)
        };
        assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
        assert.equal('Аноним / Anonymous', store.lastSavedByUser);
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

  describe('header\'s named password policies field', function() {
    describe('parsing', function() {
      var POLICIES_SERIALIZED = '03Here goes serialized policies.';
      var POLICIES_SERIALIZED_MATCH = sinon.match(function(data) {
        assert.equal(2, data.tell());
        assert.equal(POLICIES_SERIALIZED, data.getString(undefined, 0));
        data.seek(2);
      });
      var sandbox;

      beforeEach(function() {
        sandbox = sinon.sandbox.create();
        sandbox.stub(StoreSerializer, '_parsePasswordPolicy');
      });

      afterEach(function() {
        sandbox.restore();
      });

      it('calls ._parsePasswordPolicy()', function() {
        var store = {};
        var storeSerializer = new StoreSerializer(store, {});
        var field = {
          code: 0x10,
          data: new jDataView(POLICIES_SERIALIZED, 0, undefined, true)
        };
        StoreSerializer._parsePasswordPolicy
          .onFirstCall().returns('1')
          .onSecondCall().returns('2')
          .onThirdCall().returns('3')
        ;
        assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
        sinon.assert.calledThrice(StoreSerializer._parsePasswordPolicy);
        StoreSerializer._parsePasswordPolicy.firstCall.calledWith(POLICIES_SERIALIZED_MATCH, true);
        StoreSerializer._parsePasswordPolicy.secondCall.calledWith(POLICIES_SERIALIZED_MATCH, true);
        StoreSerializer._parsePasswordPolicy.thirdCall.calledWith(POLICIES_SERIALIZED_MATCH, true);
        assert.deepEqual({
          namedPasswordPolicies: ['1', '2', '3']
        }, store);
      });

      describe('when some password policies are wrong', function() {
        it('tries to store others', function() {
          var store = {};
          var storeSerializer = new StoreSerializer(store, {});
          var field = {
            code: 0x10,
            data: new jDataView(POLICIES_SERIALIZED, 0, undefined, true)
          };
          StoreSerializer._parsePasswordPolicy
            .onFirstCall().returns('1')
            .onSecondCall().throws(new Error)
            .onThirdCall().returns('3')
          ;
          assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
          sinon.assert.calledThrice(StoreSerializer._parsePasswordPolicy);
          StoreSerializer._parsePasswordPolicy.firstCall.calledWith(POLICIES_SERIALIZED_MATCH, true);
          StoreSerializer._parsePasswordPolicy.secondCall.calledWith(POLICIES_SERIALIZED_MATCH, true);
          StoreSerializer._parsePasswordPolicy.thirdCall.calledWith(POLICIES_SERIALIZED_MATCH, true);
          assert.deepEqual({
            namedPasswordPolicies: ['1', '3']
          }, store);
        });
      });

      describe('when YUBI_SK is presented instead of password policies', function() {
        it('stores YUBI_SK', function() {
          var YUBI_SK_BASE64 = 'NfBeKz0Xg0b96UvtDKVcqSRpC9U=';
          var store = {};
          var storeSerializer = new StoreSerializer(store, {});
          var field = {
            code: 0x10,
            data: new jDataView(base64.decode(YUBI_SK_BASE64), 0, undefined, true)
          };
          assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
          sinon.assert.notCalled(StoreSerializer._parsePasswordPolicy);
          assert.equal(YUBI_SK_BASE64, base64.encode(store.yubiSk.buffer));
        });
      });
    });
  });

});
