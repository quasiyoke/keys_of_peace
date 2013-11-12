'use strict';

jQuery(function($){
	var credentials = {};
	
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
							}
						},
						isValid: function(response){
							var user = response.objects[0];
							if(!user){
								return false;
							}
							Crypto.salt = Crypto.fromString(user.salt);
							Crypto.oneTimeSalt = Crypto.fromString(user.one_time_salt);
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

		submit: function(){
			credentials.password = form.find('[name=password]').val();
			credentials.passwordHash = Crypto.hash(credentials.password, Crypto.salt);
			Crypto.email = form.find('[name=email]').val();
			return Api.fetch({
				resource: 'user',
				data: {
					email: Crypto.email,
					salt: Crypto.toString(Crypto.salt),
					one_time_salt: Crypto.toString(Crypto.oneTimeSalt),
					password_hash: Crypto.toString(Crypto.hash(credentials.passwordHash, Crypto.oneTimeSalt))
				}
			})
		},

		done: function(response){
			var user = response.objects[0];
			credentials.data = user.data;
			credentials.dataSalt = user.data_salt;
			var dashboard = new Dashboard('.body-wrap', credentials);
		},

		fail: function(xhr){
			if(401 === xhr.status){
				form.form('notify', 'Wrong email or password.');
				return true;
			}
		}
	});
});
