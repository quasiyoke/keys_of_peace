jQuery(function($){
	$.validator.addMethod('api', function(value, el, param){
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
	
	var form = $('.registration-form');
	form.form({
		focus: true,
		validation: {
			rules: {
				email: {
					email: true,
					api: {
						getData: function(value){
							return {
								email: value
							};
						},
						isValid: function(response){
							return !response.objects[0];
						},
						resource: 'user'
					},
					required: true
				},
				password: {
					required: true
				},
				password_confirmation: {
					equalTo: '.registration-form [name=password]',
					required: true
				}
			},
			messages: {
				email: {
					api: 'There\'s already user with such email.',
					required: 'Enter your email address.'
				},
				password: {
					required: 'Enter your password.'
				},
				password_confirmation: {
					equalTo: 'Passwords don\'t match.',
					required: 'Confirm your password.',
				}
			}
		},
		
		submit: function(){
			var password = form.find('[name=password]').val();
			var salt = Crypto.getSalt();
			return Api.fetch({
				type: 'POST',
				resource: 'user',
				data: {
					email: form.find('[name=email]').val(),
					salt: Crypto.toString(salt),
					password_hash: Crypto.toString(Crypto.hash(password, salt))
				}
			});
		}
	});
});
