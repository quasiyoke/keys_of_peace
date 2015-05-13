define('pws/ValueError', [
	'pws/Error'
], function(
	Error
) {
	function ValueError(message) {
		Error.call(this, message || 'Wrong value was given.');
		this.name = 'pws/ValueError';
	}

	ValueError.prototype = Object.create(Error.prototype);

  return ValueError;
});
