var Error = require('./Error').Error;

function ValueError(message) {
	Error.call(this, message || 'Wrong value was given.');
	this.name = 'pws/ValueError';
}

ValueError.prototype = Object.create(Error.prototype);

exports.ValueError = ValueError;
