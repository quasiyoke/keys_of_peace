(function($){
	var credentials;
	var store;
	
	$.widget('passwPit.accountForm', $.passwPit.form, {
		_create: function(){
			this._super('_create');
			
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
					if($.validator.methods.email.call({optional: function(){}}, login.val(), login)){ // Check if email was used as login.
						if(emailRow.is(':visible')){
							emailRow.slideUp('fast');
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
			this._on(this.passwordInput, {
				keyup: function(){
					var password = this.passwordInput.val();
					if(password.length){
						this.lengthInput.val(password.length);
					}
					var alphabetKey = Crypto.getAlphabet(password);
					if(alphabetKey){
						this.alphabetInput.val(alphabetKey);
					}
				}
			});
			var passwordRow = this.passwordInput.closest('form > p')
				.addClass('account-password-row')
			;
			
			this.alphabetInput = this.element.find('[name=alphabet]');
			this._on(this.alphabetInput, {
				change: 'generatePassword'
			});
			var alphabetRow = this.alphabetInput.closest('form > p')
				.addClass('account-alphabet-row')
			;
			alphabetRow.find('label').html('Alphabet');
			
			this.lengthInput = this.element.find('[name=length]');
			this._on(this.lengthInput, {
				keyup: function(){
					if(Number(this.lengthInput.val())){
						this.generatePassword()
					}
				}
			});
			var lengthRow = this.lengthInput.closest('form > p')
				.addClass('account-length-row')
			;
			
			var passwordGenerate = $('<a class="account-password-generator-action account-password-generate" href="#">=</a>')
			.qtip({
				content: 'Generate new password',
				position: {
					my: 'top right',
					at: 'bottom center'
				}
			})
			;
			this._on(passwordGenerate, {
				click: function(e){
					e.preventDefault();
					this.generatePassword();
				}
			});
			
			var passwordGenerator = $('<div class="account-password-generator">');
			
			passwordRow.prepend(passwordGenerator);
			passwordGenerator
				.append(alphabetRow)
				.append('<span class="account-password-generator-action">×</span>')
				.append(lengthRow)
				.append(passwordGenerate)
			;
			this.generatePassword();
		},

		generatePassword: function(){
			if(this.lengthInput.valid() && this.alphabetInput.valid()){
				this.passwordInput.val(Crypto.getPassword(this.lengthInput.val(), this.alphabetInput.val()));
			}
		}
	});

	var Dashboard = window.Dashboard = function(selector, _credentials){
		credentials = _credentials;
		store = new Store(credentials);
		
		var element = $(selector);
		element.html(this.render());

		$('.dashboard-title').qtip();
		
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
			},

			submit: function(){

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
