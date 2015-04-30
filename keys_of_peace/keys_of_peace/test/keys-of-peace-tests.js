var PASSWORD = 'W<u;]-CS>a%sF/N8+-93';
var SALT = '07723be817d72c621f4d6c6ab48e551c586a3edd9a5a639067f81eb99506951f';
var SALT_SHORT = '07723be817d72c621f4d6c6ab48e551c586a3edd9a5a639067f81eb9950695';

casper.test.comment('Keys of Peace utils');
var assert = require('assert');

function stretchingKey(param){
	var salt = CryptoJS.enc.Hex.parse(param.salt);
	return new KeysOfPeace.StretchedKeyGenerator(param.key).getStretchedKey(salt, param.iter).toString() === param.stretchedKey;
}

function stretchingKeyIncorrectSalt(param){
	var salt = CryptoJS.enc.Hex.parse(param.salt);
	try{
		new KeysOfPeace.StretchedKeyGenerator(param.key).getStretchedKey(salt, param.iter);
	}catch(e){
		return e instanceof KeysOfPeace.IncorrectSaltError;
	}
}

function stretchingKeyTooFewIterations(param){
	var salt = CryptoJS.enc.Hex.parse(param.salt);
	try{
		new KeysOfPeace.StretchedKeyGenerator(param.key).getStretchedKey(salt, param.iter);
	}catch(e){
		return e instanceof KeysOfPeace.TooFewIterationsError;
	}
}

helper.scenario(
	'/',
	function(){
		this.test.assertEval(stretchingKeyTooFewIterations, 'Stretching key with small iterations count causes `KeysOfPeace.TooFewIterationsError`', {
			key: PASSWORD,
			salt: SALT,
			iter: 2047
		});
	},
	function(){
		this.test.assertEval(stretchingKeyTooFewIterations, 'Specifying string as iterations count causes `KeysOfPeace.TooFewIterationsError`', {
			key: PASSWORD,
			salt: SALT,
			iter: 'million'
		});
	},
	function(){
		this.test.assertEval(stretchingKeyTooFewIterations, 'Not specifying iterations count causes `KeysOfPeace.TooFewIterationsError`', {
			key: PASSWORD,
			salt: SALT
		});
	},
	function(){
		this.test.assertEval(stretchingKeyIncorrectSalt, 'Stretching key with too short salt causes `KeysOfPeace.IncorrectSaltError`', {
			key: PASSWORD,
			salt: SALT_SHORT,
			iter: 2048
		});
	},
	function(){
		this.test.assertEval(stretchingKey, 'Stretched key is being derived', {
			key: PASSWORD,
			salt: SALT,
			iter: 2048,
			stretchedKey: '2b287781e2591ee316046ed777e617cc0942ffc15a2f47934afedc2ab10f316b'
		});
	}
);
