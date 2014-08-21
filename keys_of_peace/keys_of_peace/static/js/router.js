(function($){
	var Route = function(options){
		this._fragment = options.fragment;
		this.name = options.name;
		this._parent = options.parent;
		this.router = options.router;
		this.viewConstructor = options.viewConstructor;
		this.getFragment = _.once(function(){
			var parent = this.getParent();
			if(parent){
				return parent.getFragment() + this._fragment + '/';
			}else{
				return this._fragment;
			}
		});
		this.getParent = _.once(function(){
			return this._parent && this.router.getRoute(this._parent);
		});
	};

	_.extend(Route.prototype, {
		go: function(options){
			options || (options = {});
			if(this.view){
				this.view.setElement(this.router.element);
			}else{
				this.view = new this.viewConstructor({
					el: this.router.element
				});
			}
			this.view.setOptions && this.view.setOptions(options);
		},
		
		leave: function(){
			this.view.remove();
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
				fragment: 'dashboard',
				viewConstructor: DashboardView
			}
		},

		initialize: function(){
			this.element = $('.body-wrap');
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
			if(this._route){
				this._route.leave();
			}
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
