var Backbone = require('backbone');
var Record = require('./Record').Record;

var Records = Backbone.Collection.extend({
	model: Record
});

exports.Records = Records;
