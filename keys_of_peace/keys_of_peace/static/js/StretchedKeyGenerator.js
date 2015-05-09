define('StretchedKeyGenerator', [
  'crypto-js',
  'crypto-js/sha256',
  'TooFewIterationsError',
  'IncorrectSaltError'
], function(
  CryptoJS,
  SHA256,
  TooFewIterationsError,
  IncorrectSaltError
) {
  function StretchedKeyGenerator(key) {
		var hasher = CryptoJS.algo.SHA256.create();
		var ITER_MIN = 2048;
		var SALT_LENGTH = 256 / 8;

		this.getStretchedKey = function(salt, iter) {
			/**
			 * @see StretchKey at PWSfileV3.cpp
			 */
			if (isNaN(iter) || iter < ITER_MIN) {
				throw new TooFewIterationsError();
			}
			if (salt.sigBytes !== SALT_LENGTH) {
				throw new IncorrectSaltError();
			}
			hasher.update(key);
			hasher.update(salt);
			for (var i=0; i<iter; ++i) {
				var hash = hasher.finalize();
				hasher.reset();
				hasher.update(hash);
			}
			var hash = hasher.finalize();
			hasher.reset();
			return hash;
		};
	};

  return StretchedKeyGenerator;
});
