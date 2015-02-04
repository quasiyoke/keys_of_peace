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

	var HmacError = PWS.HmacError = function(){};
	HmacError.prototype = new Error('Storage HMAC is invalid. Looks like it was damaged.');

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
		 */
		this._parse(s);
		this._decrypt(stretchedKeyGenerator);
		this._readHeader();
		this._readRecords();
		this._checkHMAC();
	};
	
	
	_.extend(Store, {
		_ENCRYPTION_BLOCK_LENGTH: 128 / 8,
		_TAG_LENGTH: 4,
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

		_getPasswordPolicy: function(wordStack, hasName){
			var policy = {};
			if(hasName){
				var length = wordStack.shiftNumberHex(2);
				policy.name = Store._getText(wordStack.shiftBytes(length));
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
				policy.specialSymbols = Store._getText(wordStack.shiftBytes(length));
			}
			return policy;
		},

		_getText: function(wordArray){
			return CryptoJS.enc.Utf8.stringify(wordArray);
		},

		_getTime: function(wordArray){
			var wordArray = wordArray;
			if(8 === wordArray.sigBytes){ // TODO: Test this.
				hex = Store._getText(wordArray);
				if(Store._HEX_REGEX.test(hex)){
					wordArray = CryptoJS.enc.Hex.parse(hex);
				}
			}else if(4 !== wordArray.sigBytes){
				throw new Error('Incorrect timestamp field\'s length.');
			}
			_.extend(wordArray, CryptoJS.lib.WordStack);
			return new Date(wordArray.shiftNumber() * 1000);
		},

		_getUuid: function(wordArray){
			if(Store._UUID_LENGTH !== wordArray.sigBytes){
				throw new Error('Incorrect UUID.');
			}
			return wordArray.toString();
		},

		_shiftCiphertext: function(s){
			var ciphertext = [];
			var block;
			try{
				while('PWS3-EOFPWS3-EOF' !== CryptoJS.enc.Latin1.stringify(block = s.shiftWords(Store._ENCRYPTION_BLOCK_LENGTH / 4))){
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
			this.parse = options.parse;
			this.serialize = options.serialize;
		}
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
					uuid: Store._getUuid(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		NON_DEFAULT_PREFERENCES: HeaderField.create({
			type: 0x02,
			parse: function(wordStack){
				return {
					preferences: Store._getText(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		TREE_DISPLAY_STATUS: HeaderField.create({
			type: 0x03,
			parse: function(wordStack){ // TODO: Test this.
				return {
					treeDisplayStatus: _.map(Store._getText(wordStack), function(c){
						return '1' === c;
					})
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		TIMESTAMP_OF_LAST_SAVE: HeaderField.create({
			type: 0x04,
			parse: function(wordStack){
				return {
					lastSave: Store._getTime(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		WHO_PERFORMED_LAST_SAVE: HeaderField.create({
			type: 0x05,
			parse: function(){}
		}),
		WHAT_PERFORMED_LAST_SAVE: HeaderField.create({
			type: 0x06,
			parse: function(wordStack){
				return {
					whatPerformedLastSave: Store._getText(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		LAST_SAVED_BY_USER: HeaderField.create({
			type: 0x07,
			parse: function(wordStack){
				return {
					lastSavedByUser: Store._getText(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		LAST_SAVED_ON_HOST: HeaderField.create({
			type: 0x08,
			parse: function(wordStack){
				return {
					lastSavedOnHost: Store._getText(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		DATABASE_NAME: HeaderField.create({
			type: 0x09,
			parse: function(wordStack){ // TODO: Test this.
				return {
					databaseName: Store._getText(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		DATABASE_DESCRIPTION: HeaderField.create({
			type: 0x0a,
			parse: function(wordStack){ // TODO: Test this.
				return {
					databaseDescription: Store._getText(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		RECENTLY_USED_ENTRIES: HeaderField.create({
			type: 0x0f,
			parse: function(wordStack){ // TODO: Test this.
				var data = Store._getText(wordStack);
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
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		NAMED_PASSWORD_POLICIES: HeaderField.create({
			type: 0x10,
			parse: function(wordStack){
				/*
					Very sad situation here: this field code was also assigned to YUBI_SK in 3.27Y. Here we try to infer the actual type
					based on the actual value stored in the field. Specifically, YUBI_SK is YUBI_SK_LEN bytes of binary data, whereas HDR_PSWDPOLICIES
					is of varying length, starting with at least 4 hex digits.
				*/
				var data = wordStack.clone();
				data = Store._getText(data.shiftWords(1));
				var extender = {};
				if(wordStack.sigBytes !== Store._YUBI_SK_LENGTH || !Store._HEX_REGEX.test(data)){
					var count = wordStack.shiftNumberHex(2);
					extender.namedPasswordPolicies = [];
					try{
						for(var i=0; i<count; ++i){
							extender.namedPasswordPolicies.push(Store._getPasswordPolicy(wordStack, true));
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
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		EMPTY_GROUPS: HeaderField.create({
			type: 0x11,
			parse: function(wordStack, store){
				store.emptyGroups.push(Store._getText(wordStack))
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		END_OF_ENTRY: HeaderField.create({
			type: 0xff,
			parse: function(wordStack, store){
				return this;
			},
			serialize: function(){}
		})
	};

	Store._RECORDS_FIELDS = {
		UUID: RecordField.create({
			type: 0x01,
			parse: function(wordStack){
				return {
					uuid: Store._getUuid(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		GROUP: RecordField.create({
			type: 0x02,
			parse: function(wordStack){
				return {
					group: Store._getText(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		TITLE: RecordField.create({
			type: 0x03,
			parse: function(wordStack){
				return {
					title: Store._getText(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		USERNAME: RecordField.create({
			type: 0x04,
			parse: function(wordStack){
				return {
					username: Store._getText(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		NOTES: RecordField.create({
			type: 0x05,
			parse: function(wordStack){
				return {
					notes: Store._getText(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		PASSWORD: RecordField.create({
			type: 0x06,
			parse: function(wordStack){
				return {
					password: Store._getText(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		CREATION_TIME: RecordField.create({
			type: 0x07,
			parse: function(wordStack){
				return {
					creationTime: Store._getTime(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		PASSWORD_MODIFICATION_TIME: RecordField.create({
			type: 0x08,
			parse: function(wordStack){
				return {
					passwordModificationTime: Store._getTime(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		LAST_ACCESS_TIME: RecordField.create({
			type: 0x09,
			parse: function(wordStack){
				return {
					lastAccessTime: Store._getTime(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		PASSWORD_EXPIRY_TIME: RecordField.create({
			type: 0x0a,
			parse: function(wordStack){
				return {
					passwordExpiryTime: Store._getTime(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		RESERVED: RecordField.create({
			type: 0x0b,
			parse: function(){}
		}),
		LAST_MODIFICATION_TIME: RecordField.create({
			type: 0x0c,
			parse: function(wordStack){
				return {
					lastModificationTime: Store._getTime(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		URL: RecordField.create({
			type: 0x0d,
			parse: function(wordStack){
				return {
					url: Store._getText(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		AUTOTYPE: RecordField.create({
			type: 0x0e,
			parse: function(wordStack){
				return {
					autotype: Store._getText(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
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
					item.password = Store._getText(wordStack.shiftBytes(wordStack.shiftNumberHex(4)));
					items.push(item);
				}
				return extender;
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		PASSWORD_POLICY: RecordField.create({
			type: 0x10,
			parse: function(wordStack){
				return {
					passwordPolicy: Store._getPasswordPolicy(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		PASSWORD_EXPIRY_INTERVAL: RecordField.create({
			type: 0x11,
			parse: function(wordStack){
				return {
					passwordExpiryInterval: wordStack.shiftNumber()
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		RUN_COMMAND: RecordField.create({
			type: 0x12,
			parse: function(wordStack){
				return {
					runCommand: Store._getText(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		DOUBLE_CLICK_ACTION: RecordField.create({
			type: 0x13,
			parse: function(wordStack){
				return {

				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		EMAIL: RecordField.create({
			type: 0x14,
			parse: function(wordStack){
				return {
					email: Store._getText(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		PROTECTED_ENTRY: RecordField.create({
			type: 0x15,
			parse: function(wordStack){
				return {

				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		OWN_SYMBOLS_FOR_PASSWORD: RecordField.create({
			type: 0x16,
			parse: function(wordStack){
				return {
					ownSymbolsForPassword: Store._getText(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		SHIFT_DOUBLE_CLICK_ACTION: RecordField.create({
			type: 0x17,
			parse: function(wordStack){
				return {

				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		PASSWORD_POLICY_NAME: RecordField.create({
			type: 0x18,
			parse: function(wordStack){
				return {
					passwordPolicyName: Store._getText(wordStack)
				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		ENTRY_KEYBOARD_SHORTCUT: RecordField.create({
			type: 0x19,
			parse: function(wordStack){
				return {

				};
			},
			serialize: function(store){
				var data = CryptoJS.lib.WordStack.create();

				return data;
			}
		}),
		END_OF_ENTRY: RecordField.create({
			type: 0xff,
			parse: function(wordStack){
				return this;
			},
			serialize: function(){}
		})
	};

	_.extend(Store.prototype, {
		_checkHMAC: function(key){
			var h =this._hmac.finalize().toString();
			var h1=this._hmacValue.toString();
			if(h !== h1){
				throw new HmacError();
			}
		},
		
		_checkStretchedKey: function(key){
			var hasher = CryptoJS.algo.SHA256.create();
			if(this._stretchedKeyHash.toString() !== hasher.finalize(key).toString()){
				throw new IncorrectPasswordError();
			}
		},
		
		_decrypt: function(stretchedKeyGenerator){
			var stretchedKey = stretchedKeyGenerator.getStretchedKey(this._salt, this._iter);
			this._checkStretchedKey(stretchedKey);
			// TODO: Use here CipherParams.
			var key = CryptoJS.TwoFish.decrypt({ ciphertext: this._b1b2 }, stretchedKey, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding });
			var hmacKey = CryptoJS.TwoFish.decrypt({ ciphertext: this._b3b4 }, stretchedKey, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding });
			this._plaintext = CryptoJS.TwoFish.decrypt({ ciphertext: this._ciphertext }, key, { iv: this._iv, padding: CryptoJS.pad.NoPadding });
			this._hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, hmacKey);
		},

		getSerialized: function(){
			var retval = CryptoJS.lib.WordStack.create();
			var plaintext = CryptoJS.lib.WordStack.create();
			this._pushSerializedHeader(plaintext);
			this._pushSerializedRecords(plaintext);
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
				var tag = s.shiftWords(Store._TAG_LENGTH / 4);
				if('PWS3' !== CryptoJS.enc.Latin1.stringify(tag)){
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

		_pushField: function(wordStack, type, data){
			data || (data = CryptoJS.lib.WordArray.create());
			wordStack.pushNumber(data.sigBytes);
			wordStack.pushByte(type);
			wordStack.pushBytes(data);
			this._hmac.update(data);
			wordStack.pushBytes(CryptoJS.lib.WordArray.random((Store._ENCRYPTION_BLOCK_LENGTH - wordStack.sigBytes % Store._ENCRYPTION_BLOCK_LENGTH) % Store._ENCRYPTION_BLOCK_LENGTH)); // Fill the rest of the field with random bytes.
		},

		_pushSerializedHeader: function(wordStack){
			//this._pushField(wordStack, );
		},

		_readHeader: function(){
			/**
			 * @see ReadHeader at PWSfileV3.cpp
			 */
			_.extend(this._plaintext, CryptoJS.lib.WordStack);
			this.emptyGroups = [];
			this.unknownFields = [];
			while(true){
				var field = this._readField();
				var fieldHandler = Store._HEADER_FIELDS_TYPES[field.type];
				if(fieldHandler){
					_.extend(field.data, CryptoJS.lib.WordStack);
					var extender = fieldHandler.parse(field.data, this);
					if(!extender){
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

		_readField: function(){
			var field = {};
			var length = this._plaintext.shiftNumber();
			field.type = this._plaintext.shiftByte();
			field.data = this._plaintext.shiftBytes(length);
			this._plaintext.shiftBytes(this._plaintext.sigBytes % Store._ENCRYPTION_BLOCK_LENGTH);
			this._hmac.update(field.data);
			return field;
		},

		_readRecords: function(){
			this.records = [];
			while(this._plaintext.sigBytes > 0){
				var record = {};
				while(true){
					var field = this._readField();
					var fieldHandler = Store._RECORDS_FIELDS_TYPES[field.type];
					if(fieldHandler){
						_.extend(field.data, CryptoJS.lib.WordStack);
						var extender = fieldHandler.parse(field.data, this);
						if(!extender){
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
		}
	});
})();
