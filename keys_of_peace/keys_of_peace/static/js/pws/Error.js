define('pws/Error', ['KeysOfPeaceError'], function(KeysOfPeaceError) {
	function Error(message) {
		KeysOfPeaceError.call(this, message);
		this.name = 'pws/Error';
	}

	Error.prototype = Object.create(KeysOfPeaceError.prototype);

  return Error;
});
