(function($){
	var credentials;
	
	RegistrationSuccessView = Backbone.View.extend({
		events: {
			'click .registration-success-dashboard-link': 'onClickDashboard'
		},

		onClickDashboard: function(e){
			e.preventDefault();
			router.setRoute('dashboard', {credentials: credentials});
		},

		setElement: function(el){
			RegistrationSuccessView.__super__.setElement.call(this, el);
			this.$el.html(this.render());
			return this;
		},

		setOptions: function(options){
			credentials = options.credentials;
			if(_.isEmpty(credentials)){
				router.setRoute('home');
			}else{
				this.$('.registration-success-email').text(credentials.email);
			}
		},

		remove: function(){
			RegistrationSuccessView.__super__.remove.call(this);
			credentials = undefined;
		},

		render: function(){
			return _.template($('.registration-success-template').html());
		}
	});
})(jQuery);
