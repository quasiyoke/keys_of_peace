'use strict';

jQuery(function($){
	var credentials;
	
	var Home = window.Home = function(element, _credentials){
		credentials = _credentials || {};

		this.element = element;
		this.element
			.addClass('body-wrap-home')
			.html(this.render())
		;
		if(credentials.email){
			element.find('[name=email]').val(credentials.email);
		}

		var home = this;
		
		var form = $('.login-form');
		form.form({
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
				credentials.email = home.element.find('[name=email]').val();
				credentials.password = home.element.find('[name=password]').val();
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
				home.destroy();
				var dashboard = new Dashboard(home.element, credentials);
			},

			fail: function(xhr){
				if(401 === xhr.status){
					form.form('notify', 'Wrong email or password.');
					var response = JSON.parse(xhr.responseText);
					credentials.oneTimeSalt = Crypto.fromString(response.one_time_salt);
					return true;
				}
			}
		});

		/* At small screens prospectus and form should be positioned vertically and centered. */
		var win = $(window);
		var prospectus = $('.prospectus');
		var position = function(){
			if(win.width() < prospectus.width() + parseInt(prospectus.css('marginRight')) + form.width()){
				form.css({
					position: 'absolute',
					left: win.width() / 2 - form.width() / 2
				});
				var prospectusMargin = 45;
				prospectus.position({
					my: 'center top',
					at: 'center bottom+' + prospectusMargin,
					of: form
				});
			}else{
				form.css({
					position: 'relative',
					left: 'auto',
					top: 'auto'
				});
				prospectus.css({
					position: 'static'
				});
			}
		};
		position();
		win.on('resize', function(e){
			position();
		});
	};

	_.extend(Home.prototype, {
		destroy: function(){
			this.element.removeClass('body-wrap-home');
		},
		
		render: function(){
			return _.template(
				$('.home-template').html()
			);
		}
	});

	new Home($('.body-wrap'));
});
