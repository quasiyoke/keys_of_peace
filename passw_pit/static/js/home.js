'use strict';

jQuery(function($){
	var password;
	var passwordHash;
	var data;
	var dataSalt;
	
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
			passwordHash = Crypto.hash(password, Crypto.salt);
			return Api.fetch({
				resource: 'user',
				data: {
					email: form.find('[name=email]').val(),
					salt: Crypto.toString(Crypto.salt),
					one_time_salt: Crypto.toString(Crypto.oneTimeSalt),
					password_hash: Crypto.toString(Crypto.hash(passwordHash, Crypto.oneTimeSalt))
				}
			})
		},

		done: function(response){
			var user = response.objects[0];
			data = user.data;
			dataSalt = user.data_salt;
			if(data){
				dataSalt = Crypto.fromString(dataSalt);
				data = JSON.parse(Crypto.decode(Crypto.fromString(data), Crypto.hash(password, dataSalt)));
			}
			showDashboard();
		},

		fail: function(xhr){
			if(401 === xhr.status){
				form.form('notify', 'Wrong email or password.');
				return true;
			}
		}
	});

	var showDashboard = function(){
		
	};
});
