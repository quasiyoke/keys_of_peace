'use strict';
(function($){
	$.widget('keysOfPeace.password', {
		options: {
			class: null,
			mode: 'password',
			target: null
		},
		
		_create: function(){
			var target = this.options.target
			if(!target){
				target = this.element
					.wrap('<div>')
					.parent()
				;
			}
			this._on(target, {
				mouseenter: '_mouseenter',
				mouseleave: '_mouseleave'
			});

			if(this.element.is('input')){
				this._value = this.element.val();
				this.textElement = $('<input type="text">')
					.val(this._value)
				;
			}else{
				this._value = this.element.html();
				this.element.html(this._value.replace(/./g, '•'));
				this.textElement = $('<span>')
					.html(this._value)
				;
			}
			this.element
				.after(this.textElement)
			;
			if(this.options.class){
				this.element.addClass(this.options.class);
				this.textElement.addClass(this.options.class);
			}

			var commonHandlers = {
				keyup: '_change'
			};
			this._on(this.element, commonHandlers);
			this._on(this.textElement, commonHandlers);
			
			this._setMode();
		},

		_mouseenter: function(){
			this._setOption('mode', 'text');
		},

		_mouseleave: function(){
			this._setOption('mode', 'password');
		},

		_change: function(e){
			this._value = $(e.target).val();
			this._trigger('change', e, {
				value: this._value
			});
		},

		_setOption: function(key, value){
			this._super(key, value);
			if('mode' === key){
				this._setMode();
			}
		},

		_setMode: function(){
			var last;
			var current;
			if('password' === this.options.mode){
				last = this.textElement;
				current = this.element;
			}else{
				last = this.element;
				current = this.textElement;
			}
			current.show();
			if(last.is(':focus')){
				current.caret(last.caret());
			}
			last.hide();
		},

		value: function(value, silent){
			if(undefined === value){
				return this._value;
			}else{
				this.element.val(value);
				this.textElement.val(value);
				this._value = value;
				if(!silent){
					this._trigger('change', {}, {
						value: value
					});
				}
			}
			return this;
		}
	});
})(jQuery);
