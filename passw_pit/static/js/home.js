'use strict';

jQuery(function($){
	var credentials = {};
	var store;
	
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
			store = new Store(credentials);
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
		$('.body-wrap').html(
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
					link: {
						required: true
					},
					login: {
						required: true
					},
					email: {
						email: true
					},
					length: {
						range: [3, 50]
					},
					password: {
						required: true
					},
					notes: {
						maxlength: 100
					}
				},
				messages: {
					link: {
						required: 'Enter the link or name for account.'
					},
					login: {
						required: 'Enter account login or email.'
					},
					length: {
						range: 'Passw length should be ≥ 3 and ≤ 50.'
					},
					password: {
						required: 'Enter password for account.'
					}
				}
			},

			create: function(){
				var link = accountForm.find('[name=link]')
					.qtip({
						content: 'Link to website, name of service or any other short account description.',
					})
				;
				var login = accountForm.find('[name=login]')
					.val(store.logins.getFirst())
					.qtip({
						content: 'Account login or email<br>if it is used as login.'
					})
					.on('keyup', function(){
						if($.validator.methods.email.call({optional: function(){}}, $(this).val(), this)){ // Check if email was used as login.
							if(emailRow.is(':visible')){
								emailRow.slideUp('fast');
								emailVisible = false;
							}
						}else{
							if(!emailRow.is(':visible')){
								emailRow.slideDown('fast');
							}
						}
					})
				;
				var email = accountForm.find('[name=email]')
					.val(store.emails.getFirst())
				;
				var emailRow = email.closest('form > p');
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
