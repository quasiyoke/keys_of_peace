require('../../config.js');
var _;
var requirejs = require('requirejs');
var assert = require('assert');
var base64 = require('base64-arraybuffer');
var Base64;
var CryptoJS;
var Hex;
var HmacError;
var IncorrectPasswordError;
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
      'pws/HmacError',
      'pws/IncorrectPasswordError',
      'jdataview',
      'pws/StoreFile',
      'underscore',
      'pws/WrongFormatError'
    ], function(
      _Base64,
      _CryptoJS,
      _Hex,
      _HmacError,
      _IncorrectPasswordError,
      _jDataView,
      _StoreFile,
      Underscore,
      _WrongFormatError
    ) {
      Base64 = _Base64;
      CryptoJS = _CryptoJS;
      Hex = _Hex;
      HmacError = _HmacError;
      IncorrectPasswordError = _IncorrectPasswordError;
      jDataView = _jDataView;
      StoreFile = _StoreFile;
      _ = Underscore;
      WrongFormatError = _WrongFormatError;
      done();
    });
  });

  var ITER = 2048;
  var KEY = 'W<u;]-CS>a%sF/N8+-93';
  var PWS_STORE_BASE64 = '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';
  var SALT_BASE64 = '0OnImhdEEuROFTLc3Oy7b3bobZiKFgssRgTvKd+RS1o=';
  var STRETCHED_KEY_BASE64 = '77DDJSjvrFLIzJ+qPSxux8q67iiTji8nyV4tYNTCvXk=';

  describe('when file has no proper tag', function() {
    it('should throw WrongFormatError', function() {
      assert.throws(
        function() {
          new StoreFile(base64.decode('aGVsbG8='), {});
        },
        WrongFormatError
      );
    });
  });

  describe('when wrong stretched key is specified', function() {
    it('should throw IncorrectPasswordError', function() {
      var PWS_STORE = base64.decode(PWS_STORE_BASE64);
      var SALT = Base64.parse(SALT_BASE64);
      var WRONG_STRETCHED_KEY = Base64.parse('87DDJSjvrFLIzJ+qPSxux8q67iiTji8nyV4tYNTCvXk=');
      var generator = {
        getStretchedKey: sinon.stub()
          .withArgs(SALT, ITER)
          .returns(WRONG_STRETCHED_KEY)
      };
      assert.throws(
        function() {
          new StoreFile(PWS_STORE, generator);
        },
        IncorrectPasswordError
      );
      assert(generator.getStretchedKey.withArgs(SALT, ITER).calledOnce);
    });
  });

  describe('when file has wrong HMAC', function() {
    it('should throw HmacError', function() {
      var PWS_STORE_WRONG_HMAC = base64.decode('UFdTM2NSi7EkqAv5MLStsmg0rWHZKHtU4TT7jnnSKK3KhCkDAAgAAPhH3PZH5MPRO4mP8m8Nji0wqr39DbE7dJ2pREJkyEH/fZTLERwvBrZk7YqaoFbLvPieXUWG2DeHndka2jO+rvDtccLn246+RK04oD7PRReLd5syBOogLeE0vjfVdWglCDJ2G/vHOHF7al4P6w1xWLEyGFc+oBKq12FD+8Y/PDNDH5to4KXwbf5OfIr7TzAmDL3kXmiZy/bIT547mk3Cz6Hz14eteALqb+Rz3xkC18zPHiRbPmKMyqpOveOmN726WqPHqRo8SkkXo9Xkpsns+MofjdmrQUUVsh6ZWnew8am/+bLsaBSQADgQb7sxb5MDE+qlJqyz8nl3uJqfAbsxpK0tQ1CYhS26ykzeebAPdL3nA2lC82ISrBR9EPEFZXDnSoG55/ppimp3LkILVPlC23zjoijdJxojnVuVzYCQqLT1HaZ2v8TgPu1TLX/f5IUwk7oc+p9L1aQ9uFrKYQHrHRqsqyHlKb8EVtfJcuyjoPyfzoiiTMpfV0arzV/ngO9mMlSxK/ttLolpjtQf6EcEQmbJFfwNVY0s8HguAt3ShvraaMq1wK4bq+lsa6fZ1tBwKtm652iqq7aas4kk49mMyMFCRd+TWorzSM1VPUhncg1wo8fn+qpDB3Ruv0uebBJReoEWQu4pPnCeV3cny1hh1pTG3rY6vhnt/dYBqvMWmjn2vw9eR0e6/OhnvuhLAoI/je7vv4Sz71RqlvIp5z/7YdKkE+/pA4g7NxNqyIB48/WWAcOSOooh4w742dHdWFz+glLfVNc4J2kWy6bnKf1ubwZ5eHmM/c47/yaomWCAgSeaTc1eZ+8BG3VlNKxRBNfLLA0LaLPX4XvsYehRop4UhXzKWUpwSCnJVF4GBjSkexubvWVVG1rB1+MCFGx8vD0O/ZxpUpzK2aTz6pc0BJ57o/zIS+sj1OVWNqp188CxnKRDIg2FoQrx8tr+xnLQSr2u8CT0tuQOb718ppiNKNJ9mG8w3cJmY8+XQFDodxpTHkei7kJyyYrQBc0w2FPTj9VPU7W2JJiMKTtoYDEzJejhMZcExZEO1Vv1wSHwubGqeC8UZjShNUE0trXVS69ZlrOsdMkAxDGPo2gIE48yahq/Ic4u23sDBPc8vUNdDz6xwSjwqYInT9Rf4l1ior1Sn/vHbL+rgL9q3ykDu31Q8cKDiM0FVTePXcOF+kFbDhRn7u2FolKM1JQEjoIIjvW0a6cWJrEoZUiSbp3tDLIBfz1jOZUj+B3Hooy4edKI9ui9loyQPe0FviFyO4cPEbEamvZvUFbUdTtwtmub77NnvaMb6n0Gj9h9MB6KBNMs047qTCauwKs7/cRC5dOX/d7eNJkmCostrPk36joics5WR1VG0UAdII1OI4agzT3JAaCyKvYu0HEpuGNnfV27d4nsjrGwGmPJZVpz3f5UyG2kxnJiGK6DBczv5ZAR2DizW5fGYUbfT7bDjonC0LXWBLktZ4WPWDbA+WelpWAwPr79SiNYjYVBp7K6yemobxge2XT5VcqoFjfYbg1ZwB5DFjC3Vq3zmQPSg/MWwRjOaS6cdxJeHIga2OeRJW8QBW7QjnZkqg9KSZwFM0HtvDUeLybVxPlVjFBXUzMtRU9GUFdTMy1FT0bCepE2z8eIsr9z66YnQ2a4kTVbAXsv/40EUo2z5/lcBw==');
      var SALT = Base64.parse('Y1KLsSSoC/kwtK2yaDStYdkoe1ThNPuOedIorcqEKQM=');
      var STRETCHED_KEY = Base64.parse('BaHrsqGgkC9gwrFr38KKnfbDCYC+k90C1y9O2m1xK44=');
      var generator = {
        getStretchedKey: sinon.stub()
          .withArgs(SALT, ITER)
          .returns(STRETCHED_KEY)
      };
      assert.throws(
        function() {
          new StoreFile(PWS_STORE_WRONG_HMAC, generator);
        },
        HmacError
      );
      assert(generator.getStretchedKey.withArgs(SALT, ITER).calledOnce);
    });
  });

  it('should read fields from file properly', function() {
    var FIELDS = [{"code":0,"data":"DQM="},{"code":1,"data":"OshS0gzEReaTfl21RbfscA=="},{"code":2,"data":"QiAxIDEgQiAyIDEgQiAzMSAxIEkgMTEgMiA="},{"code":4,"data":"b6vNVA=="},{"code":7,"data":"cXVhc2l5b2tl"},{"code":8,"data":"cXVhc2l5b2tlLXNvbnk="},{"code":6,"data":"cHdzYWZlIFYwLjk0"},{"code":15,"data":"MDIwODZmMWEwNmViZTc0MDliYTkxZWM3MDZkODYxN2JkMzlkN2RjMzdhNjNhZTQ1ZGQ5YjY4OWQ1NjRlMmNkYTAy"},{"code":16,"data":"MDIwNkcwb2dsZTA4MDAwMjgwMDEwMDEwMDEwMDExYystPV9AIyQlXiY7OiwuPD4vflxbXSgpe30/IXwwM0lDUWIyMDAwMDYwMDEwMDEwMDEwMDEwOEAmKCMhfCQr"},{"code":17,"data":"V29yaw=="},{"code":17,"data":"V29yay5CYW5rcw=="},{"code":255},{"code":1,"data":"CG8aBuvnQJupHscG2GF70w=="},{"code":2,"data":"QmFua3M="},{"code":3,"data":"TXlCYW5r"},{"code":4,"data":"bWlkYXM="},{"code":6,"data":"Pj9Rd19oZGpKci40"},{"code":15,"data":"MDAzMDA="},{"code":24,"data":"RzBvZ2xl"},{"code":7,"data":"dhbJVA=="},{"code":10,"data":"jDAJWA=="},{"code":8,"data":"kF3NVA=="},{"code":12,"data":"b6vNVA=="},{"code":17,"data":"dAIAAA=="},{"code":255},{"code":1,"data":"VRf2K3HqTmu2VX2kcYpXIg=="},{"code":2,"data":"ZS1tYWlsIGFjY291bnRz"},{"code":3,"data":"T2ZmaWNl"},{"code":6,"data":"SyFJN0srbGs/Pk80"},{"code":20,"data":"am9obmRvZUBvZmZpY2UuY29t"},{"code":7,"data":"qhfJVA=="},{"code":17,"data":"WgAAAA=="},{"code":19,"data":"AAA="},{"code":23,"data":"BQA="},{"code":255},{"code":1,"data":"nX3DemOuRd2baJ1WTizaAg=="},{"code":2,"data":"ZS1tYWlsIGFjY291bnRz"},{"code":3,"data":"RGFpbHk="},{"code":6,"data":"cmNoZXJlc3Nhc3NpcmVhZG9va2Vkb3MrYWJsYQ=="},{"code":14,"data":"YXV0b3R5cGUgcGF0dGVybg=="},{"code":16,"data":"OTIwMDAxYzAwMDAwMjAwNzAwMA=="},{"code":15,"data":"MTA0MDI1NGNkYWFmYzAwMWNzc2Fuc2Z1emNvbWVuK3Ntc21lcnNoaXRhbnNpNTRjOTE5MjYwMDBjOjRvJW5HK2hGN1dJ"},{"code":18,"data":"c29tZSBjb21tYW5k"},{"code":20,"data":"am9obmRvZUB5YWhvby5jb20="},{"code":22,"data":"QCYoIyF8JCs="},{"code":7,"data":"JhnJVA=="},{"code":8,"data":"E6vNVA=="},{"code":12,"data":"XKvNVA=="},{"code":17,"data":"WgAAAA=="},{"code":19,"data":"AgA="},{"code":23,"data":"AAA="},{"code":255},{"code":1,"data":"tl8w2bX6RSa8Ofn2x0NE9A=="},{"code":3,"data":"QW1hem9u"},{"code":4,"data":"Qm9va1dvcm0="},{"code":6,"data":"NmhwVjNMTTEwOl48"},{"code":5,"data":"Qm9vayBzaG9wcGluZyBhY2NvdW50Lg=="},{"code":13,"data":"aHR0cHM6Ly9hbWF6b24uY29t"},{"code":20,"data":"Ym9va3dvcm1AZ21haWwuY29t"},{"code":7,"data":"QxbJVA=="},{"code":17,"data":"WgAAAA=="},{"code":19,"data":"AAA="},{"code":23,"data":"BQA="},{"code":255}];
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
