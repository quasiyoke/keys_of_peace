jQuery(function($){
	var form = $('.registration-form');
	form.form({
		focus: true,
		validation: {
			rules: {
				email: {
					email: true,
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
		
		submit: function(){
			var password = form.find('[name=password]').val();
			var salt = Crypto.getSalt();
			return Api.fetch({
				type: 'POST',
				resource: 'user',
				data: {
					email: form.find('[name=email]').val(),
					salt: Crypto.toString(salt),
					password_hash: Crypto.toString(Crypto.hash(password, salt))
				}
			});
		}
	});
});
