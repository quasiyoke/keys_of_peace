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
		events: {
			hide: function(e, api){
				var previousContent = api.get('content.previous');
				if(previousContent){
					api.set('content.text', previousContent);
				}
			},
			show: function(e, api){
				/**
					 "content.previous" option allows to show some tip only once.
					 @see clipboard.js
				 */
				api.set('content.previous', '');
			}
		},
		position: {
			my: 'right center',
			at: 'left center'
		}
	});
})();
