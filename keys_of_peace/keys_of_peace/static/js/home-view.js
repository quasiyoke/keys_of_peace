'use strict';

(function($){
	var credentials = {};
	
	var HomeView = window.HomeView = Backbone.View.extend({
		delegateEvents: function(){
			HomeView.__super__.delegateEvents.apply(this, arguments);
			$(window).on('resize.homeview', _.bind(this.position, this));
		},

		undelegateEvents: function(){
			HomeView.__super__.undelegateEvents.apply(this, arguments);
			$(window).off('resize.homeview');
		},

		position: function(){
			/**
				 At small screens prospectus and form should be positioned vertically and centered.
			*/
			var win = $(window);
			var prospectus = $('.prospectus');
			if(win.width() < prospectus.width() + parseInt(prospectus.css('marginRight')) + this.loginForm.width()){
				this.loginForm.css({
					position: 'absolute',
					left: win.width() / 2 - this.loginForm.width() / 2
				});
				var prospectusMargin = 45;
				prospectus.position({
					my: 'center top',
					at: 'center bottom+' + prospectusMargin,
					of: this.loginForm
				});
			}else{
				this.loginForm.css({
					position: 'relative',
					left: 'auto',
					top: 'auto'
				});
				prospectus.css({
					position: 'static'
				});
			}			
		},

		remove: function(){
			this.undelegateEvents();
			this.$el
				.removeClass('body-wrap-home')
				.html('')
			;
			$(window).off('resize.homeview');
		},
		
		render: function(){
			return _.template(
				$('.home-template').html()
			);
		},

		setCredentials: function(_credentials){
			credentials = _credentials;
			if(credentials.email){
				this.$el.find('[name=email]').val(credentials.email);
			}
		},

		setElement: function(element){
			HomeView.__super__.setElement.call(this, element);
			this.$el
				.addClass('body-wrap-home')
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
								arguments: [hash, credentials.oneTimeSalt],
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
									resource: 'user',
									data: {
										email: credentials.email,
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
							arguments: [credentials.password, credentials.salt],
							callback: hashByOneTimeSalt
						});
					},

					always: function(){
						this.clearStatus();
					},

					done: function(response){
						var user = response.objects[0];
						credentials.data = user.data;
						router
							.set('routeName', 'dashboard')
							.get('route').view.setCredentials(credentials);
						;
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

			this.position();
		}
	});
})(jQuery);
