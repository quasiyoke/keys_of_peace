var Error = require('./Error').Error;

function IncorrectPasswordError(message) {
	Error.call(this, 'Incorrect password.');
	this.name = 'pws/IncorrectPasswordError';
}

IncorrectPasswordError.prototype = Object.create(Error.prototype);

exports.IncorrectPasswordError = IncorrectPasswordError;
