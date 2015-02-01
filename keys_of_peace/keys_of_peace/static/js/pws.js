'use strict';
(function(){
	window.PWS = {};
	
	
	var Error = PWS.Error = function(message){
		this._message = message;
	};
	
	var IncorrectPasswordError = PWS.IncorrectPasswordError = function(){};
	IncorrectPasswordError.prototype = new Error('Incorrect password.');
	
	var TooFewIterationsError = PWS.TooFewIterationsError = function(){};
	TooFewIterationsError.prototype = new Error('Storage has too small hashing iterations count for key stretching specified.');

	var HmacError = PWS.HmacError = function(){};
	HmacError.prototype = new Error('Storage HMAC is invalid. Looks like it was damaged.');

	var VersionError = PWS.VersionError = function(message){
		this.message = message;
	}
	VersionError.prototype = new VersionError('This website doesn\'t supports storages of such version.');
		
	
	var Store = PWS.Store = function(s, password){
		/**
		 * Implements Password Safe store parsing.
		 *
		 * @param {string} s Base64-encoded Password Safe store string.
		 * @throws PWS.Error if storage format is incorrect.
		 */
		this._parse(s);
		this._decrypt(password);
		this._readHeader();
		this._readRecords();
		this._checkHMAC();
	};

	_.extend(Store, {
		_ENCRYPTION_BLOCK_LENGTH: 128 / 8,
		_TAG_LENGTH: 4,
		_SALT_LENGTH: 256 / 8,
		_HEX_REGEX: /^[abcdef\d]+$/i,
		_ITER_MIN: 2048,
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

		_HEADER_FIELDS_TYPES: {
			VERSION: 0x00,
			UUID: 0x01,
			NON_DEFAULT_PREFERENCES: 0x02,
			TREE_DISPLAY_STATUS: 0x03,
			TIMESTAMP_OF_LAST_SAVE: 0x04,
			WHO_PERFORMED_LAST_SAVE: 0x05,
			WHAT_PERFORMED_LAST_SAVE: 0x06,
			LAST_SAVED_BY_USER: 0x07,
			LAST_SAVED_ON_HOST: 0x08,
			DATABASE_NAME: 0x09,
			DATABASE_DESCRIPTION: 0x0a,
			DATABASE_FILTERS: 0x0b,
			RESERVED1: 0x0c,
			RESERVED2: 0x0d,
			RESERVED3: 0x0e,
			RECENTLY_USED_ENTRIES: 0x0f,
			NAMED_PASSWORD_POLICIES: 0x10,
			EMPTY_GROUPS: 0x11,
			YUBICO: 0x12,
			END_OF_ENTRY: 0xff
		},

		_RECORDS_FIELDS_TYPES: {
			UUID: 0x01,
			GROUP: 0x02,
			TITLE: 0x03,
			USERNAME: 0x04,
			NOTES: 0x05,
			PASSWORD: 0x06,
			CREATION_TIME: 0x07,
			PASSWORD_MODIFICATION_TIME: 0x08,
			LAST_ACCESS_TIME: 0x09,
			PASSWORD_EXPIRY_TIME: 0x0a,
			RESERVED: 0x0b,
			LAST_MODIFICATION_TIME: 0x0c,
			URL: 0x0d,
			AUTOTYPE: 0x0e,
			PASSWORD_HISTORY: 0x0f,
			PASSWORD_POLICY: 0x10,
			PASSWORD_EXPIRY_INTERVAL: 0x11,
			RUN_COMMAND: 0x12,
			DOUBLE_CLICK_ACTION: 0x13,
			EMAIL: 0x14,
			PROTECTED_ENTRY: 0x15,
			OWN_SYMBOLS_FOR_PASSWORD: 0x16,
			SHIFT_DOUBLE_CLICK_ACTION: 0x17,
			PASSWORD_POLICY_NAME: 0x18,
			ENTRY_KEYBOARD_SHORTCUT: 0x19,
			END_OF_ENTRY: 0xff
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
				while('PWS3-EOFPWS3-EOF' !== CryptoJS.enc.Latin1.stringify(block = s.shiftWordArray(Store._ENCRYPTION_BLOCK_LENGTH / 4))){
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
		
		_decrypt: function(password){
			var stretchedKey = this._getStretchedKey(password);
			this._checkStretchedKey(stretchedKey);
			var key = CryptoJS.TwoFish.decrypt({ ciphertext: this._b1b2 }, stretchedKey, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding });
			var hmacKey = CryptoJS.TwoFish.decrypt({ ciphertext: this._b3b4 }, stretchedKey, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding });
			this._plaintext = CryptoJS.TwoFish.decrypt({ ciphertext: this._ciphertext }, key, { iv: this._iv, padding: CryptoJS.pad.NoPadding });
			this._hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, hmacKey);
		},

		_getStretchedKey: function(password){
			/**
			 * @see StretchKey at PWSfileV3.cpp
			 */
			var hasher = CryptoJS.algo.SHA256.create();
			hasher.update(password);
			hasher.update(this._salt);
			for(var i=0; i<this._iter; ++i){
				var hash = hasher.finalize();
				hasher.reset();
				hasher.update(hash);
			}
			return hasher.finalize();
		},
		
		_parse: function(s){
			/**
			 * @return warnings
			 */
			if(!s){
				throw new Error('PWS store wasn\'t defined.');
			}
			var warnings = [];
			s = Crypto.fromString(s);
			_.extend(s, CryptoJS.lib.WordStack);
			try{
				/* "TAG" check. */
				var tag = s.shiftWordArray(Store._TAG_LENGTH / 4);
				if('PWS3' !== CryptoJS.enc.Latin1.stringify(tag)){
					throw new Error('Incorrect "TAG".');
				}
				this._salt = s.shiftWordArray(Store._SALT_LENGTH / 4);
				this._iter = s.shiftNumber();
				if(this._iter < Store._ITER_MIN){
					throw new TooFewIterationsError();
				}
				this._stretchedKeyHash = s.shiftWordArray(Store._SALT_LENGTH / 4);
				this._b1b2 = s.shiftWordArray(Store._ENCRYPTION_BLOCK_LENGTH / 4 * 2);
				this._b3b4 = s.shiftWordArray(Store._ENCRYPTION_BLOCK_LENGTH / 4 * 2);
				this._iv = s.shiftWordArray(Store._ENCRYPTION_BLOCK_LENGTH / 4);
				this._ciphertext = Store._shiftCiphertext(s);
				this._hmacValue = s.shiftWordArray(Store._SALT_LENGTH / 4);
			}catch(e){
				if(e instanceof CryptoJS.lib.WordStack.IndexError){
					throw new Error('PWS store string was finished unexpectedly.');
				}else{
					throw e;
				}
			}
		},

		_readHeader: function(){
			/**
			 * @see ReadHeader at PWSfileV3.cpp
			 */
			_.extend(this._plaintext, CryptoJS.lib.WordStack);
			this.emptyGroups = [];
			this.unknownFields = [];
			fieldsReading:
			while(true){
				var field = this._readField();
				switch(field.type){
				case Store._HEADER_FIELDS_TYPES.VERSION: // TODO: Test beta version format.
					if(2 != field.data.sigBytes && 4 != field.data.sigBytes){
						throw new VersionError('Incorrect version field length.');
					}
					this.version = {};
					_.extend(field.data, CryptoJS.lib.WordStack);
					this.version.minor = field.data.shiftByte();
					this.version.major = field.data.shiftByte();
					if(Store._VERSION.major != this.version.major){
						throw new VersionError();
					}
					break;
				case Store._HEADER_FIELDS_TYPES.UUID:
					this.uuid = Store._getUuid(field.data);
					break;
				case Store._HEADER_FIELDS_TYPES.NON_DEFAULT_PREFERENCES:
					this.preferences = Store._getText(field.data);
					break;
				case Store._HEADER_FIELDS_TYPES.TREE_DISPLAY_STATUS: // TODO: Test this.
					this.treeDisplayStatus = _.map(Store._getText(field.data), function(c){
						return '1' === c;
					});
					break;
				case Store._HEADER_FIELDS_TYPES.TIMESTAMP_OF_LAST_SAVE:
					this.lastSave = Store._getTime(field.data);
					break;
				case Store._HEADER_FIELDS_TYPES.WHAT_PERFORMED_LAST_SAVE:
					this.whatPerformedLastSave = Store._getText(field.data);
					break;
				case Store._HEADER_FIELDS_TYPES.LAST_SAVED_BY_USER:
					this.lastSavedByUser = Store._getText(field.data);
					break;
				case Store._HEADER_FIELDS_TYPES.LAST_SAVED_ON_HOST:
					this.lastSavedOnHost = Store._getText(field.data);
					break;
				case Store._HEADER_FIELDS_TYPES.DATABASE_NAME: // TODO: Test this.
					this.databaseName = Store._getText(field.data);
					break;
				case Store._HEADER_FIELDS_TYPES.DATABASE_DESCRIPTION: // TODO: Test this.
					this.databaseDescription = Store._getText(field.data);
					break;
				case Store._HEADER_FIELDS_TYPES.RECENTLY_USED_ENTRIES: // TODO: Test this.
					var data = Store._getText(field.data);
					var count = CryptoJS.enc.Hex.parse(data.substr(0, 2));
					_.extend(count, CryptoJS.lib.WordStack);
					count = count.shiftByte();
					if(data.length !== 2 + count * Store._UUID_LENGTH){
						break;
					}
					this.recentlyUsedEntries = [];
					for(var i=2; i<data.length; i+=Store._UUID_LENGTH){
						this.recentlyUsedEntries.push(data.substr(i, Store._UUID_LENGTH));
					}
					break;
				case Store._HEADER_FIELDS_TYPES.NAMED_PASSWORD_POLICIES:
					/*
						Very sad situation here: this field code was also assigned to YUBI_SK in 3.27Y. Here we try to infer the actual type
						based on the actual value stored in the field. Specifically, YUBI_SK is YUBI_SK_LEN bytes of binary data, whereas HDR_PSWDPOLICIES
						is of varying length, starting with at least 4 hex digits.
					*/
					var data = field.data.clone();
					_.extend(data, CryptoJS.lib.WordStack);
					data = Store._getText(data.shiftWordArray(1));
					_.extend(field.data, CryptoJS.lib.WordStack);
					if(field.data.sigBytes !== Store._YUBI_SK_LENGTH || !Store._HEX_REGEX.test(data)){
						var count = field.data.shiftNumberHex(2);
						this.namedPasswordPolicies = [];
						try{
							for(var i=0; i<count; ++i){
								this.namedPasswordPolicies.push(Store._getPasswordPolicy(field.data, true));
							}
						}catch(e){
							if(e instanceof CryptoJS.lib.WordStack.IndexError){
								break;
							}else{
								throw e;
							}
						}
					}else{ // TODO: Test this.
						this.yubiSk = field.data.readBytes(Store._YUBI_SK_LENGTH);
					}
					break;
				case Store._HEADER_FIELDS_TYPES.EMPTY_GROUPS:
					this.emptyGroups.push(Store._getText(field.data))
					break;
				case Store._HEADER_FIELDS_TYPES.END_OF_ENTRY:
					break fieldsReading;
				case Store._HEADER_FIELDS_TYPES.WHO_PERFORMED_LAST_SAVE:
					break;
				default:
					this.unknownFields.push(field);
					break;
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
			var record = {};
			while(this._plaintext.sigBytes > 0){
				var field = this._readField();
				switch(field.type){
				case Store._RECORDS_FIELDS_TYPES.UUID:
					record.uuid = Store._getUuid(field.data);
					break;
				case Store._RECORDS_FIELDS_TYPES.GROUP:
					record.group = Store._getText(field.data);
					break;
				case Store._RECORDS_FIELDS_TYPES.TITLE:
					record.title = Store._getText(field.data);
					break;
				case Store._RECORDS_FIELDS_TYPES.USERNAME:
					record.username = Store._getText(field.data);
					break;
				case Store._RECORDS_FIELDS_TYPES.NOTES:
					record.notes = Store._getText(field.data);
					break;
				case Store._RECORDS_FIELDS_TYPES.PASSWORD:
					record.password = Store._getText(field.data);
					break;
				case Store._RECORDS_FIELDS_TYPES.CREATION_TIME:
					record.creationTime = Store._getTime(field.data);
					break;
				case Store._RECORDS_FIELDS_TYPES.PASSWORD_MODIFICATION_TIME:
					record.passwordModificationTime = Store._getTime(field.data);
					break;
				case Store._RECORDS_FIELDS_TYPES.LAST_ACCESS_TIME:
					record.lastAccessTime = Store._getTime(field.data);
					break;
				case Store._RECORDS_FIELDS_TYPES.PASSWORD_EXPIRY_TIME:
					record.passwordExpiryTime = Store._getTime(field.data);
					break;
				case Store._RECORDS_FIELDS_TYPES.LAST_MODIFICATION_TIME:
					record.lastModificationTime = Store._getTime(field.data);
					break;
				case Store._RECORDS_FIELDS_TYPES.URL:
					record.url = Store._getText(field.data);
					break;
				case Store._RECORDS_FIELDS_TYPES.AUTOTYPE:
					record.autotype = Store._getText(field.data);
					break;
				case Store._RECORDS_FIELDS_TYPES.PASSWORD_HISTORY:
					_.extend(field.data, CryptoJS.lib.WordStack);
					record.passwordHistory = {
						on: '1'.charCodeAt(0) === field.data.shiftByte()
					};
					record.passwordHistory.maxSize = field.data.shiftNumberHex(2);
					var length = field.data.shiftNumberHex(2);
					var items = record.passwordHistory.items = [];
					for(var i=0; i<length; ++i){
						var item = {
							time: new Date(field.data.shiftNumberHex(8) * 1000)
						};
						item.password = Store._getText(field.data.shiftBytes(field.data.shiftNumberHex(4)));
						items.push(item);
					}
					break;
				case Store._RECORDS_FIELDS_TYPES.PASSWORD_POLICY:
					_.extend(field.data, CryptoJS.lib.WordStack);
					record.passwordPolicy = Store._getPasswordPolicy(field.data);
					break;
				case Store._RECORDS_FIELDS_TYPES.PASSWORD_EXPIRY_INTERVAL:
					_.extend(field.data, CryptoJS.lib.WordStack);
					record.passwordExpiryInterval = field.data.shiftNumber();
					break;
				case Store._RECORDS_FIELDS_TYPES.RUN_COMMAND:
					record.runCommand = Store._getText(field.data);
					break;
				case Store._RECORDS_FIELDS_TYPES.DOUBLE_CLICK_ACTION:

					break;
				case Store._RECORDS_FIELDS_TYPES.EMAIL:
					record.email = Store._getText(field.data);
					break;
				case Store._RECORDS_FIELDS_TYPES.PROTECTED_ENTRY:

					break;
				case Store._RECORDS_FIELDS_TYPES.OWN_SYMBOLS_FOR_PASSWORD:
					record.ownSymbolsForPassword = Store._getText(field.data);
					break;
				case Store._RECORDS_FIELDS_TYPES.SHIFT_DOUBLE_CLICK_ACTION:

					break;
				case Store._RECORDS_FIELDS_TYPES.PASSWORD_POLICY_NAME:
					record.passwordPolicyName = Store._getText(field.data);
					break;
				case Store._RECORDS_FIELDS_TYPES.ENTRY_KEYBOARD_SHORTCUT:

					break;
				case Store._RECORDS_FIELDS_TYPES.END_OF_ENTRY:
					this.records.push(record);
					record = {};
					break;
				case Store._RECORDS_FIELDS_TYPES.RESERVED:
					break;
				default:
					record.unknownFields || (record.unknownFields = []);
					record.unknownFields.push(field);
					break;
				}
			}
		}
	});
})();
