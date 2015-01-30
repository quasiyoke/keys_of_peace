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
		 * @throws PWS.Error if storage format incorrect.
		 */
		this._parse(s);
		this._decrypt(password);
		this._readHeader();
		this._readRecords();
		this._checkHMAC();
	};

	_.extend(Store, {
		ENCRYPTION_BLOCK_LENGTH: 128 / 8,
		TAG_LENGTH: 4,
		SALT_LENGTH: 256 / 8,
		ITER_MIN: 2048,
		_UUID_LENGTH: 16,
		VERSION: {
			major: 0x03,
			minor: 0x0d
		},

		HEADER_FIELDS_TYPES: {
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

		_shiftCiphertext: function(s){
			var ciphertext = [];
			var block;
			try{
				while('PWS3-EOFPWS3-EOF' !== CryptoJS.enc.Latin1.stringify(block = s.shiftWordArray(Store.ENCRYPTION_BLOCK_LENGTH / 4))){
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
				var tag = s.shiftWordArray(Store.TAG_LENGTH / 4);
				if('PWS3' !== CryptoJS.enc.Latin1.stringify(tag)){
					throw new Error('Incorrect "TAG".');
				}
				this._salt = s.shiftWordArray(Store.SALT_LENGTH / 4);
				this._iter = s.shiftNumber();
				if(this._iter < Store.ITER_MIN){
					throw new TooFewIterationsError();
				}
				this._stretchedKeyHash = s.shiftWordArray(Store.SALT_LENGTH / 4);
				this._b1b2 = s.shiftWordArray(Store.ENCRYPTION_BLOCK_LENGTH / 4 * 2);
				this._b3b4 = s.shiftWordArray(Store.ENCRYPTION_BLOCK_LENGTH / 4 * 2);
				this._iv = s.shiftWordArray(Store.ENCRYPTION_BLOCK_LENGTH / 4);
				this._ciphertext = Store._shiftCiphertext(s);
				this._hmacValue = s.shiftWordArray(Store.SALT_LENGTH / 4);
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
			this.header = [];
			fieldsReading:
			while(true){
				var field = this._readField();
				switch(field.type){
				case Store.HEADER_FIELDS_TYPES.VERSION:
					if(2 != field.data.sigBytes && 4 != field.data.sigBytes){
						throw new VersionError('Incorrect version field length.');
					}
					this.version = {};
					_.extend(field.data, CryptoJS.lib.WordStack);
					this.version.minor = field.data.shiftByte();
					this.version.major = field.data.shiftByte();
					if(Store.VERSION.major != this.version.major){
						throw new VersionError();
					}
					break;
				case Store.HEADER_FIELDS_TYPES.UUID:
					if(Store._UUID_LENGTH !== field.data.sigBytes){
						throw new Error('Incorrect header\'s UUID.');
					}
					this.uuid = field.data;
					break;
				case Store.HEADER_FIELDS_TYPES.END_OF_ENTRY:
					break fieldsReading;
				default:
					this.header.push(field);
					break;
				}
			}
		},

		_readField: function(){
			var field = {};
			var length = this._plaintext.shiftNumber();
			field.type = this._plaintext.shiftByte();
			field.data = this._plaintext.shiftBytes(length);
			this._plaintext.shiftBytes(this._plaintext.sigBytes % Store.ENCRYPTION_BLOCK_LENGTH);
			this._hmac.update(field.data);
			return field;
		},

		_readRecords: function(){
			this.records = [];
			var record = [];
			while(this._plaintext.sigBytes){
				var field = this._readField();
				if(Store.HEADER_FIELDS_TYPES.END_OF_ENTRY == field.type){
					this.records.push(record);
					continue;
				}
				record.push(field);
			}
		}
	});
})();
