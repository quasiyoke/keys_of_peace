'use strict';

(function(CryptoJS){


  var Encoder = CryptoJS.enc.Base64;

  
  var Formatter = {
		stringify: function(cipherParams){
			return cipherParams
				.salt
				.clone()
				.concat(cipherParams.ciphertext)
				.toString(Encoder)
			;
		},

		parse: function(str){
			var ciphertext = Encoder.parse(str);
			
			var salt = CryptoJS.lib.WordArray.create(
				ciphertext
					.words
					.slice(0, Crypto.SALT_BITS_COUNT / 32)
			);
			
			ciphertext.words.splice(0, Crypto.SALT_BITS_COUNT / 32);
			ciphertext.sigBytes -= Crypto.SALT_BITS_COUNT / 8;
			
			return CryptoJS.lib.CipherParams.create({
				ciphertext: ciphertext,
				salt: salt
			});
		}
		
  };


  var KDF = {	
		compute: function(password, keySize, ivSize, salt){
			salt || (salt = Crypto.getSalt());
			
			var key = Crypto.hash(
				password,
				salt,
				{
					keySize: keySize + ivSize
				}
			);
			
			var iv = CryptoJS.lib.WordArray.create(
				key.words.slice(keySize),
				ivSize * 4
			);
			key.sigBytes = keySize * 4;
			
			return CryptoJS.lib.CipherParams.create({
				iv: iv,
				key: key,
				salt: salt
			});
		}

  };
  
  
  var Crypto = window.Crypto = {
		_getCipher: function(){
			var cipher = Crypto._cipher;
			if(!cipher){
				cipher = CryptoJS.lib.PasswordBasedCipher;
				cipher = cipher.extend({
					cfg: cipher.cfg.extend({
						format: Formatter,
						kdf: KDF
					})		  
				});
				Crypto._cipher = cipher;
			}
			return cipher;
		},

		decrypt: function(s, key){
			return CryptoJS.enc.Utf8.stringify(
				Crypto
					._getCipher()
					.decrypt(CryptoJS.algo.AES, s, key)
			);
		},

		encrypt: function(s, key){
			return Crypto
				._getCipher()
				.encrypt(CryptoJS.algo.AES, s, key)
				.toString()
			;
		},
		
		fromString: function(s){
			return Encoder.parse(s);
		},

		getPassword: function(length, alphabet){
			return Crypto.getRandomAlphabetString(length, alphabet);
		},
		
		getRandomAlphabetString: function(length, alphabetKey){
			var alphabetBits = Crypto.ALPHABETS[alphabetKey];
			alphabetBits = _.map(alphabetBits, function(bit){
				return _.toArray(Crypto.ALPHABETS_BITS[bit]);
			});
			var alphabet = Array.concat.apply(null, alphabetBits);
			var retval;
			do{
				retval = [];
				for(var i=length; i--;){
					retval.push(randomChoice(alphabet));
				}
			}while(!isArrayRepresentative(retval));
			retval = retval.join('');
			return retval;

			function randomChoice(a){
				var retval;
				retval = Math.floor(Math.random() * a.length);
				retval = a[retval];
				return retval;
			}

			/* Password should contain all provided alphabet bits (if its length allows). */
			function isArrayRepresentative(a){
				var representedBits = _.filter(alphabetBits, function(bit){
					return _.intersection(a, bit).length;
				});
				return representedBits.length == Math.min(alphabetBits.length, length);
			}
		},

		getSalt: function(){
			return CryptoJS.lib.WordArray.random(Crypto.SALT_BITS_COUNT / 8);
		},
		
		hash: function(passw, salt, cfg){
			var hash = CryptoJS.algo.PBKDF2
				.create(
					_.extend(
						{
							hasher: CryptoJS.algo.SHA256,
							iterations: Crypto.HASH_ITERATIONS_COUNT,
							keySize: Crypto.HASH_BITS_COUNT / 32		  
						},
						cfg
					)
				)
				.compute(passw, salt);
			hash.clamp();
			return hash;
		},

		toString: function(a){
			return a.toString(Encoder);
		}
		
  };
})(CryptoJS);
