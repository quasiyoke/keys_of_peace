define('pws/WrongFormatError', [
	'pws/Error'
], function(
	PwsError
) {
	function WrongFormatError(message) {
		PwsError.call(this, 'File format is wrong.' + (message ? ' ' + message : ''));
		this.name = 'pws/WrongFormatError';
	}

	WrongFormatError.prototype = Object.create(PwsError.prototype);

  return WrongFormatError;
});
