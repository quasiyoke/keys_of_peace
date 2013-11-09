jQuery(function($){
	var form = $('.registration-form');
	form.find('input:visible:first').focus();
	form.validate({
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
				required: 'Confirm your password.'
			}
		}
	});
});
