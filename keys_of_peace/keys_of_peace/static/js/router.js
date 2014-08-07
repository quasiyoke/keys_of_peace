(function($){
	var Router = Backbone.Model.extend({
		_routes: {
			home: {
				viewConstructor: HomeView
			},
			dashboard: {
				viewConstructor: DashboardView
			}
		},

		initialize: function(){
			this.on('change:route', this.onRouteChange, this);
			this.on('change:routeName', this.onRouteNameChange, this);
			this.element = $('.body-wrap');
		},

		onRouteChange: function(model, route){
			var previousRoute = this.previous('route');
			if(previousRoute){
				previousRoute.view.remove();
			}

			if(route.view){
				route.view.setElement(this.element);
			}else{
				route.view = new route.viewConstructor({
					el: this.element
				});
			}
		},

		onRouteNameChange: function(model, routeName){
			this.set('route', this._routes[routeName]);
		}
	});
	

	$(function(){
		window.router = new Router();
		router.set('routeName', 'home');
	});
})(jQuery);
