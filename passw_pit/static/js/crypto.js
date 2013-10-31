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
	  var crypto = Crypto;
	  var alphabetBits = Crypto.ALPHABETS[alphabetKey];
	  alphabetBits = _(alphabetBits).map(function(bit){
		return Crypto.ALPHABETS_BITS[bit].toArray();
	  });
	  var retval;
	  var ca = _.union.apply(undefined, alphabetBits); // Combined alphabet.
	  do{
		retval = [];
		for(var i=0; i<length; i++){
		  retval.push(randomChoice(ca));
		}
	  }while(!isStringRepresentative());
	  retval = retval.join('');
	  return retval;

	  /* Password should contain all provided alphabet bits (if its length allows). */
	  function isStringRepresentative(){
		var bf = 0; // Bits found.
		var _retval = _(retval);
		for(var i=0; i<alphabetBits.length; i++){
		  if(_retval.intersection(alphabetBits[i]).length){
			bf++;
		  }
		}
		return bf == Math.min(alphabetBits.length, length);
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
