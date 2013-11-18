(function($){
	var credentials;
	var store;
	
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
			
			var passwordGenerate = $('<a class="account-password-generator-action account-password-generate modal-link" href="#">=</a>')
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

			store.on('constructionDone', this._onStoreConstructionDone, this);
		},

		_onStoreConstructionDone: function(){
			this.loginInput.val(store.logins.last().get('login'));
			this.emailInput.val(store.emails.last().get('email'));
			this.alphabetInput.val(store.accounters.suggestPasswordAlphabet());
			this.lengthInput.val(store.accounters.suggestPasswordLength());
			this.generatePassword();
		},

		generatePassword: function(){
			if(this.lengthInput.valid() && this.alphabetInput.valid()){
				this.passwordInput.password('value', Crypto.getPassword(this.lengthInput.val(), this.alphabetInput.val()), true);
			}
		}
	});

	
	var AccountView = Backbone.View.extend({
		render: function(){
			var element = $(
				AccountView.template({
					login: this.model.get('login'),
					email: this.model.get('email'),
					password: this.model.get('password')
				})
			);
			var site = this.model.get('accounter').get('mainSite');
			if(site){
				var siteLink = $('<a class="account-accounter-link">')
					.attr('href', site.get('host'))
					.html(site.get('name'))
				;
				element.prepend(siteLink);
			}
			var password = element.find('.account-password')
				.password({
					target: element.find('.account-password-row')
				})
			;
			return element;
		}
	});

	$(function(){
		AccountView.template = _.template($('.account-template').html());
	});
	

	var Dashboard = window.Dashboard = function(selector, _credentials){
		credentials = _credentials;
		
		var element = $(selector);
		element.html(this.render());

		$('.dashboard-title').qtip();

		var bar = $('.bar');
		var storeStatus;
		var setStoreStatus = function(options){
			if(!storeStatus){
				storeStatus = $('<div class="status">');
				bar.append(storeStatus);
			}
			if(options.error){
				storeStatus.addClass('status-error');
			}else{
				storeStatus.removeClass('status-error');
			}
			if(options.gauge){
				storeStatus.addClass('status-gauge');
			}else{
				storeStatus.removeClass('status-gauge');
			}
			storeStatus.html(options.text);
			storeStatus
				.position({
					my: 'center top',
					at: 'center bottom+5',
					of: bar
				})
			;
		};
		var clearStoreStatus = function(){
			if(storeStatus){
				storeStatus.remove();
				storeStatus = undefined;
			}
		};

		var that = this;
		store = new Store().on({
			constructionDecryption: function(){
				setStoreStatus({
					text: 'Decrypting…',
					gauge: true
				});
			},
			constructionDone: function(){
				clearStoreStatus();
				that.setSearchResults(store.accounts);
			},
			savingEncryption: function(){
				setStoreStatus({
					text: 'Encrypting…',
					gauge: true
				});
			},
			savingFetching: function(){
				setStoreStatus({
					text: 'Fetching…',
					gauge: true
				})
			},
			savingDone: function(){
				setStoreStatus({
					text: 'Saved at ' + new Date().toLocaleTimeString()
				})
			},
			savingFail: function(xhr){
				var options = {
					error: true
				};
				if(!xhr.status){
					options.text = 'Saving failed. Check your internet connection.'
				}else if(401 === xhr.status){
					options.text = 'Unauthorized. <a href="' + CONFIGURATION.LOGIN_URL + '">Login</a>';
				}else if(500 === xhr.status){
					options.text = 'Server error during saving.';
				}else{
					options.text = 'Unknown error during saving.';
				}
				setStoreStatus(options)
			}
		});

		var searchForm = element.find('.search-form');
		searchForm.form({
			focus: true
		});

		this.searchResultsElement = element.find('.search-results');

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
				store.accounts.create({
					link: this.linkInput.val(),
					login: this.loginInput.val(),
					email: this.emailInput.val(),
					password: this.passwordInput.val(),
					passwordAlphabet: this.alphabetInput.val(),
					passwordLength: this.lengthInput.val(),
					notes: this.notesInput.val()
				});
			}
		});

		store.setCredentials(credentials);
	};
	
	_.extend(Dashboard.prototype, {
		render: function(){
			return _.template(
				$('.dashboard-template').html(),
				{
					email: credentials.email
				}
			);
		},

		setSearchResults: function(searchResults){
			if(this.searchResults){
				this.offSearchResults();
			}
			this.searchResults = searchResults;
			this.onSearchResults();

			if(this.searchResults.length){
				this.searchResultsElement.html('');
				var that = this;
				this.searchResults.each(function(model){
					that.addSearchResult(model, {
						effects: false
					})
				});
			}else{
				this.searchResultsElement.html($('.no-accounts-template').html());
			}
		},

		onSearchResults: function(){
			this.searchResults.on('add', this.onAddSearchResult, this);
		},

		onAddSearchResult: function(model, options){
			if(1 === this.searchResults.length){
				this.searchResultsElement.find('> *')
					.slideUp('fast')
				;
			}
			this.addSearchResult(model, options);
		},

		addSearchResult: function(model, options){
			options = _.defaults(options || {}, {
				effects: true
			});
			var view;
			if(model instanceof Account){
				view = new AccountView({
					model: model
				});
			}else{
				throw 'Model is not recognized.';
			}
			var element = view.render();
			this.searchResultsElement.append(element);
			if(options.effects){
				element
					.hide()
					.slideDown('fast')
				;
			}
		},

		offSearchResults: function(){
			
		}
	});
})(jQuery);
