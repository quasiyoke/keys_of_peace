var KeysOfPeaceError = require('../KeysOfPeaceError').KeysOfPeaceError;

function Error(message) {
	KeysOfPeaceError.call(this, message);
	this.name = 'pws/Error';
}

Error.prototype = Object.create(KeysOfPeaceError.prototype);

exports.Error = Error;
