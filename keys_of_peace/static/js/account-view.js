'use strict';
(function($, global){
	var AccountView = global.AccountView = Backbone.View.extend({
		render: function(){
			var element = $(
				AccountView.template({
					login: this.model.get('login'),
					password: this.model.get('password')
				})
			);
			var site = this.model.get('accounter').get('mainSite');
			var loginRow = element.find('.account-login-row');
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
})(jQuery, this);
