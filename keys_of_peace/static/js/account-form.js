(function($){
	$.widget('keysOfPeace.accountForm', $.keysOfPeace.form, {
		_create: function(){
			this._super();
			
			this.linkInput = this.element.find('[name=link]')
				.qtip({
					content: 'Link to website, name of service or any other short account description.',
				})
			;
			
			this.loginInput = this.element.find('[name=login]')
				.qtip({
					content: 'Account login or email<br>if it is used as login.'
				})
			;
			this._on(this.loginInput, {
				keyup: function(){
					if($.validator.methods.email.call({optional: $.noop}, this.loginInput.val(), this.loginInput)){ // Check if email was used as login.
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
			
			this.emailInput = this.element.find('[name=email]');
			var emailRow = this.emailInput.closest('form > p');
			
			this.passwordInput = this.element.find('[name=password]');
			this._on(this.passwordInput, {
				'passwordchange': function(e, data){
					if(data.value.length){
						this.lengthInput.val(data.value.length);
					}
					var alphabetKey = Crypto.getAlphabet(data.value);
					if(alphabetKey){
						this.alphabetInput.val(alphabetKey);
					}
				}
			});
			var passwordRow = this.passwordInput.closest('form > p')
				.addClass('account-password-row')
			;
			this.passwordInput.password({
				target: passwordRow
			});
			
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

			this.notesInput = this.element.find('[name=notes]');
		},

		generatePassword: function(){
			if(this.lengthInput.valid() && this.alphabetInput.valid()){
				this.passwordInput.password('value', Crypto.getPassword(this.lengthInput.val(), this.alphabetInput.val()), true);
			}
		}
	});
})(jQuery);
