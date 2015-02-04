'use strict';

var scripts = ['json2', 'lodash', 'crypto/core', 'crypto/enc-base64', 'crypto/sha256', 'crypto/hmac', 'crypto/cipher-core', 'crypto/aes', 'keys-of-peace'];
for(var i=scripts.length; i--;){
	scripts[i] = '/static/js/' + scripts[i] + '.js';
}
importScripts.apply(this, scripts);

var methods = {
	decrypt: {
		deserializeArgs: function(args){
			args.key = Crypto.fromString(args.key);
			return [args.data, args.key];
		}
	},
	
	encrypt: {
		deserializeArgs: function(args){
			args.data = JSON.stringify(args.data);
			args.key = Crypto.fromString(args.key);
			return [args.data, args.key];
		}
	},
	
	hash: {
		deserializeArgs: function(args){
			if('stringArray' in args){
				args.string = Crypto.fromString(args.stringArray);
			}
			args.salt = Crypto.fromString(args.salt);
			return [args.string, args.salt];
		},
		serializeResult: function(result){
			return Crypto.toString(result);
		}
	}
};

this.onmessage = function(e){
	var m = e.data;
	var method = methods[m.method];
	if(method && method.deserializeArgs){
		m.args = method.deserializeArgs(m.args);
	}
	var result = Crypto[m.method].apply(Crypto, m.args);
	if(method && method.serializeResult){
		result = method.serializeResult(result);
	}
	postMessage({
		id: m.id,
		method: m.method,
		result: result
	});
};
