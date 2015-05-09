define('pws/VersionError', [
	'pws/Error',
	'KeysOfPeace'
], function(
	PwsError,
	KeysOfPeace
) {
	function VersionError(message) {
		if (!_.isString(message)) {
			message = 'This website doesn\'t supports storages of version ' + KeysOfPeace.getVersionString(message);
		}
		PwsError.call(this, message);
		this.name = 'pws/VersionError';
	}

	VersionError.prototype = Object.create(PwsError.prototype);

  return VersionError;
});
