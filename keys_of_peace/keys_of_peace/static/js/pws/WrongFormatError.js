var Error = require('./Error').Error;

function WrongFormatError(message) {
	Error.call(this, 'File format is wrong.' + (message ? ' ' + message : ''));
	this.name = 'pws/WrongFormatError';
}

WrongFormatError.prototype = Object.create(Error.prototype);

exports.WrongFormatError = WrongFormatError;
