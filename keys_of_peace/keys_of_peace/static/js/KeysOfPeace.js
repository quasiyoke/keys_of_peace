define('KeysOfPeace', function(){
	return {
		SALT_LENGTH: 256 / 8,
		VERSION: { major: 0, minor: 2 },

		getVersionString: function(version) {
			var minor = String(version.minor);
			if (minor.length < 2) {
				minor = '0' + minor;
			}
			return version.major + '.' + minor;
		}
	};
});
