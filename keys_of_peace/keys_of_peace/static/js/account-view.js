'use strict';
(function($, global){
	var AccountView = global.AccountView = Backbone.View.extend({
		events: {
			'click .account-additional-show': 'onAdditionalShowClick',
			'change .account-check': 'onCheckChange',
			'mousedown .account-password-show': 'onPasswordShowMousedown',
			'mouseup .account-password-show': 'onPasswordShowMouseup',
		},

		initialize: function(){
			this.model.on('check', this.onModelCheck, this);
			this.model.on('changeorder', this.onModelChangeOrder, this);
			this.model.on('remove', this.onModelRemove, this);
		},
		
		render: function(){
			var email = this.model.get('email');
			var login = this.model.get('login') || email;
			var notes = this.model.get('notes');
			this.setElement(
				$(
					AccountView.template({
						login: login.shorten(),
						password: this.model.get('password').shorten()
					})
				)
			);

			this.check = this.$('.account-check');
			var accounter = this.model.get('accounter') || new Backbone.Model();
			var site = accounter.get('mainSite');
			var loginWrap = this.$('.account-login-wrap');
			loginWrap.find('.account-login')
				.clipboard({
					data: login
				})
			;
			var title = this.$('.account-title');
			if(site){
				var siteLink = $('<a class="account-accounter-link account-title">')
					.attr('href', site.get('host'))
					.html(site.get('name').shorten())
				;
				title.append(siteLink);
			}else{
				title.html(accounter.get('name'));
			}
			
			this.password = this.$('.account-password')
				.password()
				.clipboard({
					data: this.model.get('password'),
					tip: 'Click to copy password'
				})
			;

			if(notes || (email && email !== login)){
				this.additionalShow = $('<td class="account-additional-show-wrap"><button class="account-additional-show"></button></td>')
					.appendTo(this.$el)
					.find('.account-additional-show')
				;
			}
			return this;
		},

		renderAdditional: function(){
			var email = this.model.get('email');
			var login = this.model.get('login') || email;
			var notes = this.model.get('notes');
			this.additional = $('<tr class="account-additional"><td class="account-additional-wrap" colspan="6"><table>')
				.insertAfter(this.$el)
			;
			if(this.model.get('even')){
				this.additional.addClass('account-even');
			}
			var additional = this.additional.find('table');
			if(email && email !== login){
				$('<tr>')
					.append('<th class="account-additional-title">Email:</th>')
					.append('<td>' + email + '</td>')
					.appendTo(additional)
					.find('td')
					.clipboard()
				;
			}
			if(notes){
				$('<tr>')
					.append('<th class="account-additional-title">Notes:</th>')
					.append('<td>' + notes + '</td>')
					.appendTo(additional)
				;
			}			
		},

		onAdditionalShowClick: function(e){
			e.preventDefault();
			if(this.additional && this.additional.is(':visible')){
				this.additionalShow.removeClass('account-additional-show-undo');
				this.hideAdditional();
			}else{
				this.additionalShow.addClass('account-additional-show-undo');
				this.showAdditional();
			}			
		},

		onCheckChange: function(){
			this.model.collection.trigger('checked', this.model, this.check.prop('checked'));
		},

		onPasswordShowMousedown: function(e){
			e.preventDefault();
			this.password.password('option', 'mode', 'text');
		},

		onPasswordShowMouseup: function(e){
			e.preventDefault();
			this.password.password('option', 'mode', 'password');
		},

		onModelCheck: function(checked){
			this.check.prop('checked', checked);
		},

		onModelChangeOrder: function(even){
			if(even){
				this.$el.addClass('account-even');
				if(this.additional){
					this.additional.addClass('account-even');
				}
			}else{
				this.$el.removeClass('account-even');
				if(this.additional){
					this.additional.removeClass('account-even');
				}
			}
		},

		onModelRemove: function(){
			this.remove();
		},

		showAdditional: function(){
			if(!this.additional){
				this.renderAdditional();
			}
			this.additional
				.hide()
				.slideDown({
					duration: 'fast',
					queue: false
				})
			;
		},

		hideAdditional: function(){
			this.additional
				.slideUp({
					duration: 'fast',
					queue: false
				})
			;
		},

		remove: function(){
			this.$el
				.add(this.additional)
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
