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
			Crypto.email = form.find('[name=email]').val();
			return Api.fetch({
				resource: 'user',
				data: {
					email: Crypto.email,
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
		$('body').html(
			_.template(
				$('.dashboard-template').html(),
				{
					email: Crypto.email
				}
			)
		);
		
		var searchForm = $('.search-form');
		searchForm.form({
			focus: true
		});

		var accountForm = $('.account-form');
		accountForm.form({
			validation: {
				rules: {
					name: {
						required: true
					},
					email: {
						email: true
					},
					password: {
						required: true
					},
					length: {
						range: [3, 50]
					}
				},
				messages: {
					name: {
						required: 'Enter the name of account.'
					},
					password: {
						required: 'Enter password for account.'
					},
					length: {
						range: 'Passw length should be ≥ 3 and ≤ 50.'
					}
				}
			},

			create: function(){
				var password = accountForm.find('[name=password]');
				var passwordRow = password.closest('form > p')
					.addClass('account-password-row')
				;
				var alphabet = accountForm.find('[name=alphabet]');
				var alphabetRow = alphabet.closest('form > p')
					.addClass('account-alphabet-row')
				;
				alphabetRow.find('label').html('Alphabet');
				var length = accountForm.find('[name=length]');
				var lengthRow = length.closest('form > p')
					.addClass('account-length-row')
				;
				var passwordGenerator = $('<div class="account-password-generator">');
				passwordRow.prepend(passwordGenerator);
				passwordGenerator
					.append(alphabetRow)
					.append('<span class="account-password-generator-action"> × </span>')
					.append(lengthRow)
					.append('<span class="account-password-generator-action"> = </span>')
				;
			}
		});
	};
});
