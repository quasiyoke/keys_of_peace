'use strict';
(function($){
	$.validator.addMethod('api', function(value, el, param){
		var element = $(el);
		var form = element.closest('form');
		
		var previous = this.previousValue(el);
		if(!this.settings.messages[el.name]){
			this.settings.messages[el.name] = {};
		}
		previous.originalMessage = this.settings.messages[el.name].api;
		this.settings.messages[el.name].api = previous.message;

		if(previous.old === value && !previous.valid.fail){
			if(previous.valid){
				form.form('setStatus', {
					name: el.name,
					class: 'ok'
				});
			}
			return previous.valid;
		}

		form.form('setStatus', {
			name: el.name,
			text: 'Checking…',
			class: 'gauge'
		});
		form.form('clearNotifications');
		
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
				that.settings.messages[el.name].api = previous.originalMessage;
				var valid = !!(param.isValid && param.isValid.call(that, response, value, el, param));
				if(valid){
					var submitted = that.formSubmitted;
					that.prepareElement(el);
					that.formSubmitted = submitted;
					that.successList.push(el);
					delete that.invalid[el.name];
					that.showErrors();
					form.form('setStatus', {
						name: el.name,
						class: 'ok'
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
			.fail(function(response){
				that.settings.messages[el.name].api = previous.originalMessage;
				var valid = param.isValidFail && param.isValidFail.call(that, response, value, el, param);
				if(undefined === valid || valid){
					var submitted = that.formSubmitted;
					that.prepareElement(el);
					that.formSubmitted = submitted;
					that.successList.push(el);
					delete that.invalid[el.name];
					that.showErrors();
					if(valid){
						form.form('setStatus', {
							name: el.name,
							class: 'ok'
						});
					}else{
						form.form('notify', 'Can\'t validate. ' + (response.status ? 'Server error.' : 'Connection error.'));
						valid = {
							fail: true
						};
					}
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

	$.validator.addMethod('equalToValue', function(value, element, param){
		return this.optional(element) || (_.isFunction(param) ? value === param() : value === param);
	});
	
	$.widget('keysOfPeace.form', {
		options: {
			delay: 250,
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
			this._statuses = {};
			this._delays = {};
			this._validate();
			this._delegateEvents();
		},

		_validate: function(){
			this.options.validation.submitHandler = _.bind(this._submit, this);
			this.element.validate(this.options.validation);
		},

		_delegateEvents: function(){
			this._on(this.element.find('input:visible'), {
				keyup: '_change'
			});
		},

		_init: function(){
			if(this.options.focus){
				this.focus();
			}
		},

		_change: function(e){
			this._trigger('change', e);
			
			var name = e.target.name;
			var that = this;
			var timeout = setTimeout(function(){
				if(that._delays[name] === timeout){
					that._trigger('delayedchange', e);
				}
			}, this.options.delay);
			this._delays[name] = timeout;
		},

		_submit: function(form){
			if(this.options.submit){
				var that = this;
				var callbackDone = false;
				var callback = function(xhr){
					if(xhr){
						xhr
							.always(_.bind(that._always, that))
							.done(_.bind(that._done, that))
							.fail(_.bind(that._fail, that))
						;
					}
					callbackDone = true;
				};
				
				this.clearNotifications();
				try{
					var xhr = this.options.submit.call(this, form, callback);
				}catch(e){
					console.error(e);
					return;
				}
				if(xhr && !callbackDone){
					callback(xhr);
				}
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
					this.notify('Unauthorized. <a href="/' + router.getRoute('home').getFragment() + '">Login</a>');
				}else if(500 === xhr.status){
					this.notify('Server error.');
				}else{
					this.notify('Unknown error.');
				}
			}
		},

		focus: function(){
			this.element.find('input:visible[value=""]:first')
				.focus()
			;
		},

		setStatus: function(options){
			var input = this.element.find(options.name ? '[name=' + options.name + ']' : '[type=submit]');
			var status = this._statuses[options.name];

			var match = /input\-status\-\S+/.exec(input[0].className)
			if(match){
				input.removeClass(match[0]);
			}
			
			if(!status){
				status = $('<span>').insertAfter(input);
				this._statuses[options.name] = status;
			}
			status
				.attr('class', 'status')
				.html(options.text || '')
			;
			if(options.class){
				status.addClass('status-' + options.class);
				input.addClass('input-status-' + options.class);
			}
			if('ok' === options.class){
				var width = parseInt(status.width());
				status.position({
					my: 'left bottom',
					at: 'right-' + input.css('paddingRight') + ' bottom-' + width * .05,
					of: input,
					collision: 'none'
				});
			}else{
				status.position({
					my: 'left center',
					at: 'right+10 center',
					of: input,
					collision: 'none'
				});
			}
			return this;
		},

		clearStatus: function(name){
			var status = this._statuses[name];
			if(status){
				status.remove();
				delete this._statuses[name];
				
				var input = this.element.find(name ? '[name=' + name + ']' : '[type=submit]');
				var match = /input\-status\-\S+/.exec(input[0].className)
				if(match){
					input.removeClass(match[0]);
				}
			}
			return this;
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

		notify: function(options){
			_.isObject(options) || (options = {message: options});
			var notification = $('<div class="form-notification">')
				.html(options.message)
			;
			if('ok' !== options['class']){
				notification.addClass('form-notification_error');
			}
			if(this.notifications){
				this.notifications.append(notification);
				notification
					.hide()
					.slideDown('fast')
				;
			}else{
				this.notifications = $('<p class="form-notifications">')
					.append(notification)
				;
				this.element.find('[type=submit]').before(this.notifications);
				this.notifications
					.hide()
					.slideDown('fast')
				;				
			}
		},

		value: function(name, value){
			var input = this.element.find('[name=' + name + ']');
			if(undefined === value){
				return input.val();
			}else{
				input.val(value);
				return this;
			}
		}
	});
})(jQuery);
