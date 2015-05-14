var Backbone = require('backbone');

var Record = Backbone.Model.extend({
	initialize: function() {
		this.set({
			unknownFields: []
		});
	}
});

exports.Record = Record;
