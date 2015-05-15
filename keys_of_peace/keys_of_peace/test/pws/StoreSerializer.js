var _ = require('underscore');
var assert = require('assert');
var base64 = require('base64-arraybuffer');
var Error = require('../../static/js/pws/Error').Error;
var jDataView = require('jdataview');
var Record = require('../../static/js/pws/Record').Record;
var sinon = require('sinon');
var StoreSerializer = require('../../static/js/pws/StoreSerializer').StoreSerializer;
var VersionError = require('../../static/js/pws/Error').VersionError;

describe('pws/StoreSerializer', function() {
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

		describe('parsing unnamed policies', function() {
			it('should work', function() {
				var data = new jDataView('0800028001001001001', 0, undefined, true);
				var policy = {
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
					makePronounceable: false
				};
				assert.deepEqual(policy, StoreSerializer._parsePasswordPolicy(data));
			});

			describe('too long', function() {
				it('should throw pws/Error', function() {
					var data = new jDataView('08000280010010010011', 0, undefined, true);
					assert.throws(function() {
						StoreSerializer._parsePasswordPolicy(data);
					}, Error);
				});
			});

			describe('too short', function() {
				it('should throw pws/Error', function() {
					var data = new jDataView('080002800100100100', 0, undefined, true);
					assert.throws(function() {
						StoreSerializer._parsePasswordPolicy(data);
					}, Error);
				});
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
				assert.throws(function() {
					StoreSerializer._parseTime(data);
				}, Error);
			});
		});

		describe('PasswordSafe prior v. 3.09 format', function() {
			it('should be parsed', function() {
				var data = new jDataView('6fabcd54', 0, undefined, true);
				assert.equal(1422764911000, StoreSerializer._parseTime(data).getTime());
			});
		});
	});

	describe('._parseUuid()', function() {
		it('should work', function() {
			var data = new jDataView(base64.decode("OshS0gzEReaTfl21RbfscA=="), 0, undefined, true);
			assert.equal('3ac852d20cc445e6937e5db545b7ec70', StoreSerializer._parseUuid(data));
		});

		describe('wrong length', function() {
			it('should throw pws/Error', function() {
				var data = new jDataView(base64.decode("OshS0gzEReaTfl21RbfscCE="), 0, undefined, true); // 17 bytes
				assert.throws(function() {
					StoreSerializer._parseUuid(data)
				}, Error);
			});
		});
	});

	describe('._parseHeader()', function() {
		it('should call ._parseHeaderField()', function() {
			var file = {
				fields: ['1', '2', '3', '4']
			};
			var storeSerializer = new StoreSerializer({}, file);
			var stub = sinon.stub(storeSerializer, '_parseHeaderField');
			stub
				.onFirstCall().returns(undefined)
				.onSecondCall().returns(undefined)
				.onThirdCall().returns(null)
			;
			storeSerializer._parseHeader();
			assert(stub.calledThrice);
			assert(stub.firstCall.calledWith('1'));
			assert(stub.secondCall.calledWith('2'));
			assert(stub.thirdCall.calledWith('3'));
			assert.equal(3, storeSerializer._headerFieldsEndIndex);
		});
	});

	describe('._parseHeaderField()', function() {
		describe('version', function() {
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
						assert.throws(function() {
							storeSerializer._parseHeaderField(field)
						}, VersionError);
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
						assert.throws(function() {
							storeSerializer._parseHeaderField(field)
						}, VersionError);
					});
				});
			});
		});

		describe('UUID', function() {
			describe('parsing', function() {
				it('calls StoreSerializer._parseUuid()', function() {
					var store = {};
					var storeSerializer = new StoreSerializer(store, {});
					var field = {
						code: 0x01,
						data: 'foo'
					};
					var parseUuid = sinon.stub(StoreSerializer, '_parseUuid');
					parseUuid.returns('bar');
					assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
					assert(parseUuid.calledOnce);
					assert(parseUuid.calledWith('foo'));
					assert.equal('bar', store.uuid);
					parseUuid.restore();
				});
			});
		});

		describe('preferences', function() {
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

		describe('tree display status', function() {
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

		describe('last save', function() {
			describe('parsing', function() {
				it('calls ._parseTime()', function() {
					var store = {};
					var storeSerializer = new StoreSerializer(store, {});
					var field = {
						code: 0x04,
						data: 'foo'
					};
					var parseTime = sinon.stub(StoreSerializer, '_parseTime');
					parseTime.returns('bar');
					assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
					assert(parseTime.calledOnce);
					assert.equal('bar', store.lastSave);
					assert(parseTime.firstCall.calledWith('foo'));
					parseTime.restore();
				});
			});
		});

		describe('who performed last save', function() {
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

		describe('what performed last save', function() {
			describe('parsing', function() {
				it('should work with unicode chars', function() {
					var store = {};
					var storeSerializer = new StoreSerializer(store, {});
					var field = {
						code: 0x06,
						data: new jDataView(base64.decode('0J3QtdC60LDRjyDQv9GA0L7Qs9GA0LDQvNC80LAgLyBTb21lIHByb2dyYW0gdi4gMy4wMg=='), 0, undefined, true)
					};
					assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
					assert.equal('Некая программа / Some program v. 3.02', store.whatPerformedLastSave);
				});
			});
		});

		describe('last saved by user', function() {
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

		describe('last saved on host', function() {
			describe('parsing', function() {
				it('should work with unicode chars', function() {
					var store = {};
					var storeSerializer = new StoreSerializer(store, {});
					var field = {
						code: 0x08,
						data: new jDataView(base64.decode('0JDQvdC+0L3QuNC80L3Ri9C5INGF0L7RgdGCIC8gQW5vbnltb3VzIGhvc3Q='), 0, undefined, true)
					};
					assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
					assert.equal('Анонимный хост / Anonymous host', store.lastSavedOnHost);
				});
			});
		});

		describe('database name', function() {
			describe('parsing', function() {
				it('should work with unicode chars', function() {
					var store = {};
					var storeSerializer = new StoreSerializer(store, {});
					var field = {
						code: 0x09,
						data: new jDataView(base64.decode('0JDQvdC+0L3QuNC80L3QsNGPINCR0JQgLyBBbm9ueW1vdXMgREI='), 0, undefined, true)
					};
					assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
					assert.equal('Анонимная БД / Anonymous DB', store.databaseName);
				});
			});
		});

		describe('database description', function() {
			describe('parsing', function() {
				it('should work with unicode chars', function() {
					var store = {};
					var storeSerializer = new StoreSerializer(store, {});
					var field = {
						code: 0x0a,
						data: new jDataView(base64.decode('0J7Qv9C40YHQsNC90LjQtSDQkdCUIC8gREIgZGVzY3JpcHRpb24='), 0, undefined, true)
					};
					assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
					assert.equal('Описание БД / DB description', store.databaseDescription);
				});
			});
		});

		describe('recently used entries', function() {
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

		describe('named password policies', function() {
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

		describe('empty groups', function() {
			describe('parsing', function() {
				it('adds group to existing array', function() {
					var store = {
						emptyGroups: ['Пустая группа 1 / Empty group 1']
					};
					var storeSerializer = new StoreSerializer(store, {});
					var field = {
						code: 0x11,
						data: new jDataView(base64.decode('0J/Rg9GB0YLQsNGPINCz0YDRg9C/0L/QsCAyIC8gRW1wdHkgZ3JvdXAgMg=='), 0, undefined, true)
					};
					assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
					assert.deepEqual({
						emptyGroups: ['Пустая группа 1 / Empty group 1', 'Пустая группа 2 / Empty group 2']
					}, store);
				});
			});
		});

		describe('YUBI_SK', function() {
			describe('parsing', function() {
				it('stores it', function() {
					var YUBI_SK_BASE64 = 'NfBeKz0Xg0b96UvtDKVcqSRpC9U=';
					var store = {};
					var storeSerializer = new StoreSerializer(store, {});
					var field = {
						code: 0x12,
						data: new jDataView(base64.decode(YUBI_SK_BASE64), 0, undefined, true)
					};
					assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
					assert.equal(YUBI_SK_BASE64, base64.encode(store.yubiSk.buffer));
				});
			});
		});

		describe('unknown field', function() {
			describe('parsing', function() {
				it('pushes it to unknown fields array', function() {
					var DATA_BASE64 = 'NfBeKz0Xg0b96UvtDKVcqSRpC9U=';
					var store = { unknownFields: [] };
					var storeSerializer = new StoreSerializer(store, {});
					var field = {
						code: 0xfe,
						data: new jDataView(base64.decode(DATA_BASE64), 0, undefined, true)
					};
					assert.strictEqual(undefined, storeSerializer._parseHeaderField(field));
					assert.equal(field.code, store.unknownFields[0].code);
					assert.equal(DATA_BASE64, base64.encode(store.unknownFields[0].data.buffer));
				});
			});
		});

		describe('end of entry', function() {
			describe('parsing', function() {
				it('returns null', function() {
					var store = {};
					var storeSerializer = new StoreSerializer(store, {});
					var field = {
						code: 0xff
					};
					assert.strictEqual(null, storeSerializer._parseHeaderField(field));
					assert.deepEqual({}, store);
				});
			});
		});
	});

	describe('._parseRecords()', function() {
		it('should call ._parseRecord()', function() {
			var file = {
				fields: ['zero', 'first', 'second', 'third', 'fourth']
			};
			var storeSerializer = new StoreSerializer({}, file);
			storeSerializer._headerFieldsEndIndex = 2;
			var parseRecord = sinon.stub(storeSerializer, '_parseRecord');
			parseRecord
				.onFirstCall().returns(2)
				.onSecondCall().returns(4)
			;
			storeSerializer._parseRecords();
			assert(parseRecord.calledTwice);
			assert(parseRecord.firstCall.calledWith(2));
			assert(parseRecord.secondCall.calledWith(3));
		});

		it('throws pws/Error if _headerFieldsEndIndex isn\'t specified', function() {
			var file = {
				fields: ['zero', 'first', 'second', 'third', 'fourth']
			};
			var storeSerializer = new StoreSerializer({}, file);
			var parseRecord = sinon.stub(storeSerializer, '_parseRecord');
			assert.throws(function() {
				storeSerializer._parseRecords();
			}, Error);
			assert(parseRecord.notCalled);
		});
	});

	describe('._parseRecord()', function() {
		it('should call ._parseRecordField()', function() {
			var file = {
				fields: ['zero', 'first', 'second', 'third', 'fourth']
			};
			var store = {
				records: []
			};
			var storeSerializer = new StoreSerializer(store, file);
			var parseRecordField = sinon.stub(storeSerializer, '_parseRecordField');
			parseRecordField
				.onThirdCall().returns(null)
			;
			assert.equal(3, storeSerializer._parseRecord(1));
			assert(parseRecordField.calledThrice);
			assert(parseRecordField.firstCall.calledWith('first', sinon.match.instanceOf(Record)));
			assert(parseRecordField.secondCall.calledWith('second', sinon.match.instanceOf(Record)));
			assert(parseRecordField.thirdCall.calledWith('third', sinon.match.instanceOf(Record)));
		});

		it('throws pws/Error if there\'s no signal about entry ending', function() {
			var file = {
				fields: ['zero', 'first', 'second', 'third', 'fourth']
			};
			var store = {
				records: []
			};
			var storeSerializer = new StoreSerializer(store, file);
			var parseRecordField = sinon.stub(storeSerializer, '_parseRecordField');
			assert.throws(function() {
				storeSerializer._parseRecord(2)
			}, Error);
			assert(parseRecordField.calledThrice);
			assert(parseRecordField.firstCall.calledWith('second', sinon.match.instanceOf(Record)));
			assert(parseRecordField.secondCall.calledWith('third', sinon.match.instanceOf(Record)));
			assert(parseRecordField.thirdCall.calledWith('fourth', sinon.match.instanceOf(Record)));
		});
	});

	describe('.parseRecordField()', function() {
		describe('UUID', function() {
			describe('parsing', function() {
				it('calls StoreSerializer._parseUuid()', function() {
					var storeSerializer = new StoreSerializer({}, {});
					var field = {
						code: 0x01,
						data: 'foo'
					};
					var record = new Record();
					var parseUuid = sinon.stub(StoreSerializer, '_parseUuid');
					parseUuid.returns('bar');
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert(parseUuid.calledOnce);
					assert(parseUuid.calledWith('foo'));
					assert.equal('bar', record.get('uuid'));
					parseUuid.restore();
				});
			});
		});

		describe('group', function() {
			describe('parsing', function() {
				it('works with unicode groups', function() {
					var storeSerializer = new StoreSerializer({}, {});
					var field = {
						code: 0x02,
						data: new jDataView(base64.decode('0JzQvtGPINCz0YDRg9C/0L/QsCAvIE15IGdyb3Vw'), 0, undefined, true)
					};
					var record = new Record();
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert.equal('Моя группа / My group', record.get('group'));
				});
			});
		});

		describe('title', function() {
			describe('parsing', function() {
				it('works with unicode titles', function() {
					var storeSerializer = new StoreSerializer({}, {});
					var field = {
						code: 0x03,
						data: new jDataView(base64.decode('0JzQvtC5INCw0LrQutCw0YPQvdGCIC8gTXkgYWNjb3VudA=='), 0, undefined, true)
					};
					var record = new Record();
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert.equal('Мой аккаунт / My account', record.get('title'));
				});
			});
		});

		describe('username', function() {
			describe('parsing', function() {
				it('works with unicode usernames', function() {
					var storeSerializer = new StoreSerializer({}, {});
					var field = {
						code: 0x04,
						data: new jDataView(base64.decode('0JLQsNGB0Y8g0J/Rg9C/0LrQuNC9IC8gSm9obiBEb2U='), 0, undefined, true)
					};
					var record = new Record();
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert.equal('Вася Пупкин / John Doe', record.get('username'));
				});
			});
		});

		describe('notes', function() {
			describe('parsing', function() {
				it('works with unicode notes', function() {
					var storeSerializer = new StoreSerializer({}, {});
					var field = {
						code: 0x05,
						data: new jDataView(base64.decode('0JLRgNC10LzQtdC90L3Ri9C5INCw0LrQutCw0YPQvdGCIC8gVGVtcG9yYXJ5IGFjY291bnQ='), 0, undefined, true)
					};
					var record = new Record();
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert.equal('Временный аккаунт / Temporary account', record.get('notes'));
				});
			});
		});

		describe('password', function() {
			describe('parsing', function() {
				it('works with unicode passwords', function() {
					var storeSerializer = new StoreSerializer({}, {});
					var field = {
						code: 0x06,
						data: new jDataView(base64.decode('0L/QkNCg0J7Qm9GMIXBBU1NXT1Jk'), 0, undefined, true)
					};
					var record = new Record();
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert.equal('пАРОЛь!pASSWORd', record.get('password'));
				});
			});
		});

		describe('creation time', function() {
			describe('parsing', function() {
				it('calls StoreSerializer._parseTime()', function() {
					var storeSerializer = new StoreSerializer({}, {});
					var field = {
						code: 0x07,
						data: 'foo'
					};
					var record = new Record();
					var parseTime = sinon.stub(StoreSerializer, '_parseTime');
					parseTime.returns('bar');
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert(parseTime.calledOnce);
					assert(parseTime.calledWith('foo'));
					assert.equal('bar', record.get('creationTime'));
					parseTime.restore();
				});
			});
		});

		describe('password modification time', function() {
			describe('parsing', function() {
				it('calls StoreSerializer._parseTime()', function() {
					var storeSerializer = new StoreSerializer({}, {});
					var field = {
						code: 0x08,
						data: 'foo'
					};
					var record = new Record();
					var parseTime = sinon.stub(StoreSerializer, '_parseTime');
					parseTime.returns('bar');
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert(parseTime.calledOnce);
					assert(parseTime.calledWith('foo'));
					assert.equal('bar', record.get('passwordModificationTime'));
					parseTime.restore();
				});
			});
		});

		describe('last access time', function() {
			describe('parsing', function() {
				it('calls StoreSerializer._parseTime()', function() {
					var storeSerializer = new StoreSerializer({}, {});
					var field = {
						code: 0x09,
						data: 'foo'
					};
					var record = new Record();
					var parseTime = sinon.stub(StoreSerializer, '_parseTime');
					parseTime.returns('bar');
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert(parseTime.calledOnce);
					assert(parseTime.calledWith('foo'));
					assert.equal('bar', record.get('lastAccessTime'));
					parseTime.restore();
				});
			});
		});

		describe('password expiry time', function() {
			describe('parsing', function() {
				it('calls StoreSerializer._parseTime()', function() {
					var storeSerializer = new StoreSerializer({}, {});
					var field = {
						code: 0x0a,
						data: 'foo'
					};
					var record = new Record();
					var parseTime = sinon.stub(StoreSerializer, '_parseTime');
					parseTime.returns('bar');
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert(parseTime.calledOnce);
					assert(parseTime.calledWith('foo'));
					assert.equal('bar', record.get('passwordExpiryTime'));
					parseTime.restore();
				});
			});
		});

		describe('reserved', function() {
			describe('parsing', function() {
				it('ignores it', function() {
					var storeSerializer = new StoreSerializer({}, {});
					var field = {
						code: 0x0b,
						data: 'foo'
					};
					var record = new Record();
					var recentAttributes = _.clone(record.attributes);
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert.deepEqual(recentAttributes, record.attributes);
				});
			});
		});

		describe('last modification time', function() {
			describe('parsing', function() {
				it('calls StoreSerializer._parseTime()', function() {
					var storeSerializer = new StoreSerializer({}, {});
					var field = {
						code: 0x0c,
						data: 'foo'
					};
					var record = new Record();
					var parseTime = sinon.stub(StoreSerializer, '_parseTime');
					parseTime.returns('bar');
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert(parseTime.calledOnce);
					assert(parseTime.calledWith('foo'));
					assert.equal('bar', record.get('lastModificationTime'));
					parseTime.restore();
				});
			});
		});

		describe('URL', function() {
			describe('parsing', function() {
				it('works with unicode URLs', function() {
					var storeSerializer = new StoreSerializer({}, {});
					var field = {
						code: 0x0d,
						data: new jDataView(base64.decode('aHR0cHM6Ly9ydS53aWtpcGVkaWEub3JnL3dpa2kv0JfQsNCz0LvQsNCy0L3QsNGPX9GB0YLRgNCw0L3QuNGG0LA='), 0, undefined, true)
					};
					var record = new Record();
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert.equal('https://ru.wikipedia.org/wiki/Заглавная_страница', record.get('url'));
				});
			});
		});

		describe('autotype', function() {
			describe('parsing', function() {
				it('works with unicode autotype instructions', function() {
					var storeSerializer = new StoreSerializer({}, {});
					var field = {
						code: 0x0e,
						data: new jDataView(base64.decode('0L/QvtC70YzQt9C+0LLQsNGC0LXQu9GMX3VzZXJuYW1lLCB0YWIsINC/0LDRgNC+0LvRjF9wYXNzd29yZCwgdGFiLCBlbnRlcg=='), 0, undefined, true)
					};
					var record = new Record();
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert.equal('пользователь_username, tab, пароль_password, tab, enter', record.get('autotype'));
				});
			});
		});

		describe('password history', function() {
			describe('parsing', function() {
				it('works with unicode passwords\' history', function() {
					var storeSerializer = new StoreSerializer({}, {});
					var field = {
						code: 0x0f,
						data: new jDataView('1040254cdaafc001c--==\xd0\xbf\xd0\x90\xd0\xa0\xd0\x9e\xd0\x9b\xd1\x8cpASSWORd==--54c91926000c:4o%nG+hF7WI', 0, undefined, true)
					};
					var record = new Record();
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert.equal(2, record.get('passwordHistory').items.length);
					assert.equal('--==пАРОЛьpASSWORd==--', record.get('passwordHistory').items[0].password);
					assert.equal(1422764796000, record.get('passwordHistory').items[0].time.getTime());
					assert.equal(':4o%nG+hF7WI', record.get('passwordHistory').items[1].password);
					assert.equal(1422465318000, record.get('passwordHistory').items[1].time.getTime());
					assert.strictEqual(4, record.get('passwordHistory').maxSize);
					assert.strictEqual(true, record.get('passwordHistory').on);
				});

				describe('when password history beginning is incorrect', function() {
					it('throws pws/Error', function() {
						var storeSerializer = new StoreSerializer({}, {});
						var field = {
							code: 0x0f,
							data: new jDataView('1@@0154cdaafc0001-', 0, undefined, true)
						};
						var record = new Record();
						assert.throws(function() {
							storeSerializer._parseRecordField(field, record);
						}, Error);
					});
				});

				describe('when password history item is incorrect', function() {
					it('throws pws/Error', function() {
						var storeSerializer = new StoreSerializer({}, {});
						var field = {
							code: 0x0f,
							data: new jDataView('1040254cdaafc0001-@@cdaafc0001-', 0, undefined, true)
						};
						var record = new Record();
						assert.throws(function() {
							storeSerializer._parseRecordField(field, record);
						}, Error);
					});
				});
			});
		});

		describe('password policy', function() {
			describe('parsing', function() {
				it('calls ._parsePasswordPolicy()', function() {
					var store = {};
					var storeSerializer = new StoreSerializer(store, {});
					var field = {
						code: 0x10,
						data: new jDataView('foo', 0, undefined, true)
					};
					var record = new Record();
					var parsePasswordPolicy = sinon.stub(StoreSerializer, '_parsePasswordPolicy');
					parsePasswordPolicy.returns('bar');
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert(parsePasswordPolicy.calledOnce);
					parsePasswordPolicy.calledWith('foo');
					assert.equal('bar', record.get('passwordPolicy'));
					parsePasswordPolicy.restore();
				});
			});
		});

		describe('password expiry interval', function() {
			describe('parsing', function() {
				it('works', function() {
					var store = {};
					var storeSerializer = new StoreSerializer(store, {});
					var field = {
						code: 0x11,
						data: new jDataView('\x42\x0e\x00\x00', 0, undefined, true)
					};
					var record = new Record();
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert.equal(3650, record.get('passwordExpiryInterval'));
				});

				describe('when zero is specified', function() {
					it('ignores it', function() {
						var store = {};
						var storeSerializer = new StoreSerializer(store, {});
						var field = {
							code: 0x11,
							data: new jDataView('\x00\x00\x00\x00', 0, undefined, true)
						};
						var record = new Record();
						assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
						assert(!record.has('passwordExpiryInterval'));
					});
				});

				describe('when value is too large', function() {
					it('throws pws/Error', function() {
						var store = {};
						var storeSerializer = new StoreSerializer(store, {});
						var field = {
							code: 0x11,
							data: new jDataView('\x43\x0e\x00\x00', 0, undefined, true) // 3651
						};
						var record = new Record();
						assert.throws(function() {
							storeSerializer._parseRecordField(field, record);
						}, Error);
					});
				});
			});
		});

		describe('run command', function() {
			describe('parsing', function() {
				it('works with unicode commands', function() {
					var storeSerializer = new StoreSerializer({}, {});
					var field = {
						code: 0x12,
						data: new jDataView('\xd0\xbf\xd1\x80\xd0\xbe\xd0\xb3\xd1\x80\xd0\xb0\xd0\xbc\xd0\xbc\xd0\xb0_program -with -parameters', 0, undefined, true)
					};
					var record = new Record();
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert.equal('программа_program -with -parameters', record.get('runCommand'));
				});
			});
		});

		describe('double click action', function() {
			describe('parsing', function() {
				it('works', function() {
					var storeSerializer = new StoreSerializer({}, {});
					var field = {
						code: 0x13,
						data: new jDataView('\xab\xcd', 0, undefined, true)
					};
					var record = new Record();
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert.equal(0xcdab, record.get('doubleClickAction'));
				});

				describe('when 0xff is specified', function() {
					it('ignores it', function() {
						var storeSerializer = new StoreSerializer({}, {});
						var field = {
							code: 0x13,
							data: new jDataView('\xff\x00', 0, undefined, true)
						};
						var record = new Record();
						assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
						assert(!record.has('doubleClickAction'));
					});
				});

				describe('when length is wrong', function() {
					it('throws pws/Error', function() {
						var storeSerializer = new StoreSerializer({}, {});
						var field = {
							code: 0x13,
							data: new jDataView('\xff\x00\xff', 0, undefined, true)
						};
						var record = new Record();
						assert.throws(function() {
							storeSerializer._parseRecordField(field, record);
						}, Error);
					});
				});
			});
		});

		describe('email', function() {
			describe('parsing', function() {
				it('works with unicode emails', function() {
					var storeSerializer = new StoreSerializer({}, {});
					var field = {
						code: 0x14,
						data: new jDataView('\xd0\xb2\xd0\xb0\xd1\x81\xd1\x8f.john@mail.com', 0, undefined, true)
					};
					var record = new Record();
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert.equal('вася.john@mail.com', record.get('email'));
				});
			});
		});

		describe('protected', function() {
			describe('parsing', function() {
				it('works', function() {
					var storeSerializer = new StoreSerializer({}, {});
					var field = {
						code: 0x15,
						data: new jDataView('\x01', 0, undefined, true)
					};
					var record = new Record();
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert.strictEqual(true, record.get('protected'));
				});

				describe('when length is wrong', function() {
					it('works', function() {
						var storeSerializer = new StoreSerializer({}, {});
						var field = {
							code: 0x15,
							data: new jDataView('\xff\x00', 0, undefined, true)
						};
						var record = new Record();
						assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
						assert.strictEqual(true, record.get('protected'));
					});
				});

				describe('when falsy value was specified', function() {
					it('ignores it', function() {
						var storeSerializer = new StoreSerializer({}, {});
						var field = {
							code: 0x15,
							data: new jDataView('\x00', 0, undefined, true)
						};
						var record = new Record();
						assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
						assert(!record.has('protected'));
					});
				});

				describe('when no data was specified', function() {
					it('ignores it', function() {
						var storeSerializer = new StoreSerializer({}, {});
						var field = {
							code: 0x15
						};
						var record = new Record();
						assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
						assert(!record.has('protected'));
					});
				});
			});
		});

		describe('own symbols for password', function() {
			describe('parsing', function() {
				it('works with unicode symbols', function() {
					var storeSerializer = new StoreSerializer({}, {});
					var field = {
						code: 0x16,
						data: new jDataView('\xe2\x80\xa2#\xd0\xab\xd1\x89', 0, undefined, true)
					};
					var record = new Record();
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert.equal('•#Ыщ', record.get('ownSymbolsForPassword'));
				});
			});
		});

		describe('password policy name', function() {
			describe('parsing', function() {
				it('works with unicode names', function() {
					var storeSerializer = new StoreSerializer({}, {});
					var field = {
						code: 0x18,
						data: new jDataView('\xd0\x9c\xd0\xbe\xd0\xb8 \xd0\xb0\xd0\xba\xd0\xba\xd0\xb0\xd1\x83\xd0\xbd\xd1\x82\xd1\x8b / My accounts', 0, undefined, true)
					};
					var record = new Record();
					assert.strictEqual(undefined, storeSerializer._parseRecordField(field, record));
					assert.equal('Мои аккаунты / My accounts', record.get('passwordPolicyName'));
				});
			});
		});

	});
});
