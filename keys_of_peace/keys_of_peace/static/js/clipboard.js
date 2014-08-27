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
		var data = $(this).clipboard('option', 'data');
		clip.setText(_.isFunction(data) ? data() : data);
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
			if(undefined === this.options.data){
				this.options.data = this.element.html();
			}
			if(undefined === this.options.tip){
				this.options.tip = 'Click to copy <strong>' + this.options.data + '</strong>';
			}
			element.qtip({
				content: this.options.tip,
				position: {
					my: 'left center',
					at: 'right center',
					of: this.element
				}
			});
		},

		_delegateEvents: function(){
			this._on({
				click: '_click',
				mouseover: '_mouseover',
				mouseout: '_mouseout',
				mousedown: '_mousedown',
				mouseup: '_mouseup'
			});
		},

		_click: function(e){
			e.preventDefault();
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
			element.qtip('option', 'content.previous', element.qtip('option', 'content.text'));
			element.qtip('option', 'content.text', 'Copied!');
		},

		_mouseup: function(){
			var element = this.element;
			if(element.is(':keysofpeace-password')){
				element = element.parent();
			}
			element.removeClass(this.options.activeClass);
		}
	});
})(jQuery);
