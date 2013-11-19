'use strict';
(function($, global){
	var AccountView = global.AccountView = Backbone.View.extend({
		events: {
			'click .account-options-link': 'onOptionsLinkClick',
			'click .account-remove-link': 'onRemoveClick',
			'mouseleave .account-options': 'onOptionsMouseleave',
			'click .account-options': 'onOptionsClick'
		},

		initialize: function(){
			this.model.on('remove', this.onModelRemove, this);
		},
		
		render: function(){
			this.setElement(
				$(
					AccountView.template({
						login: this.model.get('login'),
						password: this.model.get('password')
					})
				)
			);
			
			var site = this.model.get('accounter').get('mainSite');
			var loginRow = this.$('.account-login-row');
			var email = this.model.get('email');
			if(email && email !== this.model.get('login')){
				var emailRow = $('<p>');
				emailRow.html('Email: ' + email);
				loginRow.after(emailRow);
			}
			if(site){
				var siteLink = $('<a class="account-accounter-link">')
					.attr('href', site.get('host'))
					.html(site.get('name'))
				;
				this.$el.prepend(siteLink);
			}
			
			var password = this.$('.account-password')
				.password({
					target: this.$('.account-password-row')
				})
			;

			return this;
		},

		onOptionsLinkClick: function(e){
			e.preventDefault();
			this.showOptions();
		},

		onRemoveClick: function(e){
			e.preventDefault();
			this.model.destroy();
		},

		onOptionsMouseleave: function(){
			this.hideOptions();
		},

		onOptionsClick: function(){
			this.hideOptions();
		},

		onModelRemove: function(){
			this.remove();
		},

		showOptions: function(){
			this.$('.account-options')
				.show()
				.position({
					my: 'center bottom',
					at: 'center top-10',
					of: this.$('.account-options-link')
				})
			;
		},

		hideOptions: function(){
			this.$('.account-options')
				.hide()
			;
		},

		remove: function(){
			this.$el
				.slideUp({
					duration: 'fast',
					complete: _.bind(AccountView.__super__.remove, this)
				})
			;
		}
	});

	$(function(){
		AccountView.template = _.template($('.account-template').html());
	});
})(jQuery, this);
