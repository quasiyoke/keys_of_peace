'use strict';
(function($){
	var credentials;
	var store;
	
	window.SettingsView = Backbone.View.extend({
		events: {
			'change .accounter-remote-autocomplete': 'onAccounterRemoteAutocompleteChange'
		},

		onAccounterRemoteAutocompleteChange: function(e){
			store.accounters.remoteAutocomplete = this.accounterRemoteAutocompleteInput.prop('checked');
			store.save();
		},
		
		setElement: function(el){
			SettingsView.__super__.setElement.call(this, el);
			this.$el.html(this.render());
			var view = this;
			this.exportData = $('.export-data');
			this.accounterRemoteAutocompleteInput = this.$('.accounter-remote-autocomplete');
			this.passwordChangeForm = this.$('.password-change-form')
				.form({
					validation: {
						rules: {
							current_password: {
								equalToValue: function(){
									return credentials.password;
								},
								required: true
							},
							new_password: {required: true},
							new_password_confirmation: {
								equalTo: '.password-change-form [name=new_password]',
								required: true
							}
						},
						messages: {
							current_password: {
								equalToValue: 'Invalid current password.',
								required: 'Enter your current main password.'
							},
							new_password: {required: 'Enter your new main password.'},
							new_password_confirmation: {
								equalTo: 'Passwords don\'t match',
								required: 'Repeat your new main password.'
							}
						}
					},
					
					submit: function(_form, callback){
						var form = this;
						var events = {
							passwordChangeEncryption: onEncryption,
							passwordChangeHashing: onHashing,
							passwordChangeFetching: onFetching,
							passwordChangeDone: onDone,
							passwordChangeFail: onFail
						};
						var deferred = $.Deferred();
						store
							.on(events)
							.setPassword(view.passwordChangeForm.find('[name=new_password]').val())
						;
						function onEncryption(){
							form.setStatus({
								text: 'Encrypting accounts with new password…',
								'class': 'gauge'
							});
						}
						function onHashing(){
							form.setStatus({
								text: 'Hashing new password…',
								'class': 'gauge'
							});
						}
						function onFetching(){
							form.setStatus({
								text: 'Fetching…',
								'class': 'gauge'
							});
						}
						function onDone(){
							store.off(events);
							deferred.resolve.apply(deferred, arguments);
						}
						function onFail(){
							store.off(events);
							deferred.reject.apply(deferred, arguments);
						}
						return deferred.promise();
					},

					always: function(xhr){
						this.clearStatus();
					},

					done: function(response){
						_.each(['current_password', 'new_password', 'new_password_confirmation'], function(name){
							view.passwordChangeForm[name].val('');
						});
						this.notify({
							message: 'Password was successfully changed.',
							'class': 'ok'
						});
					}
				})
			;
			_.each(['current_password', 'new_password', 'new_password_confirmation'], function(name){
				var input = view.passwordChangeForm.find('[name=' + name + ']');
				view.passwordChangeForm[name] = input
					.password()
				;
			});
			return this;
		},

		onLogout: function(){
			if('settings' === router.getRoute().name){
				router.setRoute('home');
			}
		},
		
		setOptions: function(options){
			credentials = options.credentials;
			store = options.store;
			if(_.isEmpty(credentials) || _.isEmpty(store)){
				router.setRoute('home');
				return;
			}
			store.on('logout', this.onLogout, this);
			this.exportData.text(JSON.stringify(store.toJSON(), null, 2));
			this.accounterRemoteAutocompleteInput.prop('checked', store.accounters.remoteAutocomplete);
		},

		remove: function(){
			SettingsView.__super__.remove.call(this);
			credentials = undefined;
			store = undefined;
		},
		
		render: function(){
			return _.template($('.settings-template').html());
		}
	});
})(jQuery);
