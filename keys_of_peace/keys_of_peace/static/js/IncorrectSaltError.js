define('IncorrectSaltError', ['KeysOfPeaceError'], function(KeysOfPeaceError){
	function IncorrectSaltError() {
		KeysOfPeaceError.call(this, 'Incorrect salt for key stretching was specified.');
		this.name = 'IncorrectSaltError';
	}

	IncorrectSaltError.prototype = Object.create(KeysOfPeaceError.prototype);

  return IncorrectSaltError;
});
