'use strict';

/**
 * Module implementing KeysOfPeace compatibility with Password Safe password manager.
 *
 * @see http://pwsafe.org/
 */

(function(){
	var PWS = KeysOfPeace.PWS = {};


	var Error = PWS.Error = function(message){
		this.message = message;
	};
	Error.prototype = new KeysOfPeace.Error();
	
	var IncorrectPasswordError = PWS.IncorrectPasswordError = function(){};
	IncorrectPasswordError.prototype = new Error('Incorrect password.');

	var HmacError = PWS.HmacError = function(currentHmac, hmac){
		this.message = 'Storage HMAC is invalid. Looks like it was damaged. Now: ' + currentHmac + ' Should be: ' + hmac;
	};
	HmacError.prototype = new Error();

	var VersionError = PWS.VersionError = function(message){
		this.message = message;
	}
	VersionError.prototype = new Error('This website doesn\'t supports storages of such version.');
		
	
	var Store = PWS.Store = function(s, stretchedKeyGenerator){
		/**
		 * Implements Password Safe store parsing.
		 *
		 * @param {string} s Base64-encoded Password Safe store string.
		 * @throws PWS.Error if storage format is incorrect.
		 * @throws KeysOfPeace.IncorrectSaltError
		 * @throws KeysOfPeace.TooFewIterationsError
		 */
		this._parse(s);
		this._decrypt(stretchedKeyGenerator);
		this._shiftHeader();
		this._shiftRecords();
		this._checkHMAC();
	};
	
	
	_.extend(Store, {
		_ENCRYPTION_BLOCK_LENGTH: 128 / 8,
		_EOF: CryptoJS.enc.Latin1.parse('PWS3-EOFPWS3-EOF'),
		_TAG: CryptoJS.enc.Latin1.parse('PWS3'),
		_HEADER_FIELDS_TYPES: {},
		_RECORDS_FIELDS_TYPES: {},
		_HEX_REGEX: /^[abcdef\d]+$/i,
		_PASSWORD_POLICY_USE_LOWERCASE: 0x8000,
		_PASSWORD_POLICY_USE_UPPERCASE: 0x4000,
		_PASSWORD_POLICY_USE_DIGITS: 0x2000,
		_PASSWORD_POLICY_USE_SYMBOLS: 0x1000,
		_PASSWORD_POLICY_USE_HEX_DIGITS: 0x0800,
		_PASSWORD_POLICY_USE_EASY_VISION: 0x0400,
		_PASSWORD_POLICY_MAKE_PRONOUNCEABLE: 0x0200,
		_UUID_LENGTH: 16,
		_VERSION: {
			major: 0x03,
			minor: 0x0d
		},
		_YUBI_SK_LENGTH: 20,

		_parsePasswordPolicy: function(wordStack, hasName){
			var policy = {};
			if(hasName){
				var length = wordStack.shiftNumberHex(2);
				policy.name = Store._parseText(wordStack.shiftBytes(length));
			}
			var flags = wordStack.shiftNumberHex(4);
			policy.useLowercase = !!(flags & Store._PASSWORD_POLICY_USE_LOWERCASE);
			policy.useUppercase = !!(flags & Store._PASSWORD_POLICY_USE_UPPERCASE);
			policy.useDigits = !!(flags & Store._PASSWORD_POLICY_USE_DIGITS);
			policy.useSymbols = !!(flags & Store._PASSWORD_POLICY_USE_SYMBOLS);
			policy.useHexDigits = !!(flags & Store._PASSWORD_POLICY_USE_HEX_DIGITS);
			policy.useEasyVision = !!(flags & Store._PASSWORD_POLICY_USE_EASY_VISION);
			policy.makePronounceable = !!(flags & Store._PASSWORD_POLICY_MAKE_PRONOUNCEABLE);
			policy.length = wordStack.shiftNumberHex(3);
			policy.lowercaseCountMin = wordStack.shiftNumberHex(3);
			policy.uppercaseCountMin = wordStack.shiftNumberHex(3);
			policy.digitsCountMin = wordStack.shiftNumberHex(3);
			policy.symbolsCountMin = wordStack.shiftNumberHex(3);
			if(hasName){
				length = wordStack.shiftNumberHex(2);
				policy.specialSymbols = Store._parseText(wordStack.shiftBytes(length));
			}
			return policy;
		},

		_serializePasswordPolicy: function(policy, hasName){
			var serialized = CryptoJS.lib.WordStack.create();
			if(hasName){
				serialized.pushNumberHex(policy.name.length, 2);
				serialized.pushBytes(Store._serializeText(policy.name));
			}
			var flags = 0;
			policy.useLowercase && (flags |= Store._PASSWORD_POLICY_USE_LOWERCASE);
			policy.useUppercase && (flags |= Store._PASSWORD_POLICY_USE_UPPERCASE);
			policy.useDigits && (flags |= Store._PASSWORD_POLICY_USE_DIGITS);
			policy.useSymbols && (flags |= Store._PASSWORD_POLICY_USE_SYMBOLS);
			policy.useHexDigits && (flags |= Store._PASSWORD_POLICY_USE_HEX_DIGITS);
			policy.useEasyVision && (flags |= Store._PASSWORD_POLICY_USE_EASY_VISION);
			policy.makePronounceable && (flags |= Store._PASSWORD_POLICY_MAKE_PRONOUNCEABLE);
			serialized.pushNumberHex(flags, 4);
			serialized.pushNumberHex(policy.length, 3);
			serialized.pushNumberHex(policy.lowercaseCountMin, 3);
			serialized.pushNumberHex(policy.uppercaseCountMin, 3);
			serialized.pushNumberHex(policy.digitsCountMin, 3);
			serialized.pushNumberHex(policy.symbolsCountMin, 3);
			if(hasName){
				serialized.pushNumberHex(policy.specialSymbols.length, 2);
				serialized.pushBytes(Store._serializeText(policy.specialSymbols));
			}
			return serialized;
		},

		_parseText: function(wordArray){
			return CryptoJS.enc.Utf8.stringify(wordArray);
		},

		_serializeText: function(text){
			return CryptoJS.enc.Utf8.parse(text);
		},

		_parseTime: function(wordArray){
			var wordArray = wordArray;
			/* @see ReadHeader at PWSfileV3.cpp */
			if(8 === wordArray.sigBytes){ // TODO: Test this.
				hex = Store._parseText(wordArray);
				if(Store._HEX_REGEX.test(hex)){
					wordArray = CryptoJS.enc.Hex.parse(hex);
				}
			}else if(4 !== wordArray.sigBytes){
				throw new Error('Incorrect timestamp field\'s length.');
			}
			_.extend(wordArray, CryptoJS.lib.WordStack);
			return new Date(wordArray.shiftNumber() * 1000);
		},

		_serializeTime: function(time){
			var serialized = CryptoJS.lib.WordStack.create();
			serialized.pushNumber(time.getTime() / 1000);
			return serialized;
		},

		_parseUuid: function(wordArray){
			if(Store._UUID_LENGTH !== wordArray.sigBytes){
				throw new Error('Incorrect UUID.');
			}
			return wordArray.toString();
		},

		_serializeUuid: function(uuid){
			return CryptoJS.enc.Hex.parse(uuid);
		},

		_shiftCiphertext: function(s){
			var ciphertext = [];
			var block;
			try{
				while(Store._EOF.toString() !== (block = s.shiftWords(Store._ENCRYPTION_BLOCK_LENGTH / 4)).toString()){
					ciphertext.push.apply(ciphertext, block.words);
				}
			}catch(e){
				if(e instanceof CryptoJS.lib.WordStack.IndexError){
					throw new Error('EOF marker not found.');
				}else{
					throw e;
				}
			}
			return CryptoJS.lib.WordArray.create(ciphertext, ciphertext.length * 4);
		},

		_switchEndianness: function(word){
			return ((word & 0xff) << 24) | ((word & 0xff00) << 8) | ((word & 0xff0000) >>> 8) | (word >>> 24);
		}
	});


	var Field = Store._Field = CryptoJS.lib.Base.extend({
		init: function(options){
			this.type = options.type;
			options.parse && (this.parse = options.parse);
			options.serialize && (this.serialize = options.serialize);
		},

		parse: function(){},

		serialize: function(){}
	});

	var HeaderField = Store._HeaderField = Field.extend({
		init: function(options){
			HeaderField.$super.init.apply(this, arguments);
			Store._HEADER_FIELDS_TYPES[options.type] = this;
		}
	});

	var RecordField = Store._RecordField = Field.extend({
		init: function(options){
			RecordField.$super.init.apply(this, arguments);
			Store._RECORDS_FIELDS_TYPES[options.type] = this;
		}
	});

	Store._HEADER_FIELDS = {
		VERSION: HeaderField.create({
			type: 0x00,
			parse: function(wordStack){ // TODO: Test beta version format.
				if(2 != wordStack.sigBytes && 4 != wordStack.sigBytes){
					throw new VersionError('Incorrect version field length.');
				}
				var extender = {
					version: {
						minor: wordStack.shiftByte(),
						major: wordStack.shiftByte()
					}
				};
				if(Store._VERSION.major != extender.version.major){
					throw new VersionError();
				}
				return extender;
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();
				data.pushByte(store.version.minor);
				data.pushByte(store.version.major);
				return data;
			}
		}),
		UUID: HeaderField.create({
			type: 0x01,
			parse: function(wordStack){
				return {
					uuid: Store._parseUuid(wordStack)
				};
			},
			serialize: function(store){
				return Store._serializeUuid(store.uuid);
			}
		}),
		NON_DEFAULT_PREFERENCES: HeaderField.create({
			type: 0x02,
			parse: function(wordStack){
				return {
					preferences: Store._parseText(wordStack)
				};
			},
			serialize: function(store){
				return Store._serializeText(store.preferences);
			}
		}),
		TREE_DISPLAY_STATUS: HeaderField.create({
			type: 0x03,
			parse: function(wordStack){ // TODO: Test this.
				return {
					treeDisplayStatus: _.map(Store._parseText(wordStack), function(c){
						return '1' === c;
					})
				};
			},
			serialize: function(store){
				if(!store.treeDisplayStatus){
					return;
				}
				var treeDisplayStatus = _.map(store.treeDisplayStatus, function(expanded){
					return expanded ? '1' : '0';
				});
				return Store._serializeText(treeDisplayStatus.join(''));
			}
		}),
		TIMESTAMP_OF_LAST_SAVE: HeaderField.create({
			type: 0x04,
			parse: function(wordStack){
				return {
					lastSave: Store._parseTime(wordStack)
				};
			},
			serialize: function(store){
				return Store._serializeTime(store.lastSave);
			}
		}),
		WHO_PERFORMED_LAST_SAVE: HeaderField.create({ type: 0x05 }),
		WHAT_PERFORMED_LAST_SAVE: HeaderField.create({
			type: 0x06,
			parse: function(wordStack){
				return {
					whatPerformedLastSave: Store._parseText(wordStack)
				};
			},
			serialize: function(store){
				return Store._serializeText(store.whatPerformedLastSave);
			}
		}),
		LAST_SAVED_BY_USER: HeaderField.create({
			type: 0x07,
			parse: function(wordStack){
				return {
					lastSavedByUser: Store._parseText(wordStack)
				};
			},
			serialize: function(store){
				return Store._serializeText(store.lastSavedByUser);
			}
		}),
		LAST_SAVED_ON_HOST: HeaderField.create({
			type: 0x08,
			parse: function(wordStack){
				return {
					lastSavedOnHost: Store._parseText(wordStack)
				};
			},
			serialize: function(store){
				return Store._serializeText(store.lastSavedOnHost);
			}
		}),
		DATABASE_NAME: HeaderField.create({
			type: 0x09,
			parse: function(wordStack){ // TODO: Test this.
				return {
					databaseName: Store._parseText(wordStack)
				};
			},
			serialize: function(store){
				if(!store.databaseName){
					return;
				}
				return Store._serializeText(store.databaseName);
			}
		}),
		DATABASE_DESCRIPTION: HeaderField.create({
			type: 0x0a,
			parse: function(wordStack){ // TODO: Test this.
				return {
					databaseDescription: Store._parseText(wordStack)
				};
			},
			serialize: function(store){
				if(!store.databaseDescription){
					return;
				}
				return Store._serializeText(store.databaseDescription);
			}
		}),
		RECENTLY_USED_ENTRIES: HeaderField.create({
			type: 0x0f,
			parse: function(wordStack){ // TODO: Test this.
				var data = Store._parseText(wordStack);
				var count = CryptoJS.enc.Hex.parse(data.substr(0, 2));
				_.extend(count, CryptoJS.lib.WordStack);
				count = count.shiftByte();
				if(data.length !== 2 + count * Store._UUID_LENGTH){
					return;
				}
				var extender = {
					recentlyUsedEntries: []
				};
				for(var i=2; i<data.length; i+=Store._UUID_LENGTH){
					extender.recentlyUsedEntries.push(data.substr(i, Store._UUID_LENGTH));
				}
				return extender;
			},
			serialize: function(store){
				if(!store.recentlyUsedEntries || !store.recentlyUsedEntries.length){
					return;
				}
				var data = CryptoJS.lib.WordStack.create();
				if(store.recentlyUsedEntries.length > 0xff){
					store.recentlyUsedEntries = store.recentlyUsedEntries.slice(0, 0xff); // TODO: Check slicing.
				}
				data.pushNumberHex(store.recentlyUsedEntries.length, 2);
				_.each(store.recentlyUsedEntries, function(uuid){
					data.pushBytes(Store._serializeUuid(uuid), 2);
				});
				return data;
			}
		}),
		NAMED_PASSWORD_POLICIES: HeaderField.create({
			type: 0x10,
			parse: function(wordStack){
				/*
					Very sad situation here: this field code was also assigned to YUBI_SK in 3.27Y. Here we try to infer the actual type based on the actual value
					stored in the field. Specifically, YUBI_SK is Store._YUBI_SK_LENGTH bytes of binary data, whereas NAMED_PASSWORD_POLICIES is of varying length,
					starting with at least 4 hex digits.
					@see ReadHeader at PWSfileV3.cpp
				*/
				var data = wordStack.clone();
				data = Store._parseText(data.shiftWords(1));
				var extender = {};
				if(wordStack.sigBytes !== Store._YUBI_SK_LENGTH || Store._HEX_REGEX.test(data)){
					var count = wordStack.shiftNumberHex(2);
					extender.namedPasswordPolicies = [];
					try{
						for(var i=0; i<count; ++i){
							extender.namedPasswordPolicies.push(Store._parsePasswordPolicy(wordStack, true));
						}
					}catch(e){
						if(e instanceof CryptoJS.lib.WordStack.IndexError){
							return;
						}else{
							throw e;
						}
					}
				}else{ // TODO: Test this.
					extender.yubiSk = wordStack.readBytes(Store._YUBI_SK_LENGTH);
				}
				return extender;
			},
			serialize: function(store){
				if(!store.namedPasswordPolicies || !store.namedPasswordPolicies.length){
					return;
				}
				if(store.namedPasswordPolicies.length > 0xff){
					store.namedPasswordPolicies = store.namedPasswordPolicies.slice(0, 0xff); // TODO: Check slicing.
				}
				var data = CryptoJS.lib.WordStack.create();
				data.pushNumberHex(store.namedPasswordPolicies.length, 2);
				_.each(store.namedPasswordPolicies, function(policy){
					data.pushBytes(Store._serializePasswordPolicy(policy, true));
				});
				return data;
			}
		}),
		EMPTY_GROUPS: HeaderField.create({
			type: 0x11,
			parse: function(wordStack, store){
				store.emptyGroups.push(Store._parseText(wordStack))
			},
			serialize: function(store){
				return _.map(store.emptyGroups, function(group){
					return Store._serializeText(group);
				});
			}
		}),
		YUBICO: HeaderField.create({
			type: 0x12,
			serialize: function(store){ // TODO: Test this.
				return store.yubico;
			}
		}),
		END_OF_ENTRY: HeaderField.create({
			type: 0xff,
			parse: function(wordStack, store){
				return this; // This means that header definition was finished. Start records parsing.
			}
		})
	};

	Store._RECORDS_FIELDS = {
		UUID: RecordField.create({
			type: 0x01,
			parse: function(wordStack){
				return {
					uuid: Store._parseUuid(wordStack)
				};
			},
			serialize: function(record){
				return Store._serializeUuid(record.uuid);
			}
		}),
		GROUP: RecordField.create({
			type: 0x02,
			parse: function(wordStack){
				return {
					group: Store._parseText(wordStack)
				};
			},
			serialize: function(record){
				return Store._serializeText(record.group);
			}
		}),
		TITLE: RecordField.create({
			type: 0x03,
			parse: function(wordStack){
				return {
					title: Store._parseText(wordStack)
				};
			},
			serialize: function(record){
				return Store._serializeText(record.title);
			}
		}),
		USERNAME: RecordField.create({
			type: 0x04,
			parse: function(wordStack){
				return {
					username: Store._parseText(wordStack)
				};
			},
			serialize: function(record){
				return Store._serializeText(record.username);
			}
		}),
		NOTES: RecordField.create({
			type: 0x05,
			parse: function(wordStack){
				return {
					notes: Store._parseText(wordStack)
				};
			},
			serialize: function(record){
				return Store._serializeText(record.notes);
			}
		}),
		PASSWORD: RecordField.create({
			type: 0x06,
			parse: function(wordStack){
				return {
					password: Store._parseText(wordStack)
				};
			},
			serialize: function(record){
				return Store._serializeText(record.password);
			}
		}),
		CREATION_TIME: RecordField.create({
			type: 0x07,
			parse: function(wordStack){
				return {
					creationTime: Store._parseTime(wordStack)
				};
			},
			serialize: function(record){
				if(!record.creationTime){
					return;
				}
				return Store._serializeTime(record.creationTime);
			}
		}),
		PASSWORD_MODIFICATION_TIME: RecordField.create({
			type: 0x08,
			parse: function(wordStack){
				return {
					passwordModificationTime: Store._parseTime(wordStack)
				};
			},
			serialize: function(record){
				if(!record.passwordModificationTime){
					return;
				}
				return Store._serializeTime(record.passwordModificationTime);
			}
		}),
		LAST_ACCESS_TIME: RecordField.create({
			type: 0x09,
			parse: function(wordStack){
				return {
					lastAccessTime: Store._parseTime(wordStack)
				};
			},
			serialize: function(record){
				if(!record.lastAccessTime){
					return;
				}
				return Store._serializeTime(record.lastAccessTime);
			}
		}),
		PASSWORD_EXPIRY_TIME: RecordField.create({
			type: 0x0a,
			parse: function(wordStack){
				return {
					passwordExpiryTime: Store._parseTime(wordStack)
				};
			},
			serialize: function(record){
				if(!record.passwordExpiryTime){
					return;
				}
				return Store._serializeTime(record.passwordExpiryTime);
			}
		}),
		RESERVED: RecordField.create({ type: 0x0b }),
		LAST_MODIFICATION_TIME: RecordField.create({
			type: 0x0c,
			parse: function(wordStack){
				return {
					lastModificationTime: Store._parseTime(wordStack)
				};
			},
			serialize: function(record){
				if(!record.lastModificationTime){
					return;
				}
				return Store._serializeTime(record.lastModificationTime);
			}
		}),
		URL: RecordField.create({
			type: 0x0d,
			parse: function(wordStack){
				return {
					url: Store._parseText(wordStack)
				};
			},
			serialize: function(record){
				return Store._serializeText(record.url);
			}
		}),
		AUTOTYPE: RecordField.create({
			type: 0x0e,
			parse: function(wordStack){
				return {
					autotype: Store._parseText(wordStack)
				};
			},
			serialize: function(record){
				return Store._serializeText(record.autotype);
			}
		}),
		PASSWORD_HISTORY: RecordField.create({
			type: 0x0f,
			parse: function(wordStack){
				var extender = {};
				extender.passwordHistory = {
					on: '1'.charCodeAt(0) === wordStack.shiftByte()
				};
				extender.passwordHistory.maxSize = wordStack.shiftNumberHex(2);
				var length = wordStack.shiftNumberHex(2);
				var items = extender.passwordHistory.items = [];
				for(var i=0; i<length; ++i){
					var item = {
						time: new Date(wordStack.shiftNumberHex(8) * 1000)
					};
					item.password = Store._parseText(wordStack.shiftBytes(wordStack.shiftNumberHex(4)));
					items.push(item);
				}
				return extender;
			},
			serialize: function(record){
				if(!record.passwordHistory){
					return;
				}
				var data = CryptoJS.lib.WordStack.create();
				data.pushByte((record.passwordHistory ? '1' : '0').charCodeAt(0));
				data.pushNumberHex(record.passwordHistory.maxSize, 2);
				data.pushNumberHex(record.passwordHistory.items.length, 2);
				_.each(record.passwordHistory.items, function(item){
					data.pushNumberHex(item.time.getTime() / 1000, 8);
					data.pushNumberHex(item.password.length, 4);
					data.pushBytes(Store._serializeText(item.password));
				});
				return data;
			}
		}),
		PASSWORD_POLICY: RecordField.create({
			type: 0x10,
			parse: function(wordStack){
				return {
					passwordPolicy: Store._parsePasswordPolicy(wordStack)
				};
			},
			serialize: function(record){
				if(!record.passwordPolicy){
					return;
				}
				return Store._serializePasswordPolicy(record.passwordPolicy);
			}
		}),
		PASSWORD_EXPIRY_INTERVAL: RecordField.create({
			type: 0x11,
			parse: function(wordStack){
				return {
					passwordExpiryInterval: wordStack.shiftNumber()
				};
			},
			serialize: function(record){
				if(!record.passwordExpiryInterval){
					return;
				}
				var data = CryptoJS.lib.WordStack.create();
				data.pushNumber(record.passwordExpiryInterval);
				return data;
			}
		}),
		RUN_COMMAND: RecordField.create({
			type: 0x12,
			parse: function(wordStack){
				return {
					runCommand: Store._parseText(wordStack)
				};
			},
			serialize: function(record){
				if(!record.runCommand){
					return;
				}
				return Store._serializeText(record.runCommand);
			}
		}),
		DOUBLE_CLICK_ACTION: RecordField.create({
			type: 0x13,
			parse: function(wordStack){
				return {
					doubleClickAction: wordStack.shiftShort()
				};
			},
			serialize: function(record){
				if(undefined === record.doubleClickAction || 0xff === record.doubleClickAction){
					return;
				}
				var data = CryptoJS.lib.WordStack.create();
				data.pushShort(record.doubleClickAction);
				return data;
			}
		}),
		EMAIL: RecordField.create({
			type: 0x14,
			parse: function(wordStack){
				return {
					email: Store._parseText(wordStack)
				};
			},
			serialize: function(record){
				if(!record.email){
					return;
				}
				return Store._serializeText(record.email);
			}
		}),
		PROTECTED_ENTRY: RecordField.create({
			type: 0x15,
			parse: function(wordStack){ // TODO: Test this.
				return {
					protectedEntry: !!wordStack.shiftByte()
				};
			},
			serialize: function(record){
				if(!record.protectedEntry){
					return;
				}
				return Store._serializeText('1');
			}
		}),
		OWN_SYMBOLS_FOR_PASSWORD: RecordField.create({
			type: 0x16,
			parse: function(wordStack){
				return {
					ownSymbolsForPassword: Store._parseText(wordStack)
				};
			},
			serialize: function(record){
				if(!record.ownSymbolsForPassword){
					return;
				}
				return Store._serializeText(record.ownSymbolsForPassword);
			}
		}),
		SHIFT_DOUBLE_CLICK_ACTION: RecordField.create({
			type: 0x17,
			parse: function(wordStack){
				return {
					shiftDoubleClickAction: wordStack.shiftShort()
				};
			},
			serialize: function(record){
				if(undefined === record.doubleClickAction || 0xff === record.doubleClickAction){
					return;
				}
				var data = CryptoJS.lib.WordStack.create();
				data.pushShort(record.shiftDoubleClickAction);
				return data;
			}
		}),
		PASSWORD_POLICY_NAME: RecordField.create({
			type: 0x18,
			parse: function(wordStack){
				return {
					passwordPolicyName: Store._parseText(wordStack)
				};
			},
			serialize: function(record){
				if(!record.passwordPolicyName){
					return;
				}
				return Store._serializeText(record.passwordPolicyName);
			}
		}),
		END_OF_ENTRY: RecordField.create({
			type: 0xff,
			parse: function(wordStack){
				return this; // This means that record definition was finished. Begin next record.
			}
		})
	};

	_.extend(Store.prototype, {
		_checkHMAC: function(key){
			var currentHmac = this._hmac.finalize().toString();
			var hmac = this._hmacValue.toString();
			if(currentHmac !== hmac){
				throw new HmacError(currentHmac, hmac);
			}
		},
		
		_checkStretchedKey: function(key){
			if(this._stretchedKeyHash.toString() !== CryptoJS.SHA256(key).toString()){
				throw new IncorrectPasswordError();
			}
		},
		
		_decrypt: function(stretchedKeyGenerator){
			var stretchedKey = stretchedKeyGenerator.getStretchedKey(this._salt, this._iter);
			this._checkStretchedKey(stretchedKey);
			// TODO: Use here CipherParams.
			this._key = CryptoJS.TwoFish.decrypt({ ciphertext: this._b1b2 }, stretchedKey, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding });
			this._hmacKey = CryptoJS.TwoFish.decrypt({ ciphertext: this._b3b4 }, stretchedKey, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding });
			this._plaintext = CryptoJS.TwoFish.decrypt({ ciphertext: this._ciphertext }, this._key, { iv: this._iv, padding: CryptoJS.pad.NoPadding });
			this._hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, this._hmacKey);
		},

		getSerialized: function(stretchedKeyGenerator){
			this._plaintext = CryptoJS.lib.WordStack.create();
			this._hmacKey = CryptoJS.lib.WordArray.random(KeysOfPeace.SALT_LENGTH);
			this._hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, this._hmacKey);
			this._pushHeader();
			this._pushRecords();
			var serialized = this._getSerialized(stretchedKeyGenerator);
			return CryptoJS.enc.Base64.stringify(serialized);
		},
		
		_parse: function(s){
			if(!s){
				throw new Error('PWS store wasn\'t defined.');
			}
			var warnings = [];
			s = CryptoJS.enc.Base64.parse(s);
			_.extend(s, CryptoJS.lib.WordStack);
			try{
				/* "TAG" check. */
				var tag = s.shiftWords(Store._TAG.sigBytes / 4);
				if(Store._TAG.toString() !== tag.toString()){
					throw new Error('Incorrect "TAG".');
				}
				this._salt = s.shiftWords(KeysOfPeace.SALT_LENGTH / 4);
				this._iter = s.shiftNumber();
				this._stretchedKeyHash = s.shiftWords(KeysOfPeace.SALT_LENGTH / 4);
				this._b1b2 = s.shiftWords(Store._ENCRYPTION_BLOCK_LENGTH / 4 * 2);
				this._b3b4 = s.shiftWords(Store._ENCRYPTION_BLOCK_LENGTH / 4 * 2);
				this._iv = s.shiftWords(Store._ENCRYPTION_BLOCK_LENGTH / 4);
				this._ciphertext = Store._shiftCiphertext(s);
				this._hmacValue = s.shiftWords(KeysOfPeace.SALT_LENGTH / 4);
			}catch(e){
				if(e instanceof CryptoJS.lib.WordStack.IndexError){
					throw new Error('PWS store string was finished unexpectedly.');
				}else{
					throw e;
				}
			}
		},

		_pushField: function(type, data){
			data || (data = CryptoJS.lib.WordArray.create());
			this._plaintext.pushNumber(data.sigBytes);
			this._plaintext.pushByte(type);
			this._plaintext.pushBytes(data);
			this._hmac.update(data);
			this._plaintext.pushBytes(CryptoJS.lib.WordArray.random((Store._ENCRYPTION_BLOCK_LENGTH - this._plaintext.sigBytes % Store._ENCRYPTION_BLOCK_LENGTH) % Store._ENCRYPTION_BLOCK_LENGTH)); // Fill the rest of the field with random bytes.
		},

		_pushHeader: function(){
			var field = Store._HEADER_FIELDS.VERSION;
			this._pushField(field.type, field.serialize(this));
			var that = this;
			_.each(Store._HEADER_FIELDS, function(field, name){
				var data;
				if(['VERSION', 'END_OF_ENTRY'].indexOf(name) >= 0 || !(data = field.serialize(that))){
					return;
				}
				if(_.isArray(data)){
					_.each(data, function(data){
						that._pushField(field.type, data);
					});
				}else{
					that._pushField(field.type, data);
				}
			});
			_.each(this.unknownFields, function(field){
				that._pushField(field.type, field.data);
			});
			field = Store._HEADER_FIELDS.END_OF_ENTRY;
			that._pushField(field.type, field.serialize(this));
		},

		_pushRecords: function(){
			var that = this;
			_.each(this.records, function(record){
				_.each(Store._RECORDS_FIELDS, function(field, name){
					var data;
					if('END_OF_ENTRY' === name || !(data = field.serialize(record, that))){
						return;
					}
					if(_.isArray(data)){
						_.each(data, function(data){
							that._pushField(field.type, data);
						});
					}else{
						that._pushField(field.type, data);
					}
				});
				_.each(record.unknownFields, function(field){
					that._pushField(field.type, field.data);
				});
				var field = Store._HEADER_FIELDS.END_OF_ENTRY;
				that._pushField(field.type, field.serialize(this));
			});
		},

		_shiftHeader: function(){
			/**
			 * @see ReadHeader at PWSfileV3.cpp
			 */
			_.extend(this._plaintext, CryptoJS.lib.WordStack);
			this.emptyGroups = [];
			this.unknownFields = [];
			while(true){
				var field = this._shiftField();
				var fieldHandler = Store._HEADER_FIELDS_TYPES[field.type];
				if(fieldHandler){
					_.extend(field.data, CryptoJS.lib.WordStack);
					var extender;
					if(!fieldHandler.parse || !(extender = fieldHandler.parse(field.data, this))){
						continue;
					}else if(fieldHandler === extender){
						break;
					}else{
						_.extend(this, extender);
					}
				}else{
					this.unknownFields.push(field);
				}
			}
		},

		_shiftField: function(){
			var field = {};
			var length = this._plaintext.shiftNumber();
			field.type = this._plaintext.shiftByte();
			field.data = this._plaintext.shiftBytes(length);
			this._plaintext.shiftBytes(this._plaintext.sigBytes % Store._ENCRYPTION_BLOCK_LENGTH);
			this._hmac.update(field.data);
			return field;
		},

		_shiftRecords: function(){
			this.records = [];
			while(this._plaintext.sigBytes > 0){
				var record = {};
				while(true){
					var field = this._shiftField();
					var fieldHandler = Store._RECORDS_FIELDS_TYPES[field.type];
					if(fieldHandler){
						_.extend(field.data, CryptoJS.lib.WordStack);
						var extender;
						if(!fieldHandler.parse || !(extender = fieldHandler.parse(field.data, this))){
							continue;
						}else if(fieldHandler === extender){
							break;
						}else{
							_.extend(record, extender);
						}
					}else{
						record.unknownFields || (record.unknownFields = []);
						record.unknownFields.push(field);
					}
				}
				this.records.push(record);
			}
		},

		_getSerialized: function(stretchedKeyGenerator){
			this._key = CryptoJS.lib.WordArray.random(KeysOfPeace.SALT_LENGTH);
			this._salt = CryptoJS.lib.WordArray.random(KeysOfPeace.SALT_LENGTH);
			var stretchedKey = stretchedKeyGenerator.getStretchedKey(this._salt, this._iter);
			this._stretchedKeyHash = CryptoJS.SHA256(stretchedKey);
			// TODO: Use CipherParams here.
			this._b1b2 = CryptoJS.TwoFish.encrypt(this._key, stretchedKey, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding }).ciphertext;
			this._b3b4 = CryptoJS.TwoFish.encrypt(this._hmacKey, stretchedKey, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding }).ciphertext;
			this._iv = CryptoJS.lib.WordArray.random(Store._ENCRYPTION_BLOCK_LENGTH);
			this._ciphertext = CryptoJS.TwoFish.encrypt(this._plaintext, this._key, { iv: this._iv, padding: CryptoJS.pad.NoPadding }).ciphertext;
			this._hmacValue = this._hmac.finalize();
			var serialized = CryptoJS.lib.WordStack.create();
			serialized.pushBytes(Store._TAG);
			serialized.pushBytes(this._salt);
			serialized.pushNumber(this._iter);
			serialized.pushBytes(this._stretchedKeyHash);
			serialized.pushBytes(this._b1b2);
			serialized.pushBytes(this._b3b4);
			serialized.pushBytes(this._iv);
			serialized.pushBytes(this._ciphertext);
			serialized.pushBytes(Store._EOF);
			serialized.pushBytes(this._hmacValue);
			return serialized;
		}
	});
})();
