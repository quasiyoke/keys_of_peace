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
		if(_.isString(message)){
			this.message = message;
		}else{
			this.message = 'This website doesn\'t supports storages of version ' + KeysOfPeace.getVersionString(message);
		}
	}
	VersionError.prototype = new Error();
	
	
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
		_HEADER_FIELDS: {},
		_HEADER_FIELDS_CODES: {},
		_RECORDS_FIELDS: {},
		_RECORDS_FIELDS_CODES: {},
		_HEX_REGEX: /^[abcdef\d]+$/i,
		_PASSWORD_POLICY_USE_LOWERCASE: 0x8000,
		_PASSWORD_POLICY_USE_UPPERCASE: 0x4000,
		_PASSWORD_POLICY_USE_DIGITS: 0x2000,
		_PASSWORD_POLICY_USE_SYMBOLS: 0x1000,
		_PASSWORD_POLICY_USE_HEX_DIGITS: 0x0800,
		_PASSWORD_POLICY_USE_EASY_VISION: 0x0400,
		_PASSWORD_POLICY_MAKE_PRONOUNCEABLE: 0x0200,
		_UUID_LENGTH: 16,
		_VERSION: { major: 0x03, minor: 0x0d },
		_YUBI_SK_LENGTH: 20,
		
		_getVersionString: function(version){
			var minor = version.minor.toString();
			if(minor.length < 2){
				minor = '0' + minor;
			}
			return version.major + '.' + minor;
		},

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
			this.name = options.name;
			this.code = options.code;
			if(options.extendObject){
				this.extendObject = options.extendObject;
			}else{
				this.parse = options.parse;
			}
			options.serialize && (this.serialize = options.serialize);
		},

		extendObject: function(obj, wordStack){
			if(!this.parse){
				return;
			}
			var value = this.parse(wordStack);
			if(this === value){
				return this;
			}
			obj[this.name] = value;
		},

		serialize: function(){}
	});

	var HeaderField = Store._HeaderField = Field.extend({
		init: function(options){
			HeaderField.$super.init.apply(this, arguments);
			Store._HEADER_FIELDS_CODES[options.code] = this;
			Store._HEADER_FIELDS[options.name] = this;
		}
	});

	HeaderField.create({
		name: 'version',
		code: 0x00,
		parse: function(wordStack){ // TODO: Test beta version format.
			if(2 != wordStack.sigBytes && 4 != wordStack.sigBytes){
				throw new VersionError('Incorrect version field length.');
			}
			var value = {
				minor: wordStack.shiftByte(),
				major: wordStack.shiftByte()
			};
			if(Store._VERSION.major != value.major){
				throw new VersionError();
			}
			return value;
		},
		serialize: function(value){
			var data = CryptoJS.lib.WordStack.create();
			data.pushByte(value.minor);
			data.pushByte(value.major);
			return data;
		}
	});

	HeaderField.create({
		name: 'uuid',
		code: 0x01,
		parse: function(wordStack){
			return Store._parseUuid(wordStack);
		},
		serialize: function(value){
			return Store._serializeUuid(value);
		}
	});

	HeaderField.create({
		name: 'preferences',
		code: 0x02,
		parse: function(wordStack){
			return Store._parseText(wordStack);
		},
		serialize: function(value){
			return Store._serializeText(value);
		}
	});
	
	HeaderField.create({
		name: 'treeDisplayStatus',
		code: 0x03,
		parse: function(wordStack){ // TODO: Test this.
			return _.map(Store._parseText(wordStack), function(c){
				return '1' === c;
			});
		},
		serialize: function(value){
			if(!value){
				return;
			}
			value = _.map(value, function(expanded){
				return expanded ? '1' : '0';
			});
			return Store._serializeText(value.join(''));
		}
	});

	HeaderField.create({
		name: 'lastSave',
		code: 0x04,
		parse: function(wordStack){
			return Store._parseTime(wordStack);
		},
		serialize: function(value){
			return Store._serializeTime(value);
		}
	});

	HeaderField.create({ code: 0x05 }); // Who performed last save. Should be ignored.
	
	HeaderField.create({
		name: 'whatPerformedLastSave',
		code: 0x06,
		parse: function(wordStack){
			return Store._parseText(wordStack);
		},
		serialize: function(value){
			return Store._serializeText(value);
		}
	});
	
	HeaderField.create({
		name: 'lastSavedByUser',
		code: 0x07,
		parse: function(wordStack){
			return Store._parseText(wordStack);
		},
		serialize: function(value){
			return Store._serializeText(value);
		}
	});
	
	HeaderField.create({
		name: 'lastSavedOnHost',
		code: 0x08,
		parse: function(wordStack){
			return Store._parseText(wordStack);
		},
		serialize: function(value){
			return Store._serializeText(value);
		}
	});

	HeaderField.create({
		name: 'databaseName',
		code: 0x09,
		parse: function(wordStack){ // TODO: Test this.
			return Store._parseText(wordStack);
		},
		serialize: function(value){
			if(!value){
				return;
			}
			return Store._serializeText(value);
		}
	});

	HeaderField.create({
		name: 'databaseDescription',
		code: 0x0a,
		parse: function(wordStack){ // TODO: Test this.
			return Store._parseText(wordStack);
		},
		serialize: function(value){
			if(!value){
				return;
			}
			return Store._serializeText(value);
		}
	});
	
	HeaderField.create({
		name: 'recentlyUsedEntries',
		code: 0x0f,
		parse: function(wordStack){ // TODO: Test this.
			var data = Store._parseText(wordStack);
			var count = CryptoJS.enc.Hex.parse(data.substr(0, 2));
			_.extend(count, CryptoJS.lib.WordStack);
			count = count.shiftByte();
			if(data.length !== 2 + count * Store._UUID_LENGTH){
				return;
			}
			var value = [];
			for(var i=2; i<data.length; i+=Store._UUID_LENGTH){
				value.push(data.substr(i, Store._UUID_LENGTH));
			}
			return value;
		},
		serialize: function(value){
			if(!value || !value.length){
				return;
			}
			var data = CryptoJS.lib.WordStack.create();
			if(value.length > 0xff){
				value = value.slice(0, 0xff); // TODO: Check slicing.
			}
			data.pushNumberHex(value.length, 2);
			_.each(value, function(uuid){
				data.pushBytes(Store._serializeUuid(uuid), 2);
			});
			return data;
		}
	});
	
	HeaderField.create({
		name: 'namedPasswordPolicies',
		code: 0x10,
		extendObject: function(store, wordStack){
			/*
				Very sad situation here: this field code was also assigned to YUBI_SK in 3.27Y. Here we try to infer the actual type based on the actual value
				stored in the field. Specifically, YUBI_SK is Store._YUBI_SK_LENGTH bytes of binary data, whereas NAMED_PASSWORD_POLICIES is of varying length,
				starting with at least 4 hex digits.
				@see ReadHeader at PWSfileV3.cpp
			*/
			var data = wordStack.clone();
			data = Store._parseText(data.shiftWords(1));
			if(wordStack.sigBytes !== Store._YUBI_SK_LENGTH || Store._HEX_REGEX.test(data)){
				var count = wordStack.shiftNumberHex(2);
				store.namedPasswordPolicies = [];
				try{
					for(var i=0; i<count; ++i){
						store.namedPasswordPolicies.push(Store._parsePasswordPolicy(wordStack, true));
					}
				}catch(e){
					if(e instanceof CryptoJS.lib.WordStack.IndexError){
						return;
					}else{
						throw e;
					}
				}
			}else{ // TODO: Test this.
				store.yubiSk = wordStack.readBytes(Store._YUBI_SK_LENGTH);
			}
		},
		serialize: function(value){
			if(!value || !value.length){
				return;
			}
			if(value.length > 0xff){
				value = value.slice(0, 0xff); // TODO: Check slicing.
			}
			var data = CryptoJS.lib.WordStack.create();
			data.pushNumberHex(value.length, 2);
			_.each(value, function(policy){
				data.pushBytes(Store._serializePasswordPolicy(policy, true));
			});
			return data;
		}
	});
	
	HeaderField.create({
		name: 'emptyGroups',
		code: 0x11,
		extendObject: function(store, wordStack){
			store.emptyGroups || (store.emptyGroups = []);
			store.emptyGroups.push(Store._parseText(wordStack));
		},
		serialize: function(value){
			return _.map(value, function(group){
				return Store._serializeText(group);
			});
		}
	});
	
	HeaderField.create({
		name: 'yubiSk',
		code: 0x12,
		parse: function(wordStack){ // TODO: Test this.
			return wordStack;
		},
		serialize: function(value){ // TODO: Test this.
			return value;
		}
	});
	
	HeaderField.create({
		name: 'endOfEntry',
		code: 0xff,
		parse: function(){
			return this; // This means that header definition was finished. Start records parsing.
		}
	})

	var RecordField = Store._RecordField = Field.extend({
		init: function(options){
			RecordField.$super.init.apply(this, arguments);
			Store._RECORDS_FIELDS_CODES[options.code] = this;
			Store._RECORDS_FIELDS[options.name] = this;
		}
	});

	RecordField.create({
		name: 'uuid',
		code: 0x01,
		parse: function(wordStack){
			return Store._parseUuid(wordStack);
		},
		serialize: function(value){
			return Store._serializeUuid(value);
		}
	});

	RecordField.create({
		name: 'group',
		code: 0x02,
		parse: function(wordStack){
			return Store._parseText(wordStack);
		},
		serialize: function(value){
			return Store._serializeText(value);
		}
	});
	
	RecordField.create({
		name: 'title',
		code: 0x03,
		parse: function(wordStack){
			return Store._parseText(wordStack);
		},
		serialize: function(value){
			return Store._serializeText(value);
		}
	});
	
	RecordField.create({
		name: 'username',
		code: 0x04,
		parse: function(wordStack){
			return Store._parseText(wordStack);
		},
		serialize: function(value){
			return Store._serializeText(value);
		}
	});
	
	RecordField.create({
		name: 'notes',
		code: 0x05,
		parse: function(wordStack){
			return Store._parseText(wordStack);
		},
		serialize: function(value){
			return Store._serializeText(value);
		}
	});
	
	RecordField.create({
		name: 'password',
		code: 0x06,
		parse: function(wordStack){
			return Store._parseText(wordStack);
		},
		serialize: function(value){
			return Store._serializeText(value);
		}
	});
	
	RecordField.create({
		name: 'creationTime',
		code: 0x07,
		parse: function(wordStack){
			return Store._parseTime(wordStack);
		},
		serialize: function(value){
			if(!value){
				return;
			}
			return Store._serializeTime(value);
		}
	});

	RecordField.create({
		name: 'passwordModificationTime',
		code: 0x08,
		parse: function(wordStack){
			return Store._parseTime(wordStack);
		},
		serialize: function(value){
			if(!value){
				return;
			}
			return Store._serializeTime(value);
		}
	});
	
	RecordField.create({
		name: 'lastAccessTime',
		code: 0x09,
		parse: function(wordStack){
			return Store._parseTime(wordStack);
		},
		serialize: function(value){
			if(!value){
				return;
			}
			return Store._serializeTime(value);
		}
	});
	
	RecordField.create({
		name: 'passwordExpiryTime',
		code: 0x0a,
		parse: function(wordStack){
			return Store._parseTime(wordStack);
		},
		serialize: function(value){
			if(!value){
				return;
			}
			return Store._serializeTime(value);
		}
	});
	
	RecordField.create({ code: 0x0b }); // Reserved.
	
	RecordField.create({
		name: 'lastModificationTime',
		code: 0x0c,
		parse: function(wordStack){
			return Store._parseTime(wordStack);
		},
		serialize: function(value){
			if(!value){
				return;
			}
			return Store._serializeTime(value);
		}
	});
	
	RecordField.create({
		name: 'url',
		code: 0x0d,
		parse: function(wordStack){
			return Store._parseText(wordStack);
		},
		serialize: function(value){
			return Store._serializeText(value);
		}
	});
	
	RecordField.create({
		name: 'autotype',
		code: 0x0e,
		parse: function(wordStack){
			return Store._parseText(wordStack);
		},
		serialize: function(value){
			return Store._serializeText(value);
		}
	});
	
	RecordField.create({
		name: 'passwordHistory',
		code: 0x0f,
		parse: function(wordStack){
			var value = {
				on: '1'.charCodeAt(0) === wordStack.shiftByte()
			};
			value.maxSize = wordStack.shiftNumberHex(2);
			var length = wordStack.shiftNumberHex(2);
			var items = value.items = [];
			for(var i=0; i<length; ++i){
				var item = {
					time: new Date(wordStack.shiftNumberHex(8) * 1000)
				};
				item.password = Store._parseText(wordStack.shiftBytes(wordStack.shiftNumberHex(4)));
				items.push(item);
			}
			return value;
		},
		serialize: function(value){
			if(!value){
				return;
			}
			var data = CryptoJS.lib.WordStack.create();
			data.pushByte((value.on ? '1' : '0').charCodeAt(0));
			data.pushNumberHex(value.maxSize, 2);
			data.pushNumberHex(value.items.length, 2);
			_.each(value.items, function(item){
				data.pushNumberHex(item.time.getTime() / 1000, 8);
				data.pushNumberHex(item.password.length, 4);
				data.pushBytes(Store._serializeText(item.password));
			});
			return data;
		}
	});
	
	RecordField.create({
		name: 'passwordPolicy',
		code: 0x10,
		parse: function(wordStack){
			return Store._parsePasswordPolicy(wordStack);
		},
		serialize: function(value){
			if(!value){
				return;
			}
			return Store._serializePasswordPolicy(value);
		}
	});
	
	RecordField.create({
		name: 'passwordExpiryInterval',
		code: 0x11,
		parse: function(wordStack){
			return wordStack.shiftNumber();
		},
		serialize: function(value){
			if(!value){
				return;
			}
			var data = CryptoJS.lib.WordStack.create();
			data.pushNumber(value);
			return data;
		}
	});
	
	RecordField.create({
		name: 'runCommand',
		code: 0x12,
		parse: function(wordStack){
			return Store._parseText(wordStack);
		},
		serialize: function(value){
			if(!value){
				return;
			}
			return Store._serializeText(value);
		}
	});
	
	RecordField.create({
		name: 'doubleClickAction',
		code: 0x13,
		parse: function(wordStack){
			return wordStack.shiftShort();
		},
		serialize: function(value){
			if(undefined === value || 0xff === value){
				return;
			}
			var data = CryptoJS.lib.WordStack.create();
			data.pushShort(value);
			return data;
		}
	});
	
	RecordField.create({
		name: 'email',
		code: 0x14,
		parse: function(wordStack){
			return Store._parseText(wordStack);
		},
		serialize: function(value){
			if(!value){
				return;
			}
			return Store._serializeText(value);
		}
	});
	
	RecordField.create({
		name: 'protectedEntry',
		code: 0x15,
		parse: function(wordStack){ // TODO: Test this.
			return !!wordStack.shiftByte();
		},
		serialize: function(value){ // TODO: Test this.
			if(!value){
				return;
			}
			return Store._serializeText('1');
		}
	});

	RecordField.create({
		name: 'ownSymbolsForPassword',
		code: 0x16,
		parse: function(wordStack){
			return Store._parseText(wordStack);
		},
		serialize: function(value){
			if(!value){
				return;
			}
			return Store._serializeText(value);
		}
	});
	
	RecordField.create({
		name: 'shiftDoubleClickAction',
		code: 0x17,
		parse: function(wordStack){
			return wordStack.shiftShort();
		},
		serialize: function(value){
			if(undefined === value || 0xff === value){
				return;
			}
			var data = CryptoJS.lib.WordStack.create();
			data.pushShort(value);
			return data;
		}
	});
	
	RecordField.create({
		name: 'passwordPolicyName',
		code: 0x18,
		parse: function(wordStack){
			return Store._parseText(wordStack);
		},
		serialize: function(value){
			if(!value){
				return;
			}
			return Store._serializeText(value);
		}
	});
	
	RecordField.create({
		name: 'endOfEntry',
		code: 0xff,
		parse: function(wordStack){
			return this; // This means that record definition was finished. Begin next record.
		}
	});

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
			/**
			 * @throws PWS.Error If some mandatory record's fields weren't specified.
			 */
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

		_pushField: function(code, data){
			data || (data = CryptoJS.lib.WordArray.create());
			this._plaintext.pushNumber(data.sigBytes);
			this._plaintext.pushByte(code);
			this._plaintext.pushBytes(data);
			this._hmac.update(data);
			this._plaintext.pushBytes(CryptoJS.lib.WordArray.random((Store._ENCRYPTION_BLOCK_LENGTH - this._plaintext.sigBytes % Store._ENCRYPTION_BLOCK_LENGTH) % Store._ENCRYPTION_BLOCK_LENGTH)); // Fill the rest of the field with random bytes.
		},

		_pushHeader: function(){
			this.version = Store._VERSION;
			this.lastSave = new Date();
			this.whatPerformedLastSave = 'Keys of Peace V' + Store._getVersionString(KeysOfPeace.VERSION);
			delete this.lastSavedOnHost;
			var fieldHandler = Store._HEADER_FIELDS.version;
			this._pushField(fieldHandler.code, fieldHandler.serialize(this.version));
			var that = this;
			_.each(this, function(value, name){
				var fieldHandler = Store._HEADER_FIELDS[name];
				if(!fieldHandler){
					return;
				}
				var data = fieldHandler.serialize(value);
				if(!data){
					return;
				}
				if(_.isArray(data)){
					_.each(data, function(data){
						that._pushField(fieldHandler.code, data);
					});
				}else{
					that._pushField(fieldHandler.code, data);
				}
			});
			_.each(this.unknownFields, function(field){
				that._pushField(field.code, field.data);
			});
			fieldHandler = Store._HEADER_FIELDS.endOfEntry;
			this._pushField(fieldHandler.code, fieldHandler.serialize());
		},

		_pushRecords: function(){
			/**
			 * @throws PWS.Error If some mandatory fields weren't specified.
			 */
			var that = this;
			_.each(this.records, function(record){
				if(!record.uuid || !record.title || !record.password){
					throw new Error('Some mandatory record\'s field(s) weren\'t specified.');
				}
				var fieldHandler;
				_.each(record, function(value, name){
					fieldHandler = Store._RECORDS_FIELDS[name];
					if(!fieldHandler){
						return;
					}
					var data = fieldHandler.serialize(value);
					if(!data){
						return;
					}
					if(_.isArray(data)){
						_.each(data, function(data){
							that._pushField(field.code, data);
						});
					}else{
						that._pushField(fieldHandler.code, data);
					}
				});
				_.each(record.unknownFields, function(field){
					that._pushField(field.code, field.data);
				});
				fieldHandler = Store._RECORDS_FIELDS.endOfEntry;
				that._pushField(fieldHandler.code, fieldHandler.serialize());
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
				var fieldHandler = Store._HEADER_FIELDS_CODES[field.code];
				if(fieldHandler){
					_.extend(field.data, CryptoJS.lib.WordStack);
					if(fieldHandler.extendObject(this, field.data) === fieldHandler){
						break;
					}
				}else{
					this.unknownFields.push(field);
				}
			}
		},

		_shiftField: function(){
			var field = {};
			var length = this._plaintext.shiftNumber();
			field.code = this._plaintext.shiftByte();
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
					var fieldHandler = Store._RECORDS_FIELDS_CODES[field.code];
					if(fieldHandler){
						_.extend(field.data, CryptoJS.lib.WordStack);
						if(fieldHandler.extendObject(record, field.data) === fieldHandler){
							break;
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
