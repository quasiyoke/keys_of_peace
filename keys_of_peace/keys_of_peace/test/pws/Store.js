var _ = require('underscore');
var assert = require('assert');
var Store = require('../../static/js/pws/Store').Store;

describe('pws/Store', function() {
	it('should be created properly', function() {
		var store = new Store();
		assert(_.isArray(store.emptyGroups));
		assert(_.isArray(store.unknownFields));
	});
});
