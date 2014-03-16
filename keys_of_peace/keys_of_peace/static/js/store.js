(function(global){
	var Model = Backbone.RelationalModel.extend({
		initialize: function(attrs, options){
			if(!this.validationError && !this.has('id')){
				this.set('id', this.collection.getUniqueId());
			}
			var created = this.get('created');
			this.set('created', created ? new Date(created) : new Date());
		},
		
		increment: function(key, options){
			return this.set(key, this.attributes[key] + 1, options);
		},

		save: $.noop
	});

	Backbone.sync = $.noop;


	var Account = global.Account = Model.extend({
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
			return this.get('login').contains(s) || (this.has('email') && this.get('email').contains(s)) || (this.has('notes') && this.get('notes').contains(s)) ||
				this.get('accounter').contains(s);
		}
	});


	var Accounter = global.Accounter = Model.extend({
		relations: [
			{
				type: Backbone.HasOne,
				key: 'mainSite',
				relatedModel: 'Site',
				includeInJSON: 'id'
			}
		],

		initialize: function(attrs, options){
			Accounter.__super__.initialize.apply(this, arguments);
			this.get('accounts')
				.on('destroy', this.onAccountDestroy, this)
			;
		},

		onAccountDestroy: function(account){
			if(!this.get('accounts').length){
				this.destroy();
			}
		},

		contains: function(s){
			return (this.has('name') && this.get('name').contains(s)) || this.get('sites').containsQuery(s);
		}
	});
	

	var Email = global.Email = Model.extend();
	Email.getFirstAttributes = function(options){
		return {
			email: options.email,
			count: 1
		};
	};


	var Login = global.Login = Model.extend();
	Login.getFirstAttributes = function(options){
		return {
			login: /^[^@]+/.exec(options.email)[0],
			used: 1
		};
	};


	var Site = global.Site = Model.extend({
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
		
		validate: function(attrs, options){
			if(!$.validator.methods.url.call({optional: $.noop}, attrs.host)){
				return 'Host isn\'t a correct URL.';
			}
		},

		contains: function(s){
			return this.get('host').contains(s) || this.get('name').contains(s);
		}
	});

	
	var Collection = Backbone.Collection.extend({
		initialize: function(models, options){
			options || (options = {});
			this.store = options.store;
			if('order' in options){
				this.order = options.order;
			}else{
				this.order = 'frequency';
				if(this.model.getFirstAttributes){
					models.push(this.model.getFirstAttributes(options));
				}
			}
		},

		getUniqueId: function(){
			var id;
			do {
				id = Math.round(Math.random() * 1e9)
			} while (this.get(id));
			return id;
		},

		/**
			 Tries to find instance and increment its `used` field. If instance not found, tries to create it.
		*/
		used: function(attrs){
			var instance = this.findWhere(attrs);
			if(instance){
				instance.increment('used');
			}else{
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
			json.objects = Collection.__super__.toJSON.call(this);
			return json;
		}
	});
	
	
	var Accounts = global.Accounts = Collection.extend({
		model: Account,
		
		create: function(attrs, options){
			var accounter;			
			var site = this.store.sites.used({
				host: attrs.link
			});
			if(site){
				accounter = site.get('accounter');
			}
			/*
				If no site was found or site was created just now and has no `accounter`.
				@see Collection.used
			*/
			if(!accounter){
				accounter = this.store.accounters.create({
					name: attrs.link,
					passwordAlphabet: attrs.passwordAlphabet,
					passwordLength: attrs.passwordLength
				});
				if(site){
					site.set('accounter', accounter);
					accounter.set('mainSite', site);
				}
			}
			return Accounts.__super__.create.call(this, {
				accounter: accounter,
				login: attrs.login,
				email: attrs.email,
				password: attrs.password,
				notes: attrs.notes
			}, options);
		}
	});

	
	var Accounters = global.Accounters = Collection.extend({
		model: Accounter,

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
	
	
	var Emails = global.Emails = Collection.extend({
		model: Email
	});


	var Logins = global.Logins = Collection.extend({
		model: Login
	});


	var Sites = global.Sites = Collection.extend({
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
		}
	});
	
	
	var Store = global.Store = function(){};

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
					arguments: [data, credentials.password],
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
		},
		
		initialize: function(data, callback){
			var options;

			options = _.extend({store: this}, data.accounts, this.credentials);
			this.accounts = new Accounts(data.accounts.objects, options)
				.on('add', this._onAccountsAdd, this)
				.on('remove', this._onAccountsRemove, this)
			;
			
			options = _.extend({store: this}, data.accounters, this.credentials);
			this.accounters = new Accounters(data.accounters.objects, options);

			options = _.extend({store: this}, data.emails, this.credentials);
			this.emails = new Emails(data.emails.objects, options);

			options = _.extend({store: this}, data.logins, this.credentials);
			this.logins = new Logins(data.logins.objects, options);

			options = _.extend({store: this}, data.sites, this.credentials);
			this.sites = new Sites(data.sites.objects, options);

			this.trigger('constructionDone');
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

		save: function(){
			var that = this;
			
			var fetch = function(string){
				that.trigger('savingFetching');
				Api.fetch({
					uri: that.credentials.uri,
					type: 'PUT',
					data: {	data: string}
				})
					.always(function(xhr){that.trigger('savingAlways', xhr)})
					.done(function(data){that.trigger('savingDone', data)})
					.fail(function(xhr){that.trigger('savingFail', xhr)})
				;
			};
			
			this.trigger('savingEncryption');
			this.credentials.data = this.toJSON();
			Api.make({
				method: 'encrypt',
				arguments: [this.credentials.data, this.credentials.password],
				callback: fetch
			});
		}
	});
})(this);
