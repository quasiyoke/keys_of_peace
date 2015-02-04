'use strict';

(function(){
	var KeysOfPeace = window.KeysOfPeace = {
		SALT_LENGTH: 256 / 8
	};


	var StretchedKeyGenerator = KeysOfPeace.StretchedKeyGenerator = function(key){
		var hasher = CryptoJS.algo.SHA256.create();
		var ITER_MIN = 2048;
		var SALT_LENGTH = KeysOfPeace.SALT_LENGTH;
		
		this.getStretchedKey = function(salt, iter){
			/**
			 * @see StretchKey at PWSfileV3.cpp
			 */
			if(isNaN(iter) || iter < ITER_MIN){
				throw new TooFewIterationsError();
			}
			if(salt.sigBytes !== SALT_LENGTH){
				throw new IncorrectSaltError();
			}
			hasher.update(key);
			hasher.update(salt);
			for(var i=0; i<iter; ++i){
				var hash = hasher.finalize();
				hasher.reset();
				hasher.update(hash);
			}
			var hash = hasher.finalize();
			hasher.reset();
			return hash;
		};
	};

	
	var Error = KeysOfPeace.Error = function(message){
		this._message = message;
	};
	
	var IncorrectSaltError = KeysOfPeace.IncorrectSaltError = function(){};
	IncorrectSaltError.prototype = new Error('Incorrect salt for key stretching was specified.');
	
	var TooFewIterationsError = KeysOfPeace.TooFewIterationsError = function(){};
	TooFewIterationsError.prototype = new Error('Too small hashing iterations count for key stretching was specified.');
})();
