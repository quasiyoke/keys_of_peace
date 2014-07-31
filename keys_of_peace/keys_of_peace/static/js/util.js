(function () {
	'use strict';
	
	String.prototype.contains || (String.prototype.contains = function (s) {
		return this.indexOf(s) >= 0;
	});

	String.prototype.shorten = function(maxLength){
		maxLength = maxLength || 15;
		if(this.length <= maxLength){
			return this;
		}else{
			var length = Math.floor((maxLength - 1) / 2);
			return this.substr(0, maxLength - length - 1) + '…' + this.substr(this.length - length);
		}
	};
		
	_.merge($.fn.qtip.defaults, {
		position: {
			my: 'right center',
			at: 'left center'
		}
	});
})();
