(function($){
	window.AppView = Backbone.View.extend({
		events: {
			'click .bar-logout-link': 'onLogoutLinkClick',
			'click .app-title-link': 'onTitleLinkClick',
			'click .breadcrumb': 'onBreadcrumbClick'
		},
		
		size: 'wide',
		
		initialize: function(){
			this.title = $('title');
			this.breadcrumbs = this.$('.breadcrumbs');
			this.header = this.$('.app-header');
			this.bar = this.header.find('.bar');
			this.headerTitle = this.header.find('.app-title');
			this.content = this.$('.app-content');
		},

		onBreadcrumbClick: function(e){
			e.preventDefault();
			router.navigate($(e.target).attr('href'), {trigger: true});
		},

		setBreadcrumbs: function(breadcrumbs){
			if('narrow' === this.size){
				breadcrumbs = _.map(breadcrumbs, function(breadcrumb){
					return $('<a>')
						.attr('href', breadcrumb.link)
						.addClass('breadcrumb')
						.text(breadcrumb.title)[0]
					;
				});
				this.breadcrumbs
					.html('')
					.append(breadcrumbs)
				;
			}
		},

		updateLoggedInView: function(){
			if(this.loggedInView || !this.subView.isLoggedIn){
				return;
			}
			this.loggedInView = this.subView;
			this.subView.on('logout', this.onLogout, this);
			this.bar.removeClass('bar_hidden', {
				duration: 300,
				easing: 'easeOutQuint'
			});
		},

		onLogout: function(){
			this.bar.addClass('bar_hidden', {
				duration: 300,
				easing: 'easeInQuint'
			});
			this.loggedInView.off('logout', this.onLogout);
			delete this.loggedInView;
		},

		onLogoutLinkClick: function(e){
			e.preventDefault();
			this.loggedInView.logout();
		},

		setRoute: function(route, options){
			var that = this;
			var lastSubView = this.subView;
			this.subView = route.view;
			if(lastSubView){
				lastSubView.$el.fadeOut({
					duration: 300,
					complete: setNewRoute
				});
				lastSubView.off('appStatus');
			}
			that.title.text(route.getTitle());
			that.setSize(that.subView.size || 'narrow');
			that.setBreadcrumbs(route.getBreadcrumbs());
			if(!lastSubView){
				setNewRoute();
			}

			function setNewRoute(){
				if(lastSubView){
					lastSubView.remove();
				}
				var el = $('<div>')
					.appendTo(that.content)
				;
				that.subView
					.setElement(el)
					.on('appStatus', that.onStatus, that)
				;
				el
					.hide()
					.fadeIn({
						duration: 300
					})
				;
				that.subView.setOptions(options);
				that.updateLoggedInView();
			}
		},

		setSize: function(size){
			if(this.size === size){
				return;
			}
			this.$el.toggleClass('app_narrow');
			this.header.toggleClass('app-header_narrow', 600);
			this.headerTitle.toggleClass('app-title_narrow', 600);
			this.content.toggleClass('app-content_narrow', 600);
			this.bar.toggleClass('bar_narrow', {
				duration: 300
			});
			if('narrow' === size){
				this.breadcrumbs.slideDown(600);
			}else{
				this.breadcrumbs.slideUp(600);
			}
			this.size = size;
		},

		onStatus: function(options){
			if(!options){
				if(this.status){
					this.status.remove();
					delete this.status;
				}
				return;
			}
			if(options.email){
				this.bar.find('.bar-email').text(options.email);
				return;
			}
			if(!this.status){
				this.status = $('<div class="status">');
				this.bar.append(this.status);
			}
			if(options.error){
				this.status.addClass('status-error');
			}else{
				this.status.removeClass('status-error');
			}
			if(options.gauge){
				this.status.addClass('status-gauge');
			}else{
				this.status.removeClass('status-gauge');
			}
			this.status.html(options.text);
			this.status
				.position({
					my: 'center top',
					at: 'center bottom+5',
					of: this.bar
				})
			;			
		},

		onTitleLinkClick: function(e){
			e.preventDefault();
			router.setRoute('home');
		}
	});
})(jQuery);
