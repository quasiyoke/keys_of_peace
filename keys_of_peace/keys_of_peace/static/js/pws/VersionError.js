var _ = require('underscore');
var Error = require('./Error').Error;
var KeysOfPeace = require('../KeysOfPeace').KeysOfPeace;

function VersionError(message) {
	if (!_.isString(message)) {
		message = 'This website doesn\'t supports storages of version ' + KeysOfPeace.getVersionString(message);
	}
	Error.call(this, message);
	this.name = 'pws/VersionError';
}

VersionError.prototype = Object.create(Error.prototype);

exports.VersionError = VersionError;
