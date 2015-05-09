require('../../config.js');
var _;
var requirejs = require('requirejs');
var assert = require('assert');
var base64 = require('base64-arraybuffer');
var Base64;
var CryptoJS;
var Hex;
var jDataView;
var sinon = require('sinon');
var StoreFile;
var WrongFormatError;

describe('pws/StoreFile', function() {
  before(function(done) {
    requirejs([
      'crypto-js/enc-base64',
      'crypto-js/core',
      'crypto-js/enc-hex',
      'jdataview',
      'pws/StoreFile',
      'underscore',
      'pws/WrongFormatError'
    ], function(
      _Base64,
      _CryptoJS,
      _Hex,
      _jDataView,
      _StoreFile,
      Underscore,
      _WrongFormatError
    ) {
      Base64 = _Base64;
      CryptoJS = _CryptoJS;
      Hex = _Hex;
      jDataView = _jDataView;
      StoreFile = _StoreFile;
      _ = Underscore;
      WrongFormatError = _WrongFormatError;
      done();
    });
  });

  var KEY = 'W<u;]-CS>a%sF/N8+-93';
  var PWS_STORE_BASE64 = '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';
  var SALT_BASE64 = '0OnImhdEEuROFTLc3Oy7b3bobZiKFgssRgTvKd+RS1o=';
  var STRETCHED_KEY_BASE64 = '77DDJSjvrFLIzJ+qPSxux8q67iiTji8nyV4tYNTCvXk=';

  describe('when file has no proper tag', function() {
    it('should throw an exception', function() {
      assert.throws(
        function() {
          new StoreFile(base64.decode('aGVsbG8='), {});
        },
        WrongFormatError
      );
    });
  });

  it('should read fields from file properly', function() {
    var FIELDS = [{"type":0,"data":"DQM="},{"type":1,"data":"OshS0gzEReaTfl21RbfscA=="},{"type":2,"data":"QiAxIDEgQiAyIDEgQiAzMSAxIEkgMTEgMiA="},{"type":4,"data":"b6vNVA=="},{"type":7,"data":"cXVhc2l5b2tl"},{"type":8,"data":"cXVhc2l5b2tlLXNvbnk="},{"type":6,"data":"cHdzYWZlIFYwLjk0"},{"type":15,"data":"MDIwODZmMWEwNmViZTc0MDliYTkxZWM3MDZkODYxN2JkMzlkN2RjMzdhNjNhZTQ1ZGQ5YjY4OWQ1NjRlMmNkYTAy"},{"type":16,"data":"MDIwNkcwb2dsZTA4MDAwMjgwMDEwMDEwMDEwMDExYystPV9AIyQlXiY7OiwuPD4vflxbXSgpe30/IXwwM0lDUWIyMDAwMDYwMDEwMDEwMDEwMDEwOEAmKCMhfCQr"},{"type":17,"data":"V29yaw=="},{"type":17,"data":"V29yay5CYW5rcw=="},{"type":255},{"type":1,"data":"CG8aBuvnQJupHscG2GF70w=="},{"type":2,"data":"QmFua3M="},{"type":3,"data":"TXlCYW5r"},{"type":4,"data":"bWlkYXM="},{"type":6,"data":"Pj9Rd19oZGpKci40"},{"type":15,"data":"MDAzMDA="},{"type":24,"data":"RzBvZ2xl"},{"type":7,"data":"dhbJVA=="},{"type":10,"data":"jDAJWA=="},{"type":8,"data":"kF3NVA=="},{"type":12,"data":"b6vNVA=="},{"type":17,"data":"dAIAAA=="},{"type":255},{"type":1,"data":"VRf2K3HqTmu2VX2kcYpXIg=="},{"type":2,"data":"ZS1tYWlsIGFjY291bnRz"},{"type":3,"data":"T2ZmaWNl"},{"type":6,"data":"SyFJN0srbGs/Pk80"},{"type":20,"data":"am9obmRvZUBvZmZpY2UuY29t"},{"type":7,"data":"qhfJVA=="},{"type":17,"data":"WgAAAA=="},{"type":19,"data":"AAA="},{"type":23,"data":"BQA="},{"type":255},{"type":1,"data":"nX3DemOuRd2baJ1WTizaAg=="},{"type":2,"data":"ZS1tYWlsIGFjY291bnRz"},{"type":3,"data":"RGFpbHk="},{"type":6,"data":"cmNoZXJlc3Nhc3NpcmVhZG9va2Vkb3MrYWJsYQ=="},{"type":14,"data":"YXV0b3R5cGUgcGF0dGVybg=="},{"type":16,"data":"OTIwMDAxYzAwMDAwMjAwNzAwMA=="},{"type":15,"data":"MTA0MDI1NGNkYWFmYzAwMWNzc2Fuc2Z1emNvbWVuK3Ntc21lcnNoaXRhbnNpNTRjOTE5MjYwMDBjOjRvJW5HK2hGN1dJ"},{"type":18,"data":"c29tZSBjb21tYW5k"},{"type":20,"data":"am9obmRvZUB5YWhvby5jb20="},{"type":22,"data":"QCYoIyF8JCs="},{"type":7,"data":"JhnJVA=="},{"type":8,"data":"E6vNVA=="},{"type":12,"data":"XKvNVA=="},{"type":17,"data":"WgAAAA=="},{"type":19,"data":"AgA="},{"type":23,"data":"AAA="},{"type":255},{"type":1,"data":"tl8w2bX6RSa8Ofn2x0NE9A=="},{"type":3,"data":"QW1hem9u"},{"type":4,"data":"Qm9va1dvcm0="},{"type":6,"data":"NmhwVjNMTTEwOl48"},{"type":5,"data":"Qm9vayBzaG9wcGluZyBhY2NvdW50Lg=="},{"type":13,"data":"aHR0cHM6Ly9hbWF6b24uY29t"},{"type":20,"data":"Ym9va3dvcm1AZ21haWwuY29t"},{"type":7,"data":"QxbJVA=="},{"type":17,"data":"WgAAAA=="},{"type":19,"data":"AAA="},{"type":23,"data":"BQA="},{"type":255}];
    var ITER = 2048;
    var PWS_STORE = base64.decode(PWS_STORE_BASE64);
    var SALT = Base64.parse(SALT_BASE64);
    var STRETCHED_KEY = Base64.parse(STRETCHED_KEY_BASE64);
    var generator = {
      getStretchedKey: sinon.stub()
        .withArgs(SALT, ITER)
        .returns(STRETCHED_KEY)
    };
    var storeFile = new StoreFile(PWS_STORE, generator);
    assert(generator.getStretchedKey.withArgs(SALT, ITER).calledOnce);
    assert.deepEqual(_.map(storeFile.fields, function(field) {
      if (field.data) {
        field.data = Base64.stringify(CryptoJS.enc.Latin1.parse(field.data.getString(undefined, 0)));
      }
      return field;
    }), FIELDS);
  });
});
