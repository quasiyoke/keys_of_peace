'use strict';
(function($){
	$.widget('passwPit.password', {
		options: {
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

			this._value = this.element.val();
			this.textInput = $('<input type="text">')
				.val(this._value)
				.insertAfter(this.element)
			;

			var commonHandlers = {
				keyup: '_change'
			};
			this._on(this.element, commonHandlers);
			this._on(this.textInput, commonHandlers);
			
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
				last = this.textInput;
				current = this.element;
			}else{
				last = this.element;
				current = this.textInput;
			}
			current
				.show()
				.val(this._value)
			;
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
				this.textInput.val(value);
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
