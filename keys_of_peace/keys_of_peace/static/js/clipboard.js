(function($){
	var clip = new ZeroClipboard(undefined, {
		forceHandCursor: true,
		moviePath: '/static/swf/ZeroClipboard.swf'
	});
	
	clip.on('mouseover', function(client, e){
		$(this).trigger('mouseover', e);
	});
	
	clip.on('mouseout', function(client, e){
		$(this).trigger('mouseout', e);
	});
	
	clip.on('mousedown', function(client, e){
		$(this).trigger('mousedown', e);
	});
	
	clip.on('mouseup', function(client, e){
		$(this).trigger('mouseup', e);
	});

	clip.on('dataRequested', function(client, e){
		clip.setText($(this).clipboard('getData'));
	});
	

	$.widget('keysOfPeace.clipboard', {
		options: {
			hoverClass: 'clipboard-hover',
			activeClass: 'clipboard-active'
		},
		
		_create: function(){
			clip.glue(this.element);
			this._delegateEvents();
			var element = this.element;
			if(element.is(':keysofpeace-password')){
				element = element.parent();
			}
			element.qtip({
				content: 'Copy',
				position: {
					my: 'left center',
					at: 'right center',
					of: this.element
				}
			});
		},

		_delegateEvents: function(){
			this._on({
				mouseover: '_mouseover',
				mouseout: '_mouseout',
				mousedown: '_mousedown',
				mouseup: '_mouseup'
			});
		},

		_mouseover: function(){
			var element = this.element;
			if(element.is(':keysofpeace-password')){
				element = element.parent();
			}
			element.addClass(this.options.hoverClass);
		},

		_mouseout: function(){
			var element = this.element;
			if(element.is(':keysofpeace-password')){
				element = element.parent();
			}
			element.removeClass(this.options.hoverClass);
		},

		_mousedown: function(){
			var element = this.element;
			if(element.is(':keysofpeace-password')){
				element = element.parent();
			}
			element.addClass(this.options.activeClass);
		},

		_mouseup: function(){
			var element = this.element;
			if(element.is(':keysofpeace-password')){
				element = element.parent();
			}
			element.removeClass(this.options.activeClass);
		},

		getData: function(){
			if(this.element.is(':keysofpeace-password')){
				return this.element.password('value');
			}else{
				return this.element.html();
			}
		}
	});
})(jQuery);
