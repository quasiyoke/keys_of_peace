(function($){
	$.widget('keysOfPeace.accountForm', $.keysOfPeace.form, {
		_create: function(){
			this.linkInput = this.element.find('[name=link]')
				.qtip({
					content: 'Link to website or name of service. E.g.: <strong>Wi-fi</strong>, <strong>Google</strong>.',
				})
			;
			
			this.loginInput = this.element.find('[name=login]')
				.qtip({
					content: 'Account login or email<br>if it is used as login.'
				})
			;
			
			this.emailInput = this.element.find('[name=email]');
			
			this.passwordInput = this.element.find('[name=password]');
			var passwordRow = this.passwordInput.closest('form > p')
				.addClass('account-password-row')
			;
			this.passwordInput.password({
				target: passwordRow
			});
			
			this.alphabetInput = this.element.find('[name=alphabet]');
			this.alphabetInput.attr('tabindex', -1);
			var alphabetRow = this.alphabetInput.closest('form > p')
				.addClass('account-alphabet-row')
			;
			alphabetRow.find('label').html('Alphabet');
			
			this.lengthInput = this.element.find('[name=length]');
			this.lengthInput.attr('tabindex', -1);
			var lengthRow = this.lengthInput.closest('form > p')
				.addClass('account-length-row')
			;
			
			this.passwordGenerate = $('<a class="account-password-generator-action account-password-generate" href="#" tabindex="-1">=</a>')
				.qtip({
					content: 'Generate new password',
					position: {
						my: 'top right',
						at: 'bottom center'
					}
				})
			;
			var passwordGenerator = $('<div class="account-password-generator">');
			passwordRow.prepend(passwordGenerator);
			passwordGenerator
				.append(alphabetRow)
				.append('<span class="account-password-generator-action">×</span>')
				.append(lengthRow)
				.append(this.passwordGenerate)
			;

			this.notesInput = this.element.find('[name=notes]');

			this._super();
		},

		_delegateEvents: function(){
			this._super();
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
			this._on(this.alphabetInput, {
				change: 'generatePassword'
			});
			this._on(this.lengthInput, {
				change: this._onChangeLength,
				keyup: this._onChangeLength
			});
			this._on(this.passwordGenerate, {
				click: function(e){
					e.preventDefault();
					this.generatePassword();
				}
			});
		},

		_onChangeLength: function(){
			if(Number(this.lengthInput.val())){
				this.generatePassword()
			}
		},

		_submit: function(){
			this._superApply(arguments);
			this.focus();
			this.generatePassword();
			this.notesInput.val('');
		},

		generatePassword: function(){
			if(this.lengthInput.valid() && this.alphabetInput.valid()){
				this.passwordInput.password('value', Crypto.getPassword(this.lengthInput.val(), this.alphabetInput.val()), true);
			}
		}
	});
})(jQuery);
