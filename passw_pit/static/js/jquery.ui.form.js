'use strict';

(function($){
	$.widget('ui.form', {
		options: {
			focus: false,
			validation: {
				errorClass: 'error-field',
				highlight: function(el, errorClass){
					$(el).closest('form > p').addClass(errorClass);
				},
				unhighlight: function(el, errorClass){
					$(el).closest('form > p').removeClass(errorClass);
				}
			}
		},
		
		_create: function(){
			this._validate();
		},

		_validate: function(){
			this.element.validate(this.options.validation);
		},

		_init: function(){
			if(this.options.focus){
				this.element.find('input:visible:first').focus();
			}
		}
	});
})(jQuery);
