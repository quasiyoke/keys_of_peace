var _ = require('underscore');
var assert = require('assert');
var Record = require('../../static/js/pws/Record').Record;
var requirejs = require('requirejs');

describe('pws/Record', function() {
	it('should be created properly', function() {
		var record = new Record();
		assert(_.isArray(record.get('unknownFields')));
	});
});
