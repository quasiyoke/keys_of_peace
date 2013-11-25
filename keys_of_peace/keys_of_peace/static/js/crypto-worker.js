'use strict';

importScripts('/configuration/');
var scripts = ['json2', 'lodash', 'crypto/core', 'crypto/enc-base64', 'crypto/sha256', 'crypto/hmac', 'crypto/pbkdf2', 'crypto/cipher-core', 'crypto/aes', 'crypto'];
for(var i=scripts.length; i--;){
	scripts[i] = '/static/js/' + scripts[i] + '.js';
}
importScripts.apply(this, scripts);

var methods = {
	decrypt: {
		getArguments: function(args){
			args.key = Crypto.fromString(args.key);
			return [args.data, args.key];
		}
	},
	
	encrypt: {
		getArguments: function(args){
			args.data = JSON.stringify(args.data);
			args.key = Crypto.fromString(args.key);
			return [args.data, args.key];
		}
	},
	
	hash: {
		getArguments: function(args){
			if('stringArray' in args){
				args.string = Crypto.fromString(args.stringArray);
			}
			args.salt = Crypto.fromString(args.salt);
			return [args.string, args.salt];
		},
		getResult: function(result){
			return Crypto.toString(result);
		}
	}
};

this.onmessage = function(e){
	var m = e.data;
	var method = methods[m.method];
	if(method && method.getArguments){
		m.arguments = method.getArguments(m.arguments);
	}
	var result = Crypto[m.method].apply(Crypto, m.arguments);
	if(method && method.getResult){
		result = method.getResult(result);
	}
	postMessage({
		id: m.id,
		method: m.method,
		result: result
	});
};
