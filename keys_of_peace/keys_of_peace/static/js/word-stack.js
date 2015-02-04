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

		pushByte: function(n){
			this._beginOffset || (this._beginOffset = 0);
			var offset = (this._beginOffset + this.sigBytes) % 4;
			var word = offset ? this.words.pop() : 0;
			word |= (n & 0xff) << (24 - offset * 8)
			this.words.push(word);
			++this.sigBytes;
		},

		pushBytes: function(wordArray){
			for(var i=0; i<wordArray.sigBytes/4; ++i){
				this.pushWord(wordArray.words[i]);
			}
			for(var i=24; i > 24 - (wordArray.sigBytes % 4) * 8; i-=8){
				this.pushByte((wordArray.words[wordArray.words.length - 1] >>> i) & 0xff);
			}
		},

		pushNumber: function(n){
			this.pushWord(switchEndianness(n));
		},

		pushWord: function(word){
			for(var i=24; i>=0; i-=8){
				this.pushByte((word >>> i) & 0xff);
			}
		},

		shiftWord: function(){
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
																																					
		shiftWords: function(lengthWords){
			/**
			 * Removes the first `lengthWords` words from stack.
			 *
			 * @param {number} lengthWords How much words should be removed.
			 * @return {WordArray} array of removed words.
			 */
			if(undefined === lengthWords){
				throw new WordStack.ValueError('`lengthWords` should be specified.');
			}
			return CryptoJS.lib.WordArray.create(_.map(_.range(lengthWords), _.bindKey(this, 'shiftWord')), lengthWords * 4);
		},

		shiftNumber: function(){
			var word = this.shiftWord();
			return switchEndianness(word);
		},

		shiftNumberHex: function(length){
			var hexStr = this.shiftBytes(length);
			hexStr = CryptoJS.enc.Utf8.stringify(hexStr);
			if(hexStr.length % 2){
				hexStr = '0' + hexStr;
			}
			var n = 0;
			for (var i = 0; i < hexStr.length; i += 2) {
				n |= parseInt(hexStr.substr(hexStr.length - i - 2, 2), 16) << (i / 2 * 8);
			}
			return n;
		}
	});
})();
