'use strict';

(function(){
	function switchEndianness(word) {
    return ((word & 0xff) << 24) | ((word & 0xff00) << 8) | ((word & 0xff0000) >>> 8) | (word >>> 24);
  }
	
	var WordStack = CryptoJS.lib.WordStack = CryptoJS.lib.WordArray.extend({
		ValueError: function(message){
			this.message = message;
		},

		IndexError: function(message){
			this.message = message;
		},

		shift: function(){
			/**
			 * Removes the first word from stack.
			 *
			 * @return {number} removed word.
			 */
			this.sigBytes -= 4;
			if(this.sigBytes < 0){
				throw new WordStack.IndexError('Stack was finished unexpectedly.');
			}
			return this.words.shift();
		},

		shiftByte: function(){
			--this.sigBytes;
			if(this.sigBytes < 0){
				throw new WordStack.IndexError('Stack was finished unexpectedly.');
			}
			this._beginOffset || (this._beginOffset = 0);
			var n = (this.words[0] >>> (24 - this._beginOffset * 8)) & 0xff;
			++this._beginOffset;
			if(4 === this._beginOffset){
				this.words.shift();
				this._beginOffset = 0;
			}
			return n;
		},

		shiftBytes: function(length){
			var words = [];
			var word = 0;
			var shift, i;
			for(i=0, shift=24; i<length; ++i, shift-=8){
				if(shift < 0){
					shift = 24;
					words.push(word);
					word = 0;
				}
				word |= this.shiftByte() << shift;
			}
			if(shift < 24){
				words.push(word);
			}
			return CryptoJS.lib.WordArray.create(words, length);
		},
																																					
		shiftWordArray: function(lengthWords){
			/**
			 * Removes the first `lengthWords` words from stack.
			 *
			 * @param {number} lengthWords How much words should be removed.
			 * @return {WordArray} array of removed words.
			 */
			if(undefined === lengthWords){
				throw new WordStack.ValueError('`lengthWords` should be specified.');
			}
			return CryptoJS.lib.WordArray.create(_.map(_.range(lengthWords), _.bindKey(this, 'shift')), lengthWords * 4);
		},

		shiftNumber: function(){
			var word = this.shift();
			return switchEndianness(word);
		},

		shiftNumberHex: function(length){
			var n = this.shiftBytes(length);
			n = CryptoJS.enc.Utf8.stringify(n);
			n = CryptoJS.enc.Hex.parse(n);
			_.extend(count, CryptoJS.lib.WordStack);
			return count.shiftNumber();
		}
	});


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
			var alphabetBits = _.find(Crypto.ALPHABETS, function(alphabetItem){
				return alphabetKey == alphabetItem[0];
			})[1];
			alphabetBits = _.map(alphabetBits, function(bit){
				return _.toArray(Crypto.ALPHABETS_BITS[bit]);
			});
			var alphabet = Array.prototype.concat.apply([], alphabetBits);
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
				/* If there's only one bit, array always representative. Reduces problems with intersection of `hex` and `latin` and `Digits` bits. */
				if(1 === alphabetBits.length){
					return true;
				}
				return Crypto.getRepresentedAlphabetsBits(a).length == Math.min(alphabetBits.length, length);
			}
		},

		getAlphabet: function(a){
			if(!a){
				return;
			}
			var retval;
			var bits = Crypto.getRepresentedAlphabetsBits(a);
			if(bits && bits.length){
				for(var i=Crypto.ALPHABETS.length; i--;){
					var alphabetBits = Crypto.ALPHABETS[i][1];
					if(!_.difference(bits, alphabetBits).length){
						retval = Crypto.ALPHABETS[i][0];
						break;
					}
				}
			}
			if((!retval || 500 === retval /* latin + Digits */) && !_.difference(a.split(''), Crypto.ALPHABETS_BITS['hex'].split('')).length){
				retval = 200; // hex
			}
			return retval;
		},

		getRepresentedAlphabetsBits: function(a){
			if(_.isString(a)){
				a = a.split('');
			}
			var bits = _.map(Crypto.ALPHABETS_BITS, function(bit, key){
				return {
					key: key,
					represented: false,
					contains: function(c){
						return bit.indexOf(c) >= 0;
					}
				};
			});
			/* Won't observe `hex` bit. */
			bits = _.filter(bits, function(bit){
				return 'hex' !== bit.key;
			});
			for(var i=a.length; i--;){
				var j = bits.length;
				for(;j--;){
					if(bits[j].contains(a[i])){
						bits[j].represented = true;
						break;
					}
				}
				/* If char wasn't found in any bit, we can't return represented bits list. */
				if(j < 0){
					return;
				}
			}
			return _(bits)
				.filter(function(bit){
					return bit.represented;
				})
				.map(function(bit){
					return bit.key;
				})
				.value()
			;
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

	_.extend(Crypto, CONFIGURATION.CRYPTO);
})();
