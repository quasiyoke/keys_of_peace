var requirejs = require('requirejs');
var assert = require('assert');
var Hex = require('crypto-js/enc-hex');
var IncorrectSaltError = require('../static/js/IncorrectSaltError').IncorrectSaltError;
var StretchedKeyGenerator = require('../static/js/StretchedKeyGenerator').StretchedKeyGenerator;
var TooFewIterationsError = require('../static/js/TooFewIterationsError').TooFewIterationsError;

describe('StretchedKeyGenerator', function(){
	describe('.getStretchedKey()', function() {
		it('should return correct stretched key', function() {
			var SALT = Hex.parse('6fd4119783e9f5897762cb8b75cd8530de502a47e967f1a5e79e633d758ffc96');
			var generator = new StretchedKeyGenerator('hello');
			var stretchedKey = generator.getStretchedKey(SALT, 2048);
			assert.equal('00fb1325733c78d89ed49ab426b373b5a3d5e5512890c891c21a680fba93959b', stretchedKey.toString());
		});

		describe('when too short salt was provided', function() {
			it('should throw an exception', function() {
				var generator = new StretchedKeyGenerator('hello');
				var SHORT_SALT = Hex.parse('6fd4');
				assert.throws(
					function() {
						generator.getStretchedKey(SHORT_SALT, 2048);
					},
					IncorrectSaltError
				);
			});
		});

		describe('when too small iterations count was provided', function() {
			it('should throw an exception', function() {
				var SALT = Hex.parse('6fd4119783e9f5897762cb8b75cd8530de502a47e967f1a5e79e633d758ffc96');
				var generator = new StretchedKeyGenerator('hello');
				assert.throws(
					function() {
						generator.getStretchedKey(SALT, 2047);
					},
					TooFewIterationsError
				);
			});
		});

		describe('when iterations count of wrong type was provided', function() {
			it('should throw an exception', function() {
				var SALT = Hex.parse('6fd4119783e9f5897762cb8b75cd8530de502a47e967f1a5e79e633d758ffc96');
				var generator = new StretchedKeyGenerator('hello');
				assert.throws(
					function() {
						generator.getStretchedKey(SALT, 'not a number');
					},
					TooFewIterationsError
				);
			});
		});
	});
});
