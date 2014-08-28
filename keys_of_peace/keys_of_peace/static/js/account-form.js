(function($){
	$.widget('keysOfPeace.accountForm', $.keysOfPeace.form, {
		_create: function(){
			function getFocusHandler(onSelect){
				return function(e, ui){
					if(e.originalEvent && e.originalEvent.originalEvent && /^key/.test(e.originalEvent.originalEvent.type)){
						onSelect(e, ui);
					}
				};
			}
			
			var onLinkSelect = _.bind(this.options.linkSelect, this);
			this.linkInput = this.element.find('[name=link]')
				.qtip({
					content: 'Link to website or name of service. E.g.: <strong>Wi-fi</strong>, <strong>Google</strong>.',
				})
				.autocomplete({
					focus: getFocusHandler(onLinkSelect),
					select: onLinkSelect,
					source: _.bind(this.options.linkSource, this)
				})
			;

			this.loginInput = this.element.find('[name=login]')
				.qtip({
					content: 'Account login or email<br>if it is used as login.'
				})
				.autocomplete({
					source: _.bind(this.options.loginSource, this)
				})
			;

			this.emailInput = this.element.find('[name=email]')
				.autocomplete({
					source: _.bind(this.options.emailSource, this)
				})
			;
			
			this.passwordInput = this.element.find('[name=password]');
			var passwordRow = this.passwordInput.closest('form > p')
				.addClass('account-password-row')
			;
			this.passwordInput.password();
			var that = this;
			this.passwordCopy = $('<button class="account-form-password-copy" tabindex="-1">')
				.appendTo(passwordRow)
				.clipboard({
					data: _.bind(that.passwordInput.val, that.passwordInput),
					tip: 'Click to copy password'
				})
			;
			
			this.alphabetInput = this.element.find('[name=alphabet]');
			this.alphabetInput.attr('tabindex', -1);
			var alphabetRow = this.alphabetInput.closest('form > p')
				.addClass('account-alphabet-row')
			;
			alphabetRow.find('label').text('Alphabet');
			
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
				},
				mousedown: function(e){
					e.preventDefault();
					this.generatePassword();
					this.passwordInput.password('option', 'mode', 'text');
				},
				mouseup: function(e){
					e.preventDefault();
					this.passwordInput.password('option', 'mode', 'password');
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
