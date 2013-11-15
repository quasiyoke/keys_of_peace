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
					gauge: true
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
				gauge: true
			});
			credentials.email = this.element.find('[name=email]').val();
			credentials.password = this.element.find('[name=password]').val();
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
