'use strict';

(function($){
	$.validator.addMethod('api', function(value, el, param){
		var element = $(el);
		var form = element.closest('form');
		form.form('clearStatus', el.name);
		
		var previous = this.previousValue(el);
		if(!this.settings.messages[el.name]){
			this.settings.messages[el.name] = {};
		}
		previous.originalMessage = this.settings.messages[el.name].remote;
		this.settings.messages[el.name].remote = previous.message;

		if(previous.old === value){
			if(previous.valid){
				form.form('setStatus', {
					name: el.name,
					text: 'OK'
				});
			}
			return previous.valid;
		}

		form.form('setStatus', {
			name: el.name,
			text: 'Checking…'
		});
		
		previous.old = value;
		this.startRequest(el);
		var that = this;
		Api
			.fetch({
				data: param.getData ? param.getData.call(that, value, el, param) : value,
				resource: param.resource
			})
			.always(function(){
				form.form('clearStatus', el.name);
			})
			.done(function(response){
				that.settings.messages[el.name].remote = previous.originalMessage;
				var valid = param.isValid.call(that, response, value, el, param);
				if(valid){
					var submitted = that.formSubmitted;
					that.prepareElement(el);
					that.formSubmitted = submitted;
					that.successList.push(el);
					delete that.invalid[el.name];
					that.showErrors();
					form.form('setStatus', {
						name: el.name,
						text: 'OK'
					});
				}else{
					var errors = {};
					var message = that.defaultMessage(el, 'api');
					errors[el.name] = previous.message = $.isFunction(message) ? message(value) : message;
					that.invalid[el.name] = true;
					that.showErrors(errors);
				}
				previous.valid = valid;
				that.stopRequest(el, valid);
			})
		;
		return 'pending';
	});

	
	$.widget('passwPit.form', {
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
					}else if(401 === xhr.status){
						this.notify('Unauthorized. <a href="' + LOGIN_URL + '">Login</a>');
				}else if(500 === xhr.status){
					this.notify('Server error.');
				}else{
					this.notify('Unknown error.');
				}
			}
		},

		setStatus: function(options){
			var input = this.element.find('[name=' + options.name + ']');
			$('<span class="validation-status">')
				.html(options.text)
				.insertAfter(input)
				.position({
					my: 'left center',
					at: 'right+5 center',
					of: input
				})
			;			
		},

		clearStatus: function(name){
			this.element
				.find('[name=' + name + ']')
				.closest('form > p')
				.find('.validation-status')
				.remove()
			;
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
