(function($){
	var Route = function(options){
		this.name = options.name;
		this.router = options.router;
		this.viewConstructor = options.viewConstructor;
		this.getBreadcrumbs = _.once(function(){
			var parent = this.getParent();
			var breadcrumbs = parent ? _.clone(parent.getBreadcrumbs()) : [];
			breadcrumbs.push({
				title: options.breadcrumb || options.title || 'Keys of Peace',
				link: '/' + this.getFragment()
			});
			return breadcrumbs;
		});
		this.getFragment = _.once(function(){
			var parent = this.getParent();
			if(parent){
				return parent.getFragment() + options.fragment + '/';
			}else{
				return options.fragment;
			}
		});
		this.getParent = _.once(function(){
			return options.parent && this.router.getRoute(options.parent);
		});
		this.getTitle = _.once(function(){
			var title = 'Keys of Peace';
			if(options.title){
				title = options.title + ' — ' + title;
			}
			return title;
		});
	};

	_.extend(Route.prototype, {
		go: function(options){
			options || (options = {});
			if(!this.view){
				this.view = new this.viewConstructor();
			}
			router.appView.setRoute(this, options);
		}
	});
	
	
	var Router = Backbone.Router.extend({
		_routes: {
			home: {
				fragment: '',
				viewConstructor: HomeView
			},
			dashboard: {
				parent: 'home',
				breadcrumb: 'Dashboard',
				fragment: 'dashboard',
				viewConstructor: DashboardView
			},
			registration: {
				parent: 'home',
				title: 'Registration',
				fragment: 'registration',
				viewConstructor: RegistrationView
			},
			registrationSuccess: {
				parent: 'registration',
				title: 'Successful Registration',
				breadcrumb: 'Success',
				fragment: 'success',
				viewConstructor: RegistrationSuccessView
			}
		},

		initialize: function(){
			for(name in this._routes){
				var options = this._routes[name];
				options.name = name;
				options.router = this;
				this._routes[name] = new Route(options);
			}
			var that = this;
			_.each(this._routes, function(route, name){
				that.route(route.getFragment(), name);
			});
			this.appView = new AppView({
				el: $('.app')
			});
			this.delegateEvents();
		},

		delegateEvents: function(){
			this.on('route', this.onRoute, this);
		},

		getRoute: function(name){
			return name ? this._routes[name] : this._route;
		},

		onRoute: function(name){
			this.setRoute(name, {navigate: false});
		},

		setRoute: function(route, options){
			options || (options = {});
			route = this.getRoute(route);
			route.go(options);
			if(false !== options.navigate){
				this.navigate(route.getFragment());
			}
			this._route = route;
			return this;
		}
	});
	

	$(function(){
		window.router = new Router();
		Backbone.history.start({
			pushState: true
		});
	});
})(jQuery);
