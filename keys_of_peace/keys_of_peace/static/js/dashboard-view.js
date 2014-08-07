(function($){
	var credentials;
	var store;

	var DashboardView = window.DashboardView = Backbone.View.extend({
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
		
		delegateEvents: function(){
			DashboardView.__super__.delegateEvents.apply(this, arguments);
			this.$el.on('click.dashboardview', '.checked-accounts-menu-close', _.bind(this.onCheckedAccountsMenuCloseClick, this));
			this.$el.on('click.dashboardview', '.checked-accounts-menu-select-all', _.bind(this.onCheckedAccountsMenuSelectAllClick, this));
			this.$el.on('click.dashboardview', '.checked-accounts-menu-remove', _.bind(this.onCheckedAccountsMenuRemoveClick, this));

			setTimeout(_.bind(this.onLogout, this), CONFIGURATION.LOGOUT_TIME * 1000);
		},

		undelegateEvents: function(){
			DashboardView.__super__.undelegateEvents.apply(this, arguments);
			this.$el.off('click.dashboardview');
		},

		remove: function(){
			this.undelegateEvents();
			this.$el
				.removeClass('body-wrap-daily')
				.html('')
			;
		},

		render: function(){
			return _.template(
				$('.dashboard-template').html(),
				{
					csrftoken: $.cookie('csrftoken')
				}
			);
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

		setStoreStatus: function(options){
			if(!this.storeStatus){
				this.storeStatus = $('<div class="status">');
				this.bar.append(this.storeStatus);
			}
			if(options.error){
				this.storeStatus.addClass('status-error');
			}else{
				this.storeStatus.removeClass('status-error');
			}
			if(options.gauge){
				this.storeStatus.addClass('status-gauge');
			}else{
				this.storeStatus.removeClass('status-gauge');
			}
			this.storeStatus.html(options.text);
			this.storeStatus
				.position({
					my: 'center top',
					at: 'center bottom+5',
					of: this.bar
				})
			;
		},

		clearStoreStatus: function(){
			if(this.storeStatus){
				this.storeStatus.remove();
				delete this.storeStatus;
			}
		},

		onLogout: function(){
			router
				.set('routeName', 'home')
				.get('route').view.setCredentials(credentials)
			;
		},

		onStoreConstructionDone: function(){
			this.clearStoreStatus();

			store.accounts.on('checked', this.onAccountChecked, this);
			this.setSearchResults(store.accounts);
			store.accounts.on('add', this.onAccountAdd, this);
			store.accounts.on('removemodels', this.onAccountsRemove, this);
			if(!store.accounts.length){
				this.accountForm.accountForm('focus');
			}
			this.accountForm.accountForm('value', 'login', store.logins.last().get('login'));
			this.accountForm.accountForm('value', 'email', store.emails.last().get('email'));
			this.accountForm.accountForm('value', 'alphabet', store.accounters.suggestPasswordAlphabet());
			this.accountForm.accountForm('value', 'length', store.accounters.suggestPasswordLength());
			this.accountForm.accountForm('generatePassword');
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

		setCredentials: function(_credentials){
			credentials = _credentials;
			this.$('.bar-email')
				.text(credentials.email)
			;
			store.setCredentials(credentials);
		},

		setElement: function(element){
			DashboardView.__super__.setElement.call(this, element);
			this.$el
				.addClass('body-wrap-daily')
				.html(this.render())
			;

			this.$('.dashboard-title').qtip();

			this.bar = this.$('.bar');

			var that = this;
			store = new Store().on({
				constructionDecryption: function(){
					that.setStoreStatus({
						text: 'Decrypting…',
						gauge: true
					});
				},
				constructionDone: _.bind(this.onStoreConstructionDone, this),
				savingEncryption: function(){
					that.setStoreStatus({
						text: 'Encrypting…',
						gauge: true
					});
				},
				savingFetching: function(){
					that.setStoreStatus({
						text: 'Fetching…',
						gauge: true
					})
				},
				savingDone: function(){
					that.setStoreStatus({
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
					that.setStoreStatus(options)
				}
			});

			this.checkedAccounts = new Accounts();

			var searchForm = this.$('.search-form');
			searchForm.form({
				focus: true,
				submit: function(){
					that.search(searchForm.find('[name=query]').val());
				}
			});
			searchForm.on('formdelayedchange', function(){
				that.search(searchForm.find('[name=query]').val());
			});

			this.searchResultsElement = this.$('.search-results');

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

				submit: function(){
					if(this.loginInput.val() || this.emailInput.val()){
						store.accounts.create({
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
		},

		updateSearchResultsColors: function(){
			this.searchResults.each(function(account, i){
				var even = !!(i % 2);
				account.set('even', even);
				account.trigger('changeorder', even);
			});
		}
	});
})(jQuery);
