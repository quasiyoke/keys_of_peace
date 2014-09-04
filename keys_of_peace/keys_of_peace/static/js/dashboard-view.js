'use strict';
(function($){
	var credentials;
	var store;

	var DashboardView = window.DashboardView = Backbone.View.extend({
		events: {
			'click .checked-accounts-menu-close': 'onCheckedAccountsMenuCloseClick',
			'click .checked-accounts-menu-select-all': 'onCheckedAccountsMenuSelectAllClick',
			'click .checked-accounts-menu-remove': 'onCheckedAccountsMenuRemoveClick',
			'click .dashboard-settings-link': 'onSettingsLinkClick'
		},
		
		onAccountAdd: function(model, options){
			if(this.query){
				if(this.searchFilter(model)){
					this.searchResults.add(model);
				}else{
					return;
				}
			}
			if(1 === this.searchResults.length){
				this.hideNoSearchResults(options);
			}
			this.addSearchResult(model, options);
			this.updateSearchResultsColors();
		},

		onAccountChecked: function(account, checked){
			this.checkedAccounts[checked ? 'add' : 'remove'](account, {silent: true});
			if(checked){
				if(1 === this.checkedAccounts.length){
					this.showCheckedAccountsMenu();
				}
				this.updateCheckedAccountsMenu();
			}else{
				if(!this.checkedAccounts.length){
					this.hideCheckedAccountsMenu();
				}else{
					this.updateCheckedAccountsMenu();
				}
			}
		},

		onAccountsRemove: function(models){
			if(this.searchResults !== store.accounts){
				this.searchResults.remove(models);
			}
			if(this.searchResults.length){
				this.updateSearchResultsColors();
			}else{
				this.showNoSearchResults();
			}
		},

		showCheckedAccountsMenu: function(){
			this.checkedAccountsMenu = $($('.checked-accounts-menu-template').html())
				.appendTo(this.$el)
			;
		},

		updateCheckedAccountsMenu: function(){
			this.checkedAccountsMenu.find('.checked-accounts-menu-count')
				.html(this.checkedAccounts.length + ' ' + (1 === this.checkedAccounts.length ? 'account' : 'accounts'))
			;
		},

		hideCheckedAccountsMenu: function(){
			this.checkedAccountsMenu.remove();
		},

		onCheckedAccountsMenuCloseClick: function(e){
			e.preventDefault();
			store.accounts.each(function(account){
				account.trigger('check', false);
			});
			this.checkedAccounts.reset();
			this.hideCheckedAccountsMenu();
		},

		onCheckedAccountsMenuSelectAllClick: function(e){
			e.preventDefault();
			store.accounts.each(function(account){
				account.trigger('check', true);
			});
			this.checkedAccounts.add(this.searchResults.toArray());
			this.updateCheckedAccountsMenu();
		},

		onCheckedAccountsMenuRemoveClick: function(e){
			e.preventDefault();
			if(confirm('Are you sure you want to remove ' + this.checkedAccounts.length + ' ' + (1 === this.checkedAccounts.length ? 'account' : 'accounts') + '?')){
				store.accounts.remove(this.checkedAccounts.toArray());
				this.checkedAccounts.reset();
				this.hideCheckedAccountsMenu();
			}
		},

		setElement: function(element){
			DashboardView.__super__.setElement.call(this, element);
			this.$el
				.html(this.render())
			;
			this.$('.dashboard-title').qtip();
			this.checkedAccounts = new Accounts();

			var that = this;
			var searchForm = this.$('.search-form');
			searchForm.form({
				focus: true,
				submit: function(){
					that.search(searchForm.find('[name=query]').val());
				}
			});
			searchForm.on('formdelayedchange', function(){
				var query = searchForm.find('[name=query]').val();
				if(store.ready){
					that.search(query);
				}else{
					that.deferredQuery = query;
				}
			});

			this.searchResultsElement = this.$('.search-results');

			var accounterRequestsCounter = 0;
			this.accountForm = this.$('.account-form');
			this.accountForm.accountForm({
				validation: {
					rules: {
						link: { required: true},
						email: { email: true},
						length: { range: [3, 50]},
						password: { required: true},
						notes: { maxlength: 100}
					},
					messages: {
						link: { required: 'Enter the link or name for account.'},
						length: { range: 'Passw length should be ≥ 3 and ≤ 50.'},
						password: { required: 'Enter password for account.'}
					}
				},

				emailSource: function(request, response){
					response(_.map(
						store.emails.filter(function(email){
							return email.contains(request.term);
						}),
						function(email){
							return email.get('email');
						}
					));
				},

				linkSelect: function(e, ui){
					e.preventDefault();
					this._setOption('accounter', ui.item.value);
					var site = this.options.accounter.getMainSite();
					this.linkInput.val(site ? site.get('host') : this.options.accounter.get('name'));
					this.lengthInput.val(this.options.accounter.get('passwordLength'));
					this.alphabetInput.val(this.options.accounter.get('passwordAlphabet'));
					this.generatePassword();
				},

				linkSource: function(request, response){
					var requestNumber = ++accounterRequestsCounter;
					Api.fetch({
						resource: 'accounter',
						data: {
							contains: request.term
						}
					})
						.always(function(xhr){
							if(requestNumber === accounterRequestsCounter){
								var accounters = store.accounters.filter(function(accounter){
									return accounter.contains(request.term);
								});
								_.each(xhr.objects, function(attrs){ // Won't throw error if `xhr` doesn't contain any `objects`.
									if(!store.accounters.get(attrs.resource_uri)){
										accounters.push(new Accounter(attrs, {
											parse: true
										}));
									}
								});
								accounters = _.map(accounters, function(accounter){
									return {
										label: accounter.get('name'),
										value: accounter
									};
								});
								response(accounters);
							}
						})
					;
				},

				loginSource: function(request, response){
					response(_.map(
						store.logins.filter(function(login){
							return login.contains(request.term);
						}),
						function(login){
							return login.get('login');
						}
					));
				},

				submit: function(){
					if(this.loginInput.val() || this.emailInput.val()){
						store.accounts.create({
							accounter: this.options.accounter,
							link: this.linkInput.val(),
							login: this.loginInput.val(),
							email: this.emailInput.val(),
							password: this.passwordInput.val(),
							passwordAlphabet: this.alphabetInput.val(),
							passwordLength: this.lengthInput.val(),
							notes: this.notesInput.val()
						});
					}else{
						this.notify('Enter account login or email.');
						var errorClass = this.options.validation.errorClass;
						this.options.validation.highlight(this.loginInput, errorClass);
						this.options.validation.highlight(this.emailInput, errorClass);
						this.loginInput.focus();
					}
				}
			});
			return this;
		},

		logout: function(){
			store.logout();
		},

		onLogout: function(){
			if('dashboard' === router.getRoute().name){
				router.setRoute('home', {
					credentials: _.pick(credentials, 'uri', 'email', 'salt', 'oneTimeSalt')
				});
			}
			credentials = undefined;
			store = undefined;
			this.isLoggedIn = false;
			this.trigger('logout');
		},

		setOptions: function(options){
			if(options.credentials){
				if(store){
					store.off();
					store = undefined;
				}
				credentials = options.credentials;
			}
			if(store){
				store.trigger('ready', {listening: true});
				return;
			}
			if(_.isEmpty(credentials)){
				router.setRoute('home');
				return;
			}
			this.trigger('appStatus', {
				email: credentials.email
			});
			this.isLoggedIn = true;
			var that = this;
			store = new Store()
				.on({
					constructionDecryption: function(){
						that.trigger('appStatus', {
							text: 'Decrypting…',
							gauge: true
						});
					},
					logout: _.bind(this.onLogout, this),
					ready: _.bind(this.onStoreReady, this),
					savingEncryption: function(){
						that.trigger('appStatus', {
							text: 'Encrypting…',
							gauge: true
						});
					},
					savingFetching: function(){
						that.trigger('appStatus', {
							text: 'Fetching…',
							gauge: true
						})
					},
					savingDone: function(){
						that.trigger('appStatus', {
							text: 'Saved at ' + new Date().toLocaleTimeString()
						})
					},
					savingFail: function(xhr){
						var options = {
							error: true
						};
						if(!xhr.status){
							options.text = 'Saving failed. Check your internet connection.';
						}else if(401 === xhr.status){
							options.text = 'Unauthorized. <a href="' + router.getRoute('home').getFragment() + '">Login</a>';
						}else if(500 === xhr.status){
							options.text = 'Server error during saving.';
						}else{
							options.text = 'Unknown error during saving.';
						}
						that.trigger('appStatus', options)
					}
				})
				.setCredentials(credentials)
			;
		},

		render: function(){
			return _.template($('.dashboard-template').html());
		},

		search: function(query){
			if(this.query === query){
				return;
			}
			var accounts;
			this.query = query;
			if(query){
				accounts = store.accounts.filter(_.bind(this.searchFilter, this));
				accounts = new Accounts(accounts);
			}else{
				accounts = store.accounts;
			}
			this.setSearchResults(accounts);
		},

		searchFilter: function(account){
			return account.contains(this.query);
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
			view.render();
			this.searchResultsElement.append(view.$el);
			if(options.effects){
				view.$el
					.hide()
					.slideDown('fast')
				;
			}
		},

		setSearchResults: function(searchResults){
			this.searchResults = searchResults;
			this.searchResultsElement.html('');
			if(this.searchResults.length){
				var that = this;
				this.searchResults.each(function(model){
					that.addSearchResult(model, {
						effects: false
					})
				});
				this.updateSearchResultsColors();
			}else{
				this.showNoSearchResults({
					effects: false
				});
			}
		},

		updateSearchResultsColors: function(){
			this.searchResults.each(function(account, i){
				var even = !!(i % 2);
				account.set('even', even);
				account.trigger('changeorder', even);
			});
		},

		showNoSearchResults: function(options){
			var element = $(this.query ? '.no-search-results-template' : '.no-accounts-template');
			options = options || {};
			element = $(element.html());
			this.searchResultsElement.append(element);
			if(options.effects !== false){
				element
					.hide()
					.slideDown('fast')
				;
			}
		},

		hideNoSearchResults: function(options){
			var element = this.searchResultsElement.find('.no-search-results');
			if(false === options.effects){
				element.remove();
			}else{
				element
					.slideUp({
						duration: 'fast',
						complete: function(){
							element.remove();
						}
					})
				;
			}
		},

		onSettingsLinkClick: function(e){
			e.preventDefault();
			router.setRoute('settings', {
				credentials: credentials,
				store: store
			});
		},

		onStoreReady: function(options){
			options || (options = {});
			this.trigger('appStatus', null);
			if(this.deferredQuery){
				this.search(this.deferredQuery);
				delete this.deferredQuery;
			}else{
				this.setSearchResults(store.accounts);
			}
			if(!options.listening){
				store.accounts.on('checked', this.onAccountChecked, this);
				store.accounts.on('add', this.onAccountAdd, this);
				store.accounts.on('removemodels', this.onAccountsRemove, this);
			}
			if(!store.accounts.length){
				this.accountForm.accountForm('focus');
			}
			this.accountForm.accountForm('value', 'login', store.logins.suggest().get('login'));
			this.accountForm.accountForm('value', 'email', store.emails.suggest().get('email'));
			this.accountForm.accountForm('value', 'alphabet', store.accounters.suggestPasswordAlphabet());
			this.accountForm.accountForm('value', 'length', store.accounters.suggestPasswordLength());
			this.accountForm.accountForm('generatePassword');
		}
	});
})(jQuery);
