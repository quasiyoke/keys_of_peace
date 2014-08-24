'use strict';

(function($){
	var credentials = {};
	
	window.HomeView = Backbone.View.extend({
		events: {
			'click .registration-link': 'onRegistrationLinkClick'
		},
		
		size: 'wide',

		setElement: function(element){
			HomeView.__super__.setElement.call(this, element);
			this.$el
				.html(this.render())
			;

			var home = this;
			
			this.loginForm = $('.login-form')
				.form({
					focus: true,
					validation: {
						rules: {
							email: {
								email: true,
								api: {
									resource: 'user',
									getData: function(value){
										return {
											email: value
										};
									},
									isValid: function(response){
										var user = response.objects[0];
										if(!user){
											return false;
										}
										credentials.uri = user.resource_uri;
										credentials.salt = Crypto.fromString(user.salt);
										credentials.oneTimeSalt = Crypto.fromString(user.one_time_salt);
										return true;
									}
								},
								required: true
							},
							password: {
								required: true
							}
						},
						messages: {
							email: {
								api: 'There\'s no user with such email.',
								required: 'Enter your email address.'
							},
							password: {
								required: 'Enter your password.'
							}
						}
					},

					submit: function(form, callback){
						var hashByOneTimeSalt = function(hash){
							credentials.passwordHash = hash;
							Api.make({
								method: 'hash',
								args: [hash, credentials.oneTimeSalt],
								callback: check
							})
						};

						var check = function(hash){
							that.setStatus({
								text: 'Checking…',
								class: 'gauge'
							});
							callback(
								Api.fetch({
									uri: credentials.uri,
									data: {
										salt: Crypto.toString(credentials.salt),
										one_time_salt: Crypto.toString(credentials.oneTimeSalt),
										password_hash: Crypto.toString(hash)
									}
								})
							);
						};
						
						this.setStatus({
							text: 'Hashing password…',
							class: 'gauge'
						});
						credentials.email = home.$el.find('[name=email]').val();
						credentials.password = home.$el.find('[name=password]').val();
						var that = this;
						Api.make({
							method: 'hash',
							args: [credentials.password, credentials.salt],
							callback: hashByOneTimeSalt
						});
					},

					always: function(){
						this.clearStatus();
					},

					done: function(user){
						credentials.data = user.data;
						credentials.oneTimeSalt = user.one_time_salt;
						router.setRoute('dashboard', {credentials: credentials});
						credentials = _.pick(credentials, 'uri', 'email', 'salt');
					},

					fail: function(xhr){
						if(401 === xhr.status){
							home.loginForm.form('notify', 'Wrong email or password.');
							var response = JSON.parse(xhr.responseText);
							credentials.oneTimeSalt = Crypto.fromString(response.one_time_salt);
							return true;
						}
					}
				});

			return this;
		},

		setOptions: function(options){
			options.credentials && (credentials = options.credentials);
			if(!_.isEmpty(credentials)){
				this.$el.find('[name=email]').val(credentials.email);
				this.loginForm.form('focus');
			}
		},

		onRegistrationLinkClick: function(e){
			e.preventDefault();
			router.setRoute('registration', {credentials: credentials});
		},
		
		render: function(){
			return _.template(
				$('.home-template').html()
			);
		}
	});
})(jQuery);
