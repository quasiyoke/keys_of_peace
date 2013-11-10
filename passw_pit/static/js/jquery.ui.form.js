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
			this.options.validation.submitHandler = _.bind(this._submit, this);
			this.element.validate(this.options.validation);
		},

		_init: function(){
			if(this.options.focus){
				this.element.find('input:visible:first').focus();
			}
		},

		_submit: function(form){
			if(this.options.submit){
				var xhr = this.options.submit.call(this, form);
				if(xhr){
					xhr
						.always(_.bind(this._always, this))
						.done(_.bind(this._done, this))
						.fail(_.bind(this._fail, this))
					;
				}
				this.clearNotifications();
			}else{
				form.submit();
			}
		},

		_always: function(xhr){
			if(this.options.always){
				this.options.always.apply(this, arguments);
			}
		},

		_done: function(data){
			if(this.options.done){
				this.options.done.apply(this, arguments);
			}
		},

		_fail: function(xhr){
			var processed = false;
			if(this.options.fail){
				processed = this.options.fail.apply(this, arguments);
			}
			if(!processed){
				if(!xhr.status){
					this.notify('Submit was failed. Check your internet connection.');
				}else if(500 === xhr.status){
					this.notify('Server error.');
				}else{
					this.notify('Unknown error.');
				}
			}
		},

		clearNotifications: function(){
			if(this.notifications){
				this.notifications.slideUp({
					duration: 'fast',
					complete: function(){
						this.remove();
					}
				});
				delete this.notifications;
			}
		},

		notify: function(message){
			if(this.notifications){
				var notification = $('<div class="form-notification">');
				this.notifications.append(notification);
				notification
					.html(message)
					.hide()
					.slideDown('fast')
				;
			}else{
				this.notifications = $('<div class="form-notification">')
					.html(message)
					.wrap('<p class="form-notifications">')
					.parent()
				;
				this.element.find('[type=submit]').before(this.notifications);
				this.notifications
					.hide()
					.slideDown('fast')
				;				
			}
		}
	});
})(jQuery);
