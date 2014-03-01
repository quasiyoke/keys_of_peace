(function () {
	'use strict';
	
	String.prototype.contains || (String.prototype.contains = function (s) {
		return this.indexOf(s) >= 0;
	});
		
	_.merge($.fn.qtip.defaults, {
		position: {
			my: 'right center',
			at: 'left center'
		}
	});
})();
