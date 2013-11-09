'use strict';

(function($){
	var Api = window.Api = {
		fetch: function(options){
			options = _.clone(options);

			var url;
			if(options.data.resource_uri){
				url = options.data.resource_uri;
			}else{
				url = '/api/v1/' + options.resource + '/';
				if(options.id){
					url += options.id + '/';
				}
			}
			
			var defaults = {
				accepts: {
					'application/json': true,
				},
				contentType: 'application/json',
				dataType: 'json',
				//processData: false,
				type: 'GET',
				url: url
			};
			options = _.merge(defaults, options);

			if(options.type != 'GET'){
				options = _.merge(options, {
					headers: {
						'X-CSRFToken': $.cookie('csrftoken')
					}
				});
				if(options.data){
					options.data = JSON.stringify(options.data);
				}
			}
			return $.ajax(options);
		}
	};
})(jQuery);
