'use strict';
(function($){
	var credentials = {};
	
	window.RegistrationView = Backbone.View.extend({
		event: {
			'click .password-show': 'onPasswordShowClick',
			'mouseup .password-show': 'onPasswordMouseUp',
			'mousedown .password-show': 'onPasswordMouseDown'
		},
		
		setElement: function(el){
			RegistrationView.__super__.setElement.call(this, el);
			this.$el.html(this.render());
			this.form = this.$('.registration-form');
			this.emailInput = this.form.find('[name=email]');
			this.passwordInput = this.form.find('[name=password]');
			this.passwordConfirmationInput = this.form.find('[name=password_confirmation]');
			var view = this;
			this.form.form({
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
									return !response.objects.length;
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
				
				submit: function(_form, callback){
					var that = this;
					var submit = function(hash){
						credentials.passwordHash = hash;
						credentials.email = view.emailInput.val();
						that.setStatus({
							text: 'Registration…',
							'class': 'gauge'
						});
						callback(
							Api.fetch({
								type: 'POST',
								resource: 'user',
								data: {
									email: credentials.email,
									salt: Crypto.toString(credentials.salt),
									password_hash: Crypto.toString(hash)
								}
							})
						);
					};
					
					this.setStatus({
						text: 'Hashing password…',
						'class': 'gauge'
					});
					credentials.password = view.passwordInput.val();
					credentials.salt = Crypto.getSalt();
					Api.make({
						method: 'hash',
						args: [credentials.password, credentials.salt],
						callback: submit
					});
				},

				done: function(response){
					credentials.uri = response.resource_uri;
					router.setRoute('registrationSuccess', {credentials: credentials});
				}
			});
			_.each(['password', 'password_confirmation'], function(name){
				var input = view.form.find('[name=' + name + ']')
					.password()
				;
			});
			return this;
		},

		setOptions: function(options){
			if(options.credentials){
				credentials = options.credentials;
				this.emailInput.val(credentials.email);
				this.passwordInput.val(credentials.password);
				this.form.form('focus');
			}
		},

		remove: function(){
			RegistrationView.__super__.remove.apply(this, arguments);
			credentials = undefined;
		},

		render: function(){
			return _.template($('.registration-template').html());
		}
	});
})(jQuery);
