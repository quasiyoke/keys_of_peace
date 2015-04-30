'use strict';

var PWS_STORE_STRING_NO_TAG = 'aGVsbG8=';
var PWS_STORE_STRING = 'UFdTM2NSi7EkqAv5MLStsmg0rWHZKHtU4TT7jnnSKK3KhCkDAAgAAPhH3PZH5MPRO4mP8m8Nji0wqr39DbE7dJ2pREJkyEH/fZTLERwvBrZk7YqaoFbLvPieXUWG2DeHndka2jO+rvDtccLn246+RK04oD7PRReLd5syBOogLeE0vjfVdWglCDJ2G/vHOHF7al4P6w1xWLEyGFc+oBKq12FD+8Y/PDNDH5to4KXwbf5OfIr7TzAmDL3kXmiZy/bIT547mk3Cz6Hz14eteALqb+Rz3xkC18zPHiRbPmKMyqpOveOmN726WqPHqRo8SkkXo9Xkpsns+MofjdmrQUUVsh6ZWnew8am/+bLsaBSQADgQb7sxb5MDE+qlJqyz8nl3uJqfAbsxpK0tQ1CYhS26ykzeebAPdL3nA2lC82ISrBR9EPEFZXDnSoG55/ppimp3LkILVPlC23zjoijdJxojnVuVzYCQqLT1HaZ2v8TgPu1TLX/f5IUwk7oc+p9L1aQ9uFrKYQHrHRqsqyHlKb8EVtfJcuyjoPyfzoiiTMpfV0arzV/ngO9mMlSxK/ttLolpjtQf6EcEQmbJFfwNVY0s8HguAt3ShvraaMq1wK4bq+lsa6fZ1tBwKtm652iqq7aas4kk49mMyMFCRd+TWorzSM1VPUhncg1wo8fn+qpDB3Ruv0uebBJReoEWQu4pPnCeV3cny1hh1pTG3rY6vhnt/dYBqvMWmjn2vw9eR0e6/OhnvuhLAoI/je7vv4Sz71RqlvIp5z/7YdKkE+/pA4g7NxNqyIB48/WWAcOSOooh4w742dHdWFz+glLfVNc4J2kWy6bnKf1ubwZ5eHmM/c47/yaomWCAgSeaTc1eZ+8BG3VlNKxRBNfLLA0LaLPX4XvsYehRop4UhXzKWUpwSCnJVF4GBjSkexubvWVVG1rB1+MCFGx8vD0O/ZxpUpzK2aTz6pc0BJ57o/zIS+sj1OVWNqp188CxnKRDIg2FoQrx8tr+xnLQSr2u8CT0tuQOb718ppiNKNJ9mG8w3cJmY8+XQFDodxpTHkei7kJyyYrQBc0w2FPTj9VPU7W2JJiMKTtoYDEzJejhMZcExZEO1Vv1wSHwubGqeC8UZjShNUE0trXVS69ZlrOsdMkAxDGPo2gIE48yahq/Ic4u23sDBPc8vUNdDz6xwSjwqYInT9Rf4l1ior1Sn/vHbL+rgL9q3ykDu31Q8cKDiM0FVTePXcOF+kFbDhRn7u2FolKM1JQEjoIIjvW0a6cWJrEoZUiSbp3tDLIBfz1jOZUj+B3Hooy4edKI9ui9loyQPe0FviFyO4cPEbEamvZvUFbUdTtwtmub77NnvaMb6n0Gj9h9MB6KBNMs047qTCauwKs7/cRC5dOX/d7eNJkmCostrPk36joics5WR1VG0UAdII1OI4agzT3JAaCyKvYu0HEpuGNnfV27d4nsjrGwGmPJZVpz3f5UyG2kxnJiGK6DBczv5ZAR2DizW5fGYUbfT7bDjonC0LXWBLktZ4WPWDbA+WelpWAwPr79SiNYjYVBp7K6yemobxge2XT5VcqoFjfYbg1ZwB5DFjC3Vq3zmQPSg/MWwRjOaS6cdxJeHIga2OeRJW8QBW7QjnZkqg9KSZwFM0HtvDUeLybVxPlVjFBXUzMtRU9GUFdTMy1FT0bCepE2z8eIsr9z66YnQ2a4kTVbAXsv/40EUo2z5/lcBg==';
var PWS_STORE_STRING_INCORRECT_HMAC = 'UFdTM2NSi7EkqAv5MLStsmg0rWHZKHtU4TT7jnnSKK3KhCkDAAgAAPhH3PZH5MPRO4mP8m8Nji0wqr39DbE7dJ2pREJkyEH/fZTLERwvBrZk7YqaoFbLvPieXUWG2DeHndka2jO+rvDtccLn246+RK04oD7PRReLd5syBOogLeE0vjfVdWglCDJ2G/vHOHF7al4P6w1xWLEyGFc+oBKq12FD+8Y/PDNDH5to4KXwbf5OfIr7TzAmDL3kXmiZy/bIT547mk3Cz6Hz14eteALqb+Rz3xkC18zPHiRbPmKMyqpOveOmN726WqPHqRo8SkkXo9Xkpsns+MofjdmrQUUVsh6ZWnew8am/+bLsaBSQADgQb7sxb5MDE+qlJqyz8nl3uJqfAbsxpK0tQ1CYhS26ykzeebAPdL3nA2lC82ISrBR9EPEFZXDnSoG55/ppimp3LkILVPlC23zjoijdJxojnVuVzYCQqLT1HaZ2v8TgPu1TLX/f5IUwk7oc+p9L1aQ9uFrKYQHrHRqsqyHlKb8EVtfJcuyjoPyfzoiiTMpfV0arzV/ngO9mMlSxK/ttLolpjtQf6EcEQmbJFfwNVY0s8HguAt3ShvraaMq1wK4bq+lsa6fZ1tBwKtm652iqq7aas4kk49mMyMFCRd+TWorzSM1VPUhncg1wo8fn+qpDB3Ruv0uebBJReoEWQu4pPnCeV3cny1hh1pTG3rY6vhnt/dYBqvMWmjn2vw9eR0e6/OhnvuhLAoI/je7vv4Sz71RqlvIp5z/7YdKkE+/pA4g7NxNqyIB48/WWAcOSOooh4w742dHdWFz+glLfVNc4J2kWy6bnKf1ubwZ5eHmM/c47/yaomWCAgSeaTc1eZ+8BG3VlNKxRBNfLLA0LaLPX4XvsYehRop4UhXzKWUpwSCnJVF4GBjSkexubvWVVG1rB1+MCFGx8vD0O/ZxpUpzK2aTz6pc0BJ57o/zIS+sj1OVWNqp188CxnKRDIg2FoQrx8tr+xnLQSr2u8CT0tuQOb718ppiNKNJ9mG8w3cJmY8+XQFDodxpTHkei7kJyyYrQBc0w2FPTj9VPU7W2JJiMKTtoYDEzJejhMZcExZEO1Vv1wSHwubGqeC8UZjShNUE0trXVS69ZlrOsdMkAxDGPo2gIE48yahq/Ic4u23sDBPc8vUNdDz6xwSjwqYInT9Rf4l1ior1Sn/vHbL+rgL9q3ykDu31Q8cKDiM0FVTePXcOF+kFbDhRn7u2FolKM1JQEjoIIjvW0a6cWJrEoZUiSbp3tDLIBfz1jOZUj+B3Hooy4edKI9ui9loyQPe0FviFyO4cPEbEamvZvUFbUdTtwtmub77NnvaMb6n0Gj9h9MB6KBNMs047qTCauwKs7/cRC5dOX/d7eNJkmCostrPk36joics5WR1VG0UAdII1OI4agzT3JAaCyKvYu0HEpuGNnfV27d4nsjrGwGmPJZVpz3f5UyG2kxnJiGK6DBczv5ZAR2DizW5fGYUbfT7bDjonC0LXWBLktZ4WPWDbA+WelpWAwPr79SiNYjYVBp7K6yemobxge2XT5VcqoFjfYbg1ZwB5DFjC3Vq3zmQPSg/MWwRjOaS6cdxJeHIga2OeRJW8QBW7QjnZkqg9KSZwFM0HtvDUeLybVxPlVjFBXUzMtRU9GUFdTMy1FT0bCepE2z8eIsr9z66YnQ2a4kTVbAXsv/40EUo2z5/lcBw==';
var PWS_STORE_RICH_STRING = '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';
var PASSWORD = 'W<u;]-CS>a%sF/N8+-93';

casper.test.comment('PWS Store');

function checkPWSStoreHeader(param, isJustWritten){
	window.checkStoreHeader = function(store){
		var result = 1;
		result &= 0x03 === store.version.major;
		result &= 0x0d === store.version.minor;
		result &= '3ac852d20cc445e6937e5db545b7ec70' === store.uuid;
		result &= 'B 1 1 B 2 1 B 31 1 I 11 2 ' === store.preferences;
		if(isJustWritten){
			result &= 1422764911000 < store.lastSave.getTime();
			result &= 'pwsafe V0.94' !== store.whatPerformedLastSave;
			result &= !store.lastSavedOnHost;
		}else{
			result &= 1422764911000 === store.lastSave.getTime();
			result &= 'pwsafe V0.94' === store.whatPerformedLastSave;
			result &= 'quasiyoke-sony' === store.lastSavedOnHost;
		}
		result &= 'quasiyoke' === store.lastSavedByUser;
		result &= 2 === store.namedPasswordPolicies.length;
		var googlePolicy = store.namedPasswordPolicies['G0ogle' === store.namedPasswordPolicies[0].name ? 0 : 1];
		var icqPolicy = store.namedPasswordPolicies['ICQ' === store.namedPasswordPolicies[0].name ? 0 : 1];
		result &= 'G0ogle' === googlePolicy.name;
		result &= 40 === googlePolicy.length;
		result &= false === googlePolicy.useLowercase;
		result &= 1 === googlePolicy.lowercaseCountMin;
		result &= false === googlePolicy.useUppercase;
		result &= 1 === googlePolicy.uppercaseCountMin;
		result &= false === googlePolicy.useDigits;
		result &= 1 === googlePolicy.digitsCountMin;
		result &= true === googlePolicy.useHexDigits;
		result &= false === googlePolicy.useSymbols;
		result &= 1 === googlePolicy.symbolsCountMin;
		result &= false === googlePolicy.useEasyVision;
		result &= false === googlePolicy.makePronounceable;
		result &= '+-=_@#$%^&;:,.<>/~\\[](){}?!|' === googlePolicy.specialSymbols;
		result &= 'ICQ' === icqPolicy.name;
		result &= 6 === icqPolicy.length;
		result &= true === icqPolicy.useLowercase;
		result &= 1 === googlePolicy.lowercaseCountMin;
		result &= false === icqPolicy.useUppercase;
		result &= 1 === googlePolicy.uppercaseCountMin;
		result &= true === icqPolicy.useDigits;
		result &= 1 === googlePolicy.digitsCountMin;
		result &= false === icqPolicy.useHexDigits;
		result &= true === icqPolicy.useSymbols;
		result &= 1 === googlePolicy.symbolsCountMin;
		result &= false === icqPolicy.useEasyVision;
		result &= true === icqPolicy.makePronounceable;
		result &= '@&(#!|$+' === icqPolicy.specialSymbols;
		result &= 2 === store.emptyGroups.length;
		result &= store.emptyGroups.indexOf('Work') >= 0;
		result &= store.emptyGroups.indexOf('Work.Banks') >= 0;
		return !!result;
	};

	var store = new KeysOfPeace.PWS.Store(param.string, new KeysOfPeace.StretchedKeyGenerator(param.password));
	return checkStoreHeader(store);
}

function checkPWSStoreIncorrect(param){
	try{
		new KeysOfPeace.PWS.Store(param.string, new KeysOfPeace.StretchedKeyGenerator(param.password));
	}catch(e){
		return e instanceof KeysOfPeace.PWS.Error;
	}
}

function checkPWSStoreIncorrectHmac(param){
	try{
		new KeysOfPeace.PWS.Store(param.string, new KeysOfPeace.StretchedKeyGenerator(param.password));
	}catch(e){
		return e instanceof KeysOfPeace.PWS.HmacError;
	}
}

function checkPWSStoreIncorrectPassword(param){
	try{
		new KeysOfPeace.PWS.Store(param.string, new KeysOfPeace.StretchedKeyGenerator(param.password));
	}catch(e){
		return e instanceof KeysOfPeace.PWS.IncorrectPasswordError;
	}
}

function checkPWSStoreIncorrectVersion(param){
	var majorVersion = KeysOfPeace.PWS.Store._VERSION.major;
	try{
		++KeysOfPeace.PWS.Store._VERSION.major;
		new KeysOfPeace.PWS.Store(param.string, new KeysOfPeace.StretchedKeyGenerator(param.password));
	}catch(e){
		return e instanceof KeysOfPeace.PWS.VersionError;
	}finally{
		KeysOfPeace.PWS.Store._VERSION.major = majorVersion;
	}
}

function checkPWSStoreRecords(param){
	window.checkStoreRecords = function(){
		var result = 1;

		var record = store.records[0];
		result &= 12 === _.keys(record).length
		result &= 1422464630000 === record.creationTime.getTime();
		result &= 'Banks' === record.group;
		result &= 1422764911000 === record.lastModificationTime.getTime();
		result &= '>?Qw_hdjJr.4' === record.password;
		result &= 628 === record.passwordExpiryInterval;
		result &= 1476997260000 === record.passwordExpiryTime.getTime();
		result &= 0 === record.passwordHistory.items.length;
		result &= 3 === record.passwordHistory.maxSize;
		result &= false === record.passwordHistory.on;
		result &= 1422744976000 === record.passwordModificationTime.getTime();
		result &= 'G0ogle' === record.passwordPolicyName;
		result &= 'MyBank' === record.title;
		result &= 'midas' === record.username;
		result &= '086f1a06ebe7409ba91ec706d8617bd3' === record.uuid;

		record = store.records[1];
		result &= 9 === _.keys(record).length
		result &= 1422464938000 === record.creationTime.getTime();
		result &= 0 === record.doubleClickAction;
		result &= 'johndoe@office.com' === record.email;
		result &= 'e-mail accounts' === record.group;
		result &= 'K!I7K+lk?>O4' === record.password;
		result &= 90 === record.passwordExpiryInterval;
		result &= 5 === record.shiftDoubleClickAction;
		result &= 'Office' === record.title;
		result &= '5517f62b71ea4e6bb6557da4718a5722' === record.uuid;

		record = store.records[2];
		result &= 16 === _.keys(record).length;
		result &= 'autotype pattern' === record.autotype;
		result &= 1422465318000 === record.creationTime.getTime();
		result &= 2 === record.doubleClickAction;
		result &= 'johndoe@yahoo.com' === record.email;
		result &= 'e-mail accounts' === record.group;
		result &= 1422764892000 === record.lastModificationTime.getTime();
		result &= '@&(#!|$+' === record.ownSymbolsForPassword;
		result &= 'rcheressassireadookedos+abla' === record.password;
		result &= 90 === record.passwordExpiryInterval;
		result &= 2 === record.passwordHistory.items.length;
		result &= 'ssansfuzcomen+smsmershitansi' === record.passwordHistory.items[0].password;
		result &= 1422764796000 === record.passwordHistory.items[0].time.getTime();
		result &= ':4o%nG+hF7WI' === record.passwordHistory.items[1].password;
		result &= 1422465318000 === record.passwordHistory.items[1].time.getTime();
		result &= 4 === record.passwordHistory.maxSize;
		result &= true === record.passwordHistory.on;
		result &= 1422764819000 === record.passwordModificationTime.getTime();
		result &= 28 === record.passwordPolicy.length;
		result &= true === record.passwordPolicy.useLowercase;
		result &= 0 === record.passwordPolicy.lowercaseCountMin;
		result &= false === record.passwordPolicy.useUppercase;
		result &= 2 === record.passwordPolicy.uppercaseCountMin;
		result &= false === record.passwordPolicy.useDigits;
		result &= 7 === record.passwordPolicy.digitsCountMin;
		result &= false === record.passwordPolicy.useHexDigits;
		result &= true === record.passwordPolicy.useSymbols;
		result &= 0 === record.passwordPolicy.symbolsCountMin;
		result &= false === record.passwordPolicy.useEasyVision;
		result &= true === record.passwordPolicy.makePronounceable;
		result &= 'some command' === record.runCommand;
		result &= 0 === record.shiftDoubleClickAction;
		result &= 'Daily' === record.title;
		result &= '9d7dc37a63ae45dd9b689d564e2cda02' === record.uuid;

		record = store.records[3];
		result &= 11 === _.keys(record).length;
		result &= 1422464579000 === record.creationTime.getTime();
		result &= 0 === record.doubleClickAction;
		result &= 'bookworm@gmail.com' === record.email;
		result &= 'Book shopping account.' === record.notes;
		result &= '6hpV3LM10:^<' === record.password;
		result &= 90 === record.passwordExpiryInterval;
		result &= 5 === record.shiftDoubleClickAction;
		result &= 'Amazon' === record.title;
		result &= 'https://amazon.com' === record.url;
		result &= 'BookWorm' === record.username;
		result &= 'b65f30d9b5fa4526bc39f9f6c74344f4' === record.uuid;

		return !!result;
	};
	
	var store = new KeysOfPeace.PWS.Store(param.string, new KeysOfPeace.StretchedKeyGenerator(param.password));
	return checkStoreRecords(store);
}

function checkPWSStoreStructureCorrect(param){
	var store = new KeysOfPeace.PWS.Store(param.string, new KeysOfPeace.StretchedKeyGenerator(param.password));
	var result = 1;
	result &= '63528bb124a80bf930b4adb26834ad61d9287b54e134fb8e79d228adca842903' === store._salt.toString();
	result &= 2048 === store._iter;
	result &= 'f847dcf647e4c3d13b898ff26f0d8e2d30aabdfd0db13b749da9444264c841ff' === store._stretchedKeyHash.toString();
	result &= '7d94cb111c2f06b664ed8a9aa056cbbcf89e5d4586d837879dd91ada33beaef0' === store._b1b2.toString();
	result &= 'ed71c2e7db8ebe44ad38a03ecf45178b779b3204ea202de134be37d575682508' === store._b3b4.toString();
	result &= '32761bfbc738717b6a5e0feb0d7158b1' === store._iv.toString();
	result &= '3218573ea012aad76143fbc63f3c33431f9b68e0a5f06dfe4e7c8afb4f30260cbde45e6899cbf6c84f9e3b9a4dc2cfa1f3d787ad7802ea6fe473df1902d7cccf1e245b3e628ccaaa4ebde3a637bdba5aa3c7a91a3c4a4917a3d5e4a6c9ecf8ca1f8dd9ab414515b21e995a77b0f1a9bff9b2ec6814900038106fbb316f930313eaa526acb3f27977b89a9f01bb31a4ad2d435098852dbaca4cde79b00f74bde7036942f36212ac147d10f1056570e74a81b9e7fa698a6a772e420b54f942db7ce3a228dd271a239d5b95cd8090a8b4f51da676bfc4e03eed532d7fdfe4853093ba1cfa9f4bd5a43db85aca6101eb1d1aacab21e529bf0456d7c972eca3a0fc9fce88a24cca5f5746abcd5fe780ef663254b12bfb6d2e89698ed41fe847044266c915fc0d558d2cf0782e02ddd286fada68cab5c0ae1babe96c6ba7d9d6d0702ad9bae768aaabb69ab38924e3d98cc8c14245df935a8af348cd553d4867720d70a3c7e7faaa4307746ebf4b9e6c12517a811642ee293e709e577727cb5861d694c6deb63abe19edfdd601aaf3169a39f6bf0f5e4747bafce867bee84b02823f8deeefbf84b3ef546a96f229e73ffb61d2a413efe903883b37136ac88078f3f59601c3923a8a21e30ef8d9d1dd585cfe8252df54d738276916cba6e729fd6e6f067978798cfdce3bff26a899608081279a4dcd5e67ef011b756534ac5104d7cb2c0d0b68b3d7e17bec61e851a29e14857cca594a704829c9545e060634a47b1b9bbd65551b5ac1d7e302146c7cbc3d0efd9c69529ccad9a4f3ea9734049e7ba3fcc84beb23d4e55636aa75f3c0b19ca443220d85a10af1f2dafec672d04abdaef024f4b6e40e6fbd7ca6988d28d27d986f30ddc26663cf974050e8771a531e47a2ee4272c98ad005cd30d853d38fd54f53b5b624988c293b6860313325e8e1319704c5910ed55bf5c121f0b9b1aa782f146634a1354134b6b5d54baf5996b3ac74c900c4318fa36808138f326a1abf21ce2edb7b0304f73cbd435d0f3eb1c128f0a982274fd45fe25d62a2bd529ffbc76cbfab80bf6adf2903bb7d50f1c28388cd0555378f5dc385fa415b0e1467eeed85a2528cd494048e82088ef5b46ba71626b1286548926e9ded0cb2017f3d63399523f81dc7a28cb879d288f6e8bd968c903ded05be21723b870f11b11a9af66f5056d4753b70b66b9befb367bda31bea7d068fd87d301e8a04d32cd38eea4c26aec0ab3bfdc442e5d397fddede3499260a8b2dacf937ea3a2272ce56475546d1401d208d4e2386a0cd3dc901a0b22af62ed07129b863677d5dbb7789ec8eb1b01a63c9655a73ddfe54c86da4c6726218ae8305ccefe59011d838b35b97c66146df4fb6c38e89c2d0b5d604b92d67858f5836c0f967a5a560303ebefd4a23588d8541a7b2bac9e9a86f181ed974f955caa81637d86e0d59c01e431630b756adf39903d283f316c118ce692e9c77125e1c881ad8e791256f10056ed08e7664aa0f4a499c053341edbc351e2f26d5c4f9558c' === store._ciphertext.toString();
	result &= 'c27a9136cfc788b2bf73eba6274366b891355b017b2fff8d04528db3e7f95c06' === store._hmacValue.toString();
	return !!result;
}

function checkPWSStoreWritingHeader(param){
	var stretchedKeyGenerator = new KeysOfPeace.StretchedKeyGenerator(param.password);
	var store = new KeysOfPeace.PWS.Store(param.string, stretchedKeyGenerator);
	var serialized = store.getSerialized(stretchedKeyGenerator);
	store = new KeysOfPeace.PWS.Store(serialized, stretchedKeyGenerator);
	return checkStoreHeader(store, true); // This function was defined at checkPWSStoreHeader. This hack allows checking store structure exactly the same way each time.
}

function checkPWSStoreWritingRecords(param){
	var stretchedKeyGenerator = new KeysOfPeace.StretchedKeyGenerator(param.password);
	var store = new KeysOfPeace.PWS.Store(param.string, stretchedKeyGenerator);
	var serialized = store.getSerialized(stretchedKeyGenerator);
	store = new KeysOfPeace.PWS.Store(serialized, stretchedKeyGenerator);
	return checkStoreRecords(store); // This function was defined at checkPWSStoreRecords. This hack allows checking store structure exactly the same way each time.
}

var helper = require('./djangocasper.js');
helper.scenario(
	'/',
	function(){
		this.test.assertEval(checkPWSStoreIncorrect, 'Constructing with nothing causes `PWS.Error`', {
			string: '',
			password: PASSWORD
		});
	},
	function(){
		this.test.assertEval(checkPWSStoreIncorrect, 'Constructing with string without "TAG" causes `PWS.Error`', {
			string: PWS_STORE_STRING_NO_TAG,
			password: PASSWORD
		});
	},
	function(){
		this.test.assertEval(checkPWSStoreStructureCorrect, 'Correctly structured PWS.Store string is being read', {
			string: PWS_STORE_STRING,
			password: PASSWORD
		});
	},
	function(){
		this.test.assertEval(checkPWSStoreIncorrectPassword, 'Incorrect password causes `PWS.IncorrectPasswordError`', {
			string: PWS_STORE_STRING,
			password: 'topsecret'
		});
	},
	function(){
		this.test.assertEval(checkPWSStoreIncorrectHmac, 'Incorrect HMAC causes `PWS.HmacError`', {
			string: PWS_STORE_STRING_INCORRECT_HMAC,
			password: PASSWORD
		});
	},
	function(){
		this.test.assertEval(checkPWSStoreIncorrectVersion, 'Incorrect version causes `PWS.VersionError`', {
			string: PWS_STORE_STRING,
			password: PASSWORD
		});
	},
	function(){
		this.test.assertEval(checkPWSStoreHeader, 'Header is being read properly', {
			string: PWS_STORE_RICH_STRING,
			password: PASSWORD
		});
	},
	function(){
		this.test.assertEval(checkPWSStoreRecords, 'Records are being read properly', {
			string: PWS_STORE_RICH_STRING,
			password: PASSWORD
		});
	},
	function(){
		this.test.assertEval(checkPWSStoreWritingHeader, 'Header is being written properly', {
			string: PWS_STORE_RICH_STRING,
			password: PASSWORD
		});
	},
	function(){
		this.test.assertEval(checkPWSStoreWritingRecords, 'Records are being written properly', {
			string: PWS_STORE_RICH_STRING,
			password: PASSWORD
		});
	}
);
helper.run();
