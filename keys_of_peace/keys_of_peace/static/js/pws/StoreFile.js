/**
 * Implements Password Safe file structure.
 */

var CryptoJS = require('crypto-js/core');
var ECB = require('crypto-js/mode-ecb');
var HMAC = require('crypto-js/hmac');
var HmacError = require('./HmacError').HmacError;
var IncorrectPasswordError = require('./IncorrectPasswordError').IncorrectPasswordError;
var jBinary = require('jbinary');
var jDataView = require('jdataview');
var NoPadding = require('crypto-js/pad-nopadding');
var SHA256 = require('crypto-js/sha256');
var TwoFish = require('../twofish').TwoFish;
var WrongFormatError = require('./WrongFormatError').WrongFormatError;

var stretchedKeyGenerator;

function StoreFile(buffer, _stretchedKeyGenerator) {
	var file = new jBinary(buffer, this._TYPESET);
	stretchedKeyGenerator = _stretchedKeyGenerator;
	try {
		var context = file.readAll();
	} catch (e) {
		if (e instanceof TypeError && /^TypeError: Unexpected value/.test(e.toString())) {
			throw new WrongFormatError('Storage has no TAG at the beginning.');
		} else {
			throw e;
		}
	}
	this.fields = context.fields;
}

StoreFile.prototype._TYPESET = {
	'jBinary.all': 'PWS',
	'jBinary.littleEndian': true,

	Key: jBinary.Template({
		baseType: ['string', 256 / 8],

		read: function(context) {
			var b1b2 = CryptoJS.enc.Latin1.parse(this.baseRead());
			return TwoFish.decrypt({ ciphertext: b1b2 }, context._stretchedKey, { mode: ECB, padding: NoPadding });
		}
	}),

	PWS: ['object', {
		/**
		 * TAG is the sequence of 4 ASCII characters "PWS3". This is to serve as a
		 * quick way for the application to identify the database as a PasswordSafe
		 * version 3 file. This tag has no cryptographic value.
		 */
		_tag: ['const', ['string', 4], 'PWS3', true],

		/**
		 * SALT is a 256 bit random value, generated at file creation time.
		 */
		_salt: ['string', 256 / 8],

		/**
		 * ITER is the number of iterations on the hash function to calculate P',
		 * stored as a 32 bit little-endian value. This value is stored here in order
		 * to future-proof the file format against increases in processing power.
		 */
		_iter: 'uint32',

		/**
		 * P' is the "stretched key" generated from the user's passphrase and
		 * the SALT, with ITER iterations.
		 */
		_stretchedKey: jBinary.Type({
			read: function(context) {
				var stretchedKey = stretchedKeyGenerator.getStretchedKey(CryptoJS.enc.Latin1.parse(context._salt), context._iter);
				return stretchedKey;
			}
		}),

		/**
		 * H(P') is SHA-256(P'), and is used to verify that the user has the
		 * correct passphrase.
		 */
		_stretchedKeyHash: jBinary.Template({
			baseType: ['string', 256 / 8],

			read: function(context) {
				var stretchedKeyHash = CryptoJS.enc.Latin1.stringify(SHA256(context._stretchedKey));
				if (stretchedKeyHash !== this.baseRead()) {
					throw new IncorrectPasswordError();
				}
				return stretchedKeyHash;
			}
		}),

		/**
		 * B1 and B2 are two 128-bit blocks encrypted with Twofish [TWOFISH]
		 * using P' as the key, in ECB mode. These blocks contain the 256 bit
		 * random key K that is used to encrypt the actual records. (This has the
		 * property that there is no known or guessable information on the
		 * plaintext encrypted with the passphrase-derived key that allows an
		 * attacker to mount an attack that bypasses the key stretching
		 * algorithm.)
		 */
		_key: 'Key',

		/**
		 * B3 and B4 are two 128-bit blocks encrypted with Twofish using P' as the
		 * key, in ECB mode. These blocks contain the 256 bit random key L that is
		 * used to calculate the HMAC (keyed-hash message authentication code) of the
		 * encrypted data. See description of EOF field below for more details.
		 * Implementation Note: K and L must NOT be related.
		 */
		_hmacKey: 'Key',

		/**
		 * IV is the 128-bit random Initial Value for CBC mode.
		 */
		_iv: jBinary.Template({
			baseType: ['string', 128 / 8],

			read: function() {
				return CryptoJS.enc.Latin1.parse(this.baseRead());
			}
		}),

		/**
		 * All following records are encrypted using Twofish in CBC mode, with K
		 * as the encryption key.
		 */
		fields: jBinary.Type({
			blockType: ['string', 128 / 8],

			read: function(context) {
				var fields = [];
				var decryptor = CryptoJS.algo.TwoFish.createDecryptor(context._key, { iv: context._iv, mode: CryptoJS.mode.CBC, padding: NoPadding });
				var hmac = context._hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, context._hmacKey);
				var block;
				/*
				 * The ASCII characters "PWS3-EOFPWS3-EOF" (note that this is
				 * exactly one block long), unencrypted. This is an implementation convenience
				 * to inform the application that the following bytes are to be processed
				 * differently.
				 */
				while ((block = this.binary.read(this.blockType)) !== 'PWS3-EOFPWS3-EOF') {
					block = CryptoJS.enc.Latin1.parse(block);
					block = decryptor.finalize(block);
					block = CryptoJS.enc.Latin1.stringify(block);
					block = new jDataView(block, 0, undefined, true);
					var LENGTH = block.getUint32();
					var field = { code: block.getUint8() };
					if (LENGTH) {
						field.data = new jDataView(LENGTH, 0, undefined, true);
						var lengthRemains = LENGTH;
						var dataChunkSize = Math.min(lengthRemains, (128 - 32 - 8) / 8);
						var chunk = block.getString(dataChunkSize);
						field.data.writeString(chunk);
						while (dataChunkSize = Math.min(lengthRemains -= dataChunkSize, 128 / 8)) {
							block = this.binary.read(this.blockType);
							block = decryptor.finalize(CryptoJS.enc.Latin1.parse(block));
							block = CryptoJS.enc.Latin1.stringify(block);
							field.data.writeString(block.substring(0, dataChunkSize));
						}
					}
					hmac.update(CryptoJS.enc.Latin1.parse(field.data ? field.data.getString(undefined, 0) : ''));
					fields.push(field);
				}
				return fields;
			}
		}),

		/**
		 * The 256-bit keyed-hash MAC, as described in RFC2104, with SHA-
		 * 256 as the underlying hash function. The value is calculated over all of
		 * the plaintext fields, that is, over all the data stored in all fields
		 * (starting from the version number in the header, ending with the last field
		 * of the last record). The key L, as stored in B3 and B4, is used as the hash
		 * key value.
		 */
		_hmac: jBinary.Template({
			baseType: ['string', 256 / 8],

			read: function(context) {
				var current = context._hmac.finalize().toString();
				var expected = CryptoJS.enc.Latin1.parse(this.baseRead()).toString();
				if (current !== expected) {
					throw new HmacError(expected, current);
				}
				return current;
			}
		})
	}]
};

exports.StoreFile = StoreFile;
