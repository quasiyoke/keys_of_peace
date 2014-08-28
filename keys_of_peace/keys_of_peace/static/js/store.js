'use strict';
(function($){
	var Model = Backbone.RelationalModel.extend({
		initialize: function(attrs, options){
			if(!this.validationError && !this.has('id')){
				this.set('id', this.collection.getUniqueId());
			}
			var created = this.get('created');
			this.set('created', created ? new Date(created) : new Date());
		},
		
		increment: function(key, options){
			return this.set(key, (this.attributes[key] || 0) + 1, options);
		},

		toJSON: function(){
			if(this.isObsolete()){
				return;
			}
			return Model.__super__.toJSON.apply(this, arguments);
		},

		isObsolete: $.noop,

		save: $.noop
	});

	Backbone.sync = $.noop;


	window.Account = Model.extend({
		relations: [
			{
				type: Backbone.HasOne,
				key: 'accounter',
				relatedModel: 'Accounter',
				collectionType: 'Accounters',
				includeInJSON: 'id',
				reverseRelation: {
					key: 'accounts',
					includeInJSON: false
				}
			}
		],

		contains: function(s){
			return this.get('login').contains(s) || (this.has('email') && this.get('email').contains(s)) || (this.has('notes') && this.get('notes').contains(s)) ||	this.get('accounter').contains(s);
		},

		toJSON: function(){
			var json = Account.__super__.toJSON.apply(this, arguments);
			if(!json){
				return;
			}
			delete json.even;
			return json;
		}
	});


	window.Accounter = Model.extend({
		relations: [
			{
				type: Backbone.HasOne,
				key: 'mainSite',
				relatedModel: 'Site',
				includeInJSON: 'id'
			}
		],

		contains: function(s){
			return (this.has('name') && this.get('name').contains(s)) || this.get('sites').containsQuery(s);
		},

		isObsolete: function(){
			return !this.collection.store.accounts.findWhere({accounter: this});
		}
	});
	

	window.Email = Model.extend({
		contains: function(s){
			return this.get('email').contains(s);
		},
		
		isObsolete: function(){
			return !this.collection.store.accounts.findWhere({email: this.get('email')});
		}
	});


	window.Login = Model.extend({
		contains: function(s){
			return this.get('login').contains(s);
		},
		
		isObsolete: function(){
			return !this.collection.store.accounts.findWhere({login: this.get('login')});
		}
	});


	window.Site = Model.extend({
		relations: [
			{
				type: Backbone.HasOne,
				key: 'accounter',
				relatedModel: 'Accounter',
				collectionType: 'Accounters',
				includeInJSON: 'id',
				reverseRelation: {
					key: 'sites',
					collectionType: 'Sites',
					includeInJSON: false
				}
			}
		],

		initialize: function(){
			Site.__super__.initialize.apply(this, arguments);
			var accounter = this.get('accounter');
			accounter && this.onAccounter(accounter);
			this.on('change:accounter', this.onAccounterChange, this);
		},

		onAccounter: function(accounter){
			accounter.on('destroy', this.onAccounterDestroy, this);
		},

		onAccounterChange: function(accounter){
			this.onAccounter(accounter);
		},

		onAccounterDestroy: function(accounter){
			this.destroy();
		},

		contains: function(s){
			return this.get('host').contains(s) || this.get('name').contains(s);
		},

		isObsolete: function(){
			return this.get('accounter').isObsolete();
		},
		
		validate: function(attrs, options){
			if(!$.validator.methods.url.call({optional: $.noop}, attrs.host)){
				return 'Host isn\'t a correct URL.';
			}
		}
	});

	
	var Collection = Backbone.Collection.extend({
		initialize: function(models, options){
			options || (options = {});
			this.store = options.store;
			this.order = options.order || 'frequency';
		},

		getUniqueId: function(){
			do {
				var id = Math.round(Math.random() * 1e9)
			} while (this.get(id));
			return id;
		},

		remove: function(models, options){
			options = options || {};
			var retval = Collection.__super__.remove.call(this, models, options);
			this.trigger('removemodels', models);
			return retval
		},

		/**
			 Tries to find instance and increment its `used` field. If instance not found, tries to create it.
		*/
		used: function(attrs){
			var findAttrs = attrs;
			if(this.usedFindAttrs){
				findAttrs = _.pick(findAttrs, this.usedFindAttrs);
			}
			var instance = this.findWhere(findAttrs);
			if(instance){
				instance.increment('used');
				instance.set(attrs);
			}else{
				attrs.used || (attrs.used = 1);
				instance = this.create(attrs, {
					validate: true
				});
			}
			return instance;
		},

		toJSON: function(){
			var json = {
				order: this.order
			};
			json.objects = _.compact(Collection.__super__.toJSON.call(this));
			return json;
		}
	});
	
	
	window.Accounts = Collection.extend({
		model: Account,
		
		create: function(attrs, options){
			var accounter;			
			var site = this.store.sites.used({
				host: attrs.link
			});
			if(site){
				accounter = site.get('accounter');
			}
			if(accounter){
				accounter.set(_.pick(attrs, ['passwordAlphabet', 'passwordLength']));
			}else{
				/*
					If no site was created or site was created just now and has no `accounter`.
					@see Collection.used
				*/
				accounter = this.store.accounters.used({
					name: site ? site.get('name') : attrs.link,
					passwordAlphabet: attrs.passwordAlphabet,
					passwordLength: attrs.passwordLength
				});
				if(site){
					site.set('accounter', accounter);
					accounter.set('mainSite', site);
				}
			}
			attrs.login && this.store.logins.used({login: attrs.login});
			attrs.email && this.store.emails.used({email: attrs.email});
			return Accounts.__super__.create.call(this, {
				accounter: accounter,
				login: attrs.login,
				email: attrs.email,
				password: attrs.password,
				notes: attrs.notes
			}, options);
		}
	});

	
	window.Accounters = Collection.extend({
		model: Accounter,

		usedFindAttrs: ['name'],

		suggestPasswordAlphabet: function(){
			var last = this.last();
			if(last){
				return last.get('passwordAlphabet');
			}else{
				return 700;
			}
		},

		suggestPasswordLength: function(){
			var last = this.last();
			if(last){
				return last.get('passwordLength');
			}else{
				return 20;
			}
		}
	});
	
	
	window.Emails = Collection.extend({
		model: Email,

		suggest: function(){
			var email = this.last();
			if(!email){
				email = this.create({
					email: this.store.credentials.email
				});
			}
			return email;
		}
	});


	window.Logins = Collection.extend({
		model: Login,

		suggest: function(){
			var login = this.last();
			if(!login){
				login = this.create({
					login: /^[^@]+/.exec(this.store.credentials.email)[0]
				});
			}
			return login;
		}
	});


	window.Sites = Collection.extend({
		model: Site,

		containsQuery: function(s){
			for(var i=this.length; i--;){
				if(this.models[i].contains(s)){
					return true;
				}
			}
			return false;
		},
		
		create: function(attrs, options){
			var model = Sites.__super__.create.call(this, attrs, options);
			if(model){
				var match = /((https?|s?ftp):\/\/(www2?\.)?)([^\/\?]+)/.exec(model.get('host'));
				model.set('name', match ? match[4] : model.get('host'));
			}
			return model;
		},

		used: function(attrs, options){
			var site = Sites.__super__.used.call(this, attrs, options);
			if(!site){
				return;
			}
			var accounter = site.get('accounter');
			if(accounter){
				accounter.increment('used');
			}
			return site;
		}
	});
	
	
	window.Store = function(){};

	_.extend(Store.prototype, Backbone.Events, {
		setCredentials: function(credentials){
			this.credentials = credentials;
			var data = credentials.data;
			if(data){
				var that = this;

				var parse = function(data){
					that.initialize(JSON.parse(data));
				};

				this.trigger('constructionDecryption');
				Api.make({
					method: 'decrypt',
					args: [data, credentials.password],
					callback: parse
				});
			}else{
				data = {
					accounts: {
						objects: []
					},
					accounters: {
						objects: []
					},
					emails: {
						objects: []
					},
					logins: {
						objects: []
					},
					sites: {
						objects: []
					}
				};
				this.initialize(data);
			}
			return this;
		},
		
		initialize: function(data, callback){
			var options;

			options = _.extend({store: this}, data.accounts, this.credentials);
			this.accounts = new Accounts(data.accounts.objects, options)
				.on('add', this._onAccountsAdd, this)
				.on('removemodels', this._onAccountsRemove, this)
			;
			
			options = _.extend({store: this}, data.accounters, this.credentials);
			this.accounters = new Accounters(data.accounters.objects, options);

			options = _.extend({store: this}, data.emails, this.credentials);
			this.emails = new Emails(data.emails.objects, options);

			options = _.extend({store: this}, data.logins, this.credentials);
			this.logins = new Logins(data.logins.objects, options);

			options = _.extend({store: this}, data.sites, this.credentials);
			this.sites = new Sites(data.sites.objects, options);

			this.postponeLogout();

			this.ready = true;
			this.trigger('ready');
		},
		
		_onAccountsAdd: function(){
			this.save();
		},
		
		_onAccountsRemove: function(){
			this.save();
		},

		toJSON: function(){
			return {
				accounts: this.accounts.toJSON(),
				accounters: this.accounters.toJSON(),
				emails: this.emails.toJSON(),
				logins: this.logins.toJSON(),
				sites: this.sites.toJSON()
			};
		},

		logout: function(){
			this.trigger('logout');
			this.off();
		},

		onLogoutTimeout: function(){
			this.logout();
			delete this.logoutInterval;
		},

		postponeLogout: function(){
			if(this.logoutInterval){
				clearInterval(this.logoutInterval);
			}
			this.logoutInterval = setTimeout(_.bind(this.onLogoutTimeout, this), CONFIGURATION.LOGOUT_TIME * 1000);
		},

		setPassword: function(newPassword){
			this.postponeLogout();
			var that = this;
			var encryptedData, passwordHash, newSalt;

			encrypt();
			function encrypt(){
				that.trigger('passwordChangeEncryption');
				that.credentials.data = that.toJSON();
				Api.make({
					method: 'encrypt',
					args: [that.credentials.data, newPassword],
					callback: hashWithOneTimeSalt
				});
			}
			function hashWithOneTimeSalt(_encryptedData){
				that.trigger('passwordChangeHashing');
				encryptedData = _encryptedData;
				Api.make({
					method: 'hash',
					args: [that.credentials.passwordHash, that.credentials.oneTimeSalt],
					callback: hashWithEncryptedData
				});
			}
			function hashWithEncryptedData(_passwordHash){
				Api.make({
					method: 'hash',
					args: [encryptedData, _passwordHash],
					callback: hashNewPassword
				});
			}
			function hashNewPassword(_passwordHash){
				passwordHash = _passwordHash;
				newSalt = Crypto.getSalt();
				Api.make({
					method: 'hash',
					args: [newPassword, newSalt],
					callback: fetch
				});
			}
			function fetch(newPasswordHash){
				that.trigger('passwordChangeFetching');
				Api.fetch({
					uri: that.credentials.uri,
					type: 'PATCH',
					data: {
						data: encryptedData,
						one_time_salt: Crypto.toString(that.credentials.oneTimeSalt),
						password_hash: Crypto.toString(passwordHash),
						salt: Crypto.toString(that.credentials.salt),
						new_password_hash: Crypto.toString(newPasswordHash),
						new_salt: Crypto.toString(newSalt)
					}
				})
					.always(function(xhr){
						that.trigger('passwordChangeAlways', xhr);
					})
					.done(function(data){
						that.credentials.oneTimeSalt = Crypto.fromString(data.one_time_salt);
						that.credentials.password = newPassword;
						that.credentials.passwordHash = newPasswordHash;
						that.credentials.salt = newSalt;
						that.trigger('passwordChangeDone', data);
					})
					.fail(function(xhr){
						that.trigger('passwordChangeFail', xhr);
						if(401 === xhr.status){
							/* one_time_salt was rotated, we should update it. */
							var response = JSON.parse(xhr.responseText);
							that.credentials.oneTimeSalt = Crypto.fromString(response.one_time_salt);
							return true;
						}
					})
				;
			}
		},

		save: function(){
			this.postponeLogout();
			var that = this;
			encrypt();

			function encrypt(){
				that.trigger('savingEncryption');
				that.credentials.data = that.toJSON();
				Api.make({
					method: 'encrypt',
					args: [that.credentials.data, that.credentials.password],
					callback: hashWithOneTimeSalt
				});
			}
			function hashWithOneTimeSalt(encryptedData){
				that.trigger('savingHashing');
				Api.make({
					method: 'hash',
					args: [that.credentials.passwordHash, that.credentials.oneTimeSalt],
					callback: _.partial(hashWithEncryptedData, encryptedData)
				});
			}
			function hashWithEncryptedData(encryptedData, passwordHash){
				Api.make({
					method: 'hash',
					args: [encryptedData, passwordHash],
					callback: _.partial(fetch, encryptedData)
				});
			}
			function fetch(encryptedData, passwordHash){
				that.trigger('savingFetching');
				Api.fetch({
					uri: that.credentials.uri,
					type: 'PATCH',
					data: {
						data: encryptedData,
						one_time_salt: Crypto.toString(that.credentials.oneTimeSalt),
						password_hash: Crypto.toString(passwordHash),
						salt: Crypto.toString(that.credentials.salt)
					}
				})
					.always(function(xhr){
						that.trigger('savingAlways', xhr);
					})
					.done(function(data){
						that.trigger('savingDone', data);
						that.credentials.oneTimeSalt = Crypto.fromString(data.one_time_salt);
					})
					.fail(function(xhr){
						that.trigger('savingFail', xhr);
						if(401 === xhr.status){
							/* one_time_salt was rotated, we should update it. */
							var response = JSON.parse(xhr.responseText);
							that.credentials.oneTimeSalt = Crypto.fromString(response.one_time_salt);
							return true;
						}
					})
				;
			}
		}		
	});
})(jQuery);
