var Error = require('./Error').Error;

function HmacError(expected, current) {
	Error.call(this, 'Storage HMAC is invalid. Looks like it was damaged. Now: ' + current + ' Should be: ' + expected);
	this.name = 'pws/HmacError';
}

HmacError.prototype = Object.create(Error.prototype);

exports.HmacError = HmacError;
