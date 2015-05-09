define('pws/IncorrectPasswordError', [
	'pws/Error'
], function(
	PwsError
) {
	function IncorrectPasswordError(message) {
		PwsError.call(this, 'Incorrect password.');
		this.name = 'pws/IncorrectPasswordError';
	}

	IncorrectPasswordError.prototype = Object.create(PwsError.prototype);

  return IncorrectPasswordError;
});
