define('KeysOfPeaceError', function() {
	function KeysOfPeaceError(message) {
		this.name = 'KeysOfPeaceError';
		this.message = message;

		if (Error.captureStackTrace) {
	    Error.captureStackTrace(this, this.constructor);
	  } else {
	    this.stack = (new Error()).stack;
	  }
	}

	KeysOfPeaceError.prototype = Object.create(Error.prototype);

  return KeysOfPeaceError;
});
