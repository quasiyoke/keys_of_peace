var KeysOfPeaceError = require('./KeysOfPeaceError').KeysOfPeaceError;

function IncorrectSaltError() {
	KeysOfPeaceError.call(this, 'Incorrect salt for key stretching was specified.');
	this.name = 'IncorrectSaltError';
}

IncorrectSaltError.prototype = Object.create(KeysOfPeaceError.prototype);

exports.IncorrectSaltError = IncorrectSaltError;
