define('pws/HmacError', ['pws/Error'], function(PwsError) {
	function HmacError(expected, current) {
		PwsError.call(this, 'Storage HMAC is invalid. Looks like it was damaged. Now: ' + current + ' Should be: ' + expected);
		this.name = 'pws/HmacError';
	}

	HmacError.prototype = Object.create(PwsError.prototype);

  return HmacError;
});
