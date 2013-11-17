'use strict';

(function($){
	var Api = window.Api = {
		URL: CONFIGURATION.API_URL,
		
		fetch: function(options){
			options = _.clone(options);

			var url;
			if(options.uri){
				url = options.uri;
			}else{
				url = this.URL + options.resource + '/';
				if(options.data.id){
					url += options.data.id + '/';
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
		},

		makeMethods: {
			decrypt: {
				getArguments: function(args){
					return {
						data: args[0],
						key: Crypto.toString(args[1])
					};
				}
			},
			
			encrypt: {
				getArguments: function(args){
					return {
						data: args[0],
						key: Crypto.toString(args[1])
					};
				}
			},
			
			hash: {
				getArguments: function(args){
					var retval = {
						salt: Crypto.toString(args[1]) // Serialize salt to string.
					};
					if(_.isString(args[0])){
						retval.string = args[0];
					}else{
						retval.stringArray = Crypto.toString(args[0]);
					}
					return retval;
				},
				getResult: function(result){
					return Crypto.fromString(result)
				}
			}
		}
	};

	if(window.Worker){
		var cryptoWorker = new Worker('/static/js/crypto-worker.js');
		var i = 0;
		var callbacks = {};

		Api.make = function(m){
			m.id = i++;
			callbacks[m.id] = m.callback;
			delete m.callback;
			var method = Api.makeMethods[m.method];
			if(method && method.getArguments){
				m.arguments = method.getArguments(m.arguments);
			}
			cryptoWorker.postMessage(m);
		}
		
		cryptoWorker.onmessage = function(e){
			var m = e.data;
			var method = Api.makeMethods[m.method];
			if(method && method.getResult){
				m.result = method.getResult(m.result);
			}
			callbacks[m.id](m.result);
			delete callbacks[m.id];
		};
	}else{
		Api.make = function(m){
			m.callback(Crypto[m.method].apply(Crypto, m.arguments));
		}
	}
})(jQuery);
