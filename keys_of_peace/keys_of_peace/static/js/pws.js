'use strict';
(function(){
	window.PWS = {};
	
	
	var Error = PWS.Error = function(message){
		this.message = message;
	};

	
	var IncorrectPasswordError = PWS.IncorrectPasswordError = function(){};
	IncorrectPasswordError.prototype = new Error('Incorrect password.');

	
	var TooFewIterationsError = PWS.TooFewIterationsError = function(){};
	TooFewIterationsError.prototype = new Error('Storage has too small hashing iterations count for key stretching specified.');
	
	
	var Store = PWS.Store = function(s, password){
		/**
		 * Implements Password Safe store parsing.
		 *
		 * @param {string} s Base64-encoded Password Safe store string.
		 * @throws PWS.Error if storage format incorrect.
		 */
		this.parse(s);
		this.decrypt(password);
	};

	_.extend(Store, {
		ENCRYPTION_BLOCK_LENGTH: 128 / 8,
		TAG_LENGTH: 4,
		SALT_LENGTH: 256 / 8,
		ITER_LENGTH: 32 / 8,
		ITER_MIN: 2048,

		shiftCiphertext: function(s){
			var ciphertext = [];
			var block;
			try{
				while('PWS3-EOFPWS3-EOF' !== CryptoJS.enc.Latin1.stringify(block = s.shiftWordArray(Store.ENCRYPTION_BLOCK_LENGTH / 4))){
					Array.prototype.push.apply(ciphertext, block.words);
				}
			}catch(e){
				if(e instanceof CryptoJS.lib.WordStack.IndexError){
					throw new Error('EOF marker not found.');
				}else{
					throw e;
				}
			}
			return CryptoJS.lib.WordArray.create(ciphertext, ciphertext.length * 4);
		}
	});

	_.extend(Store.prototype, {
		checkStretchedKey: function(stretchedKey){
			var hasher = CryptoJS.algo.SHA256.create();
			if(this.stretchedKeyHash.toString() !== hasher.finalize(stretchedKey).toString()){
				throw new IncorrectPasswordError();
			}
		},
		
		decrypt: function(password){
			var stretchedKey = this.getStretchedKey(password);
			this.checkStretchedKey(stretchedKey);
		},

		getStretchedKey: function(password){
			/**
			 * @see StretchKey at PWSfileV3.cpp
			 */
			var hasher = CryptoJS.algo.SHA256.create();
			hasher.update(password);
			hasher.update(this.salt);
			for(var i=0; i<this.iter; ++i){
				var hash = hasher.finalize();
				hasher.reset();
				hasher.update(hash);
			}
			return hasher.finalize();
		},
		
		parse: function(s){
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
				this.salt = s.shiftWordArray(Store.SALT_LENGTH / 4);
				this.iter = s.shiftNumber(Store.ITER_LENGTH / 4);
				if(this.iter < Store.ITER_MIN){
					throw new TooFewIterationsError();
				}
				this.stretchedKeyHash = s.shiftWordArray(Store.SALT_LENGTH / 4);
				this.b1 = s.shiftWordArray(Store.ENCRYPTION_BLOCK_LENGTH / 4);
				this.b2 = s.shiftWordArray(Store.ENCRYPTION_BLOCK_LENGTH / 4);
				this.b3 = s.shiftWordArray(Store.ENCRYPTION_BLOCK_LENGTH / 4);
				this.b4 = s.shiftWordArray(Store.ENCRYPTION_BLOCK_LENGTH / 4);
				this.iv = s.shiftWordArray(Store.ENCRYPTION_BLOCK_LENGTH / 4);
				this.ciphertext = Store.shiftCiphertext(s);
				this.hmac = s.shiftWordArray(Store.SALT_LENGTH / 4);
			}catch(e){
				if(e instanceof CryptoJS.lib.WordStack.IndexError){
					throw new Error('PWS store string was finished unexpectedly.');
				}else{
					throw e;
				}
			}
		}
	});
})();
