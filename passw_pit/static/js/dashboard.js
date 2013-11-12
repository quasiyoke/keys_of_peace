(function($){
	var credentials;
	var store;
	
	$.widget('passwPit.accountForm', $.passwPit.form, {
		_create: function(){
			var generatePassword = function(){}
			
			var link = this.element.find('[name=link]')
				.qtip({
					content: 'Link to website, name of service or any other short account description.',
				})
			;
			var login = this.element.find('[name=login]')
				.val(store.logins.getFirst())
				.qtip({
					content: 'Account login or email<br>if it is used as login.'
				})
			;
			this._on(login, {
				keyup: function(){
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
				}
			});
			var email = this.element.find('[name=email]')
				.val(store.emails.getFirst())
			;
			var emailRow = email.closest('form > p');
			this.passwordInput = this.element.find('[name=password]');
			var passwordRow = this.passwordInput.closest('form > p')
				.addClass('account-password-row')
			;
			this.alphabetInput = this.element.find('[name=alphabet]');
			var alphabetRow = this.alphabetInput.closest('form > p')
				.addClass('account-alphabet-row')
			;
			alphabetRow.find('label').html('Alphabet');
			this.lengthInput = this.element.find('[name=length]');
			var lengthRow = this.lengthInput.closest('form > p')
				.addClass('account-length-row')
			;
			var passwordGenerator = $('<div class="account-password-generator">');
			var passwordGenerate = $('<a class="account-password-generator-action account-password-generate" href="#">=</a>');
			this._on(passwordGenerate, {
				click: function(e){
					e.preventDefault();
					this.generatePassword();
				}
			});
			passwordRow.prepend(passwordGenerator);
			passwordGenerator
				.append(alphabetRow)
				.append('<span class="account-password-generator-action">×</span>')
				.append(lengthRow)
				.append(passwordGenerate)
			;
		},

		generatePassword: function(){
			console.log(Crypto.getPassword(this.lengthInput.val(), this.alphabetInput.val()));
		}
	});

	var Dashboard = window.Dashboard = function(selector, _credentials){
		var element = $(selector);
		element.html(this.render());
		
		credentials = _credentials;
		store = new Store(credentials);
		
		var searchForm = element.find('.search-form');
		searchForm.form({
			focus: true
		});

		var accountForm = element.find('.account-form');
		accountForm.accountForm({
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
			}
		});
	};
	Dashboard.prototype.render = function(){
		return _.template(
			$('.dashboard-template').html(),
			{
				email: Crypto.email
			}
		);
	};
})(jQuery);