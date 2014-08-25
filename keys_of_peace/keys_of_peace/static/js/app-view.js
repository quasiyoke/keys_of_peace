(function($){
	window.AppView = Backbone.View.extend({
		events: {
			'click .bar-dashboard-link': 'onDashboardLinkClick',
			'click .bar-logout-link': 'onLogoutLinkClick',
			'click .app-title-link': 'onTitleLinkClick',
			'click .breadcrumb': 'onBreadcrumbClick'
		},
		
		size: 'wide',
		
		initialize: function(){
			this.title = $('title');
			this.header = this.$('.app-header');
			this.headerTitle = this.header.find('.app-title');
			this.barWrap = this.header.find('.bar-wrap');
			this.bar = this.barWrap.find('.bar');
			this.barAdditionals = this.bar.find('.bar-additional');
			this.breadcrumbs = this.$('.breadcrumbs');
			this.content = this.$('.app-content');
		},

		onBreadcrumbClick: function(e){
			e.preventDefault();
			router.navigate($(e.target).attr('href'), {trigger: true});
		},

		setBreadcrumbs: function(breadcrumbs){
			if('wide' === this.size){
				return;
			}
			var lastBreadcrumb = _.last(breadcrumbs);
			breadcrumbs = _.map(breadcrumbs.slice(0, breadcrumbs.length - 1), function(breadcrumb){
				return $('<a class="breadcrumb">')
					.attr('href', breadcrumb.link)
					.text(breadcrumb.title)[0]
				;
			});
			breadcrumbs.push(
				$('<span class="last-breadcrumb">')
					.text(lastBreadcrumb.title)[0]
			);
			this.breadcrumbs
				.html('')
				.append(breadcrumbs)
			;
		},

		updateLoggedInView: function(){
			if(this.loggedInView || !this.subView.isLoggedIn){
				return;
			}
			this.loggedInView = this.subView;
			this.subView.on('logout', this.onLogout, this);
			this.barWrap.removeClass('bar-wrap_hidden', {
				duration: 300,
				easing: 'easeOutQuint'
			});
		},

		onLogout: function(){
			this.barWrap.addClass('bar-wrap_hidden', {
				duration: 300,
				easing: 'easeInQuint'
			});
			this.loggedInView.off('logout', this.onLogout);
			delete this.loggedInView;
		},

		onDashboardLinkClick: function(e){
			e.preventDefault();
			router.setRoute('dashboard');
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
			this.barAdditionals.toggleClass('bar-additional_narrow', 300);
			this.barWrap.toggleClass('bar-wrap_narrow', 300);
			this.breadcrumbs.slideToggle(600);
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
				this.barWrap.append(this.status);
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
