var Backbone = require('backbone');
var Records = require('./Records').Records;

/**
 * We don't need Backbone's sync API.
 */
Backbone.sync = function() {};

function Store() {
	this.emptyGroups = [];
	this.records = new Records();
	this.unknownFields = [];
}

Store._VERSION = { major: 0x03, minor: 0x10 }

exports.Store = Store;
