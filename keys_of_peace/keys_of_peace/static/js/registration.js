jQuery(function($){
	var form = $('.registration-form');
	form.form({
		focus: true,
		validation: {
			rules: {
				email: {
					email: true,
					api: {
						getData: function(value){
							return {
								email: value
							};
						},
						isValid: function(response){
							return !response.objects[0];
						},
						resource: 'user'
					},
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
					api: 'There\'s already user with such email.',
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
		
		submit: function(_form, callback){
			var that = this;
			var _submit = function(hash){
				that.setStatus({
					text: 'Registration…',
					class: 'gauge'
				});
				callback(
					Api.fetch({
						type: 'POST',
						resource: 'user',
						data: {
							email: form.find('[name=email]').val(),
							salt: Crypto.toString(salt),
							password_hash: Crypto.toString(hash)
						}
					})
				);
			};
			
			this.setStatus({
				text: 'Hashing password…',
				class: 'gauge'
			});
			var password = form.find('[name=password]').val();
			var salt = Crypto.getSalt();
			Api.make({
				method: 'hash',
				arguments: [password, salt],
				callback: _submit
			});
		},

		done: function(){
			showSuccess();
		}
	});

	var showSuccess = function(){
		form
			.after(
				_.template(
					$('.success-template').html(),
					{
						email: form.find('[name=email]').val()
					}
				)
			)
			.remove()
		;
	};

	_.each(['password', 'password_confirmation'], function(name){
		var input = $('[name=' + name + ']')
			.password()
		;
		var row = input.closest('form > p')
			.addClass('password-row')
		;
		var show = $('<button class="password-show"></button>')
			.appendTo(row)
		;
		show.on('click', function(e){
			e.preventDefault();
		});
		show.on('mouseup', function(e){
			e.preventDefault();
			input.password('option', 'mode', 'password');
		});
		show.on('mousedown', function(e){
			e.preventDefault();
			input.password('option', 'mode', 'text');
		});
	});
});
