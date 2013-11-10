'use strict';

jQuery(function($){
	var password;
	
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
			password = form.find('[name=password]').val();
			return Api.fetch({
				resource: 'user',
				data: {
					email: form.find('[name=email]').val(),
					salt: Crypto.toString(Crypto.salt),
					one_time_salt: Crypto.toString(Crypto.oneTimeSalt),
					password_hash: Crypto.toString(Crypto.hash(Crypto.hash(password, Crypto.salt), Crypto.oneTimeSalt))
				}
			})
		},

		done: function(response){
			var user = response.objects[0];
			//console.log('hi', user.one_time_salt);
			Crypto.oneTimeSalt = Crypto.fromString(user.one_time_salt);
		}
	});
});
