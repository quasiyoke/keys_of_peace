var _ = require('underscore');
var CryptoJS = require('crypto-js/core');
var Error = require('./Error').Error;
var Hex = require('crypto-js/enc-hex');
var jDataView = require('jdataview');
var Latin1 = require('crypto-js/enc-latin1');
var Record = require('./Record').Record;
var Store = require('./Store').Store;
var ValueError = require('./ValueError').ValueError;
var VersionError = require('./VersionError').VersionError;

/**
 * Serializes Password Safe storage to array of "fields": objects like this:
 * { code: 12, data: 'fooBar' }
 */
function StoreSerializer(store, file) {
	this.store = store;
	this.file = file;
}

StoreSerializer._HEADER_FIELDS = {};
StoreSerializer._HEADER_FIELDS_CODES = {};
StoreSerializer._HEX_REGEX = /^[abcdef\d]+$/i;
StoreSerializer._PASSWORD_POLICY_USE_LOWERCASE = 0x8000;
StoreSerializer._PASSWORD_POLICY_USE_UPPERCASE = 0x4000;
StoreSerializer._PASSWORD_POLICY_USE_DIGITS = 0x2000;
StoreSerializer._PASSWORD_POLICY_USE_SYMBOLS = 0x1000;
StoreSerializer._PASSWORD_POLICY_USE_HEX_DIGITS = 0x0800;
StoreSerializer._PASSWORD_POLICY_USE_EASY_VISION = 0x0400;
StoreSerializer._PASSWORD_POLICY_MAKE_PRONOUNCEABLE = 0x0200;
StoreSerializer._RECORDS_FIELDS = {};
StoreSerializer._RECORDS_FIELDS_CODES = {};
StoreSerializer._UUID_LENGTH = 16;
StoreSerializer._YUBI_SK_LENGTH = 20;

/**
 * @throws pws/ValueError
 */
StoreSerializer._parseHex = function(str) {
	/*
	 * parseInt returns NaN only if there're wrong symbols from the very beginning:
	 *
	 * parseInt('123+', 16); // 0x123
	 *
	 * ...so we need to test strings by regex to check them strictly.
	 */
	if (!StoreSerializer._HEX_REGEX.test(str)) {
		throw new ValueError('Hex number is incorrect: \"' + str + '\"');
	}
	return parseInt(str, 16);
};

StoreSerializer._serializeHex = function(n, length) {
	if (isNaN(n)) {
		throw new ValueError('NaN was given for hex-serializing: \"' + n + '\"');
	} else if (isNaN(length)) {
		throw new Error('NaN length was specified for hex-serializing: \"' + length + '\"');
	}
	var serialized = Number(n).toString(16);
	if (serialized.length < length) {
		var prefix = new Array(length - serialized.length + 1).join('0');
		serialized = prefix + serialized;
	} else if (length < serialized.length) {
		throw new ValueError('Too large number was given for hex-serializing: ' + n + ', length: ' + length);
	}
	return serialized;
};

/**
 * @param data jDataView
 * @param hasName Boolean
 * @throws pws/Error
 * @return Object
 */
StoreSerializer._parsePasswordPolicy = function(data, hasName) {
	var policy = {};
	try {
		if (hasName) {
			var length = StoreSerializer._parseHex(data.getString(2));
			policy.name = StoreSerializer._parseUnicode(data.getString(length));
		}
		var flags = StoreSerializer._parseHex(data.getString(4));
		policy.useLowercase = !!(flags & StoreSerializer._PASSWORD_POLICY_USE_LOWERCASE);
		policy.useUppercase = !!(flags & StoreSerializer._PASSWORD_POLICY_USE_UPPERCASE);
		policy.useDigits = !!(flags & StoreSerializer._PASSWORD_POLICY_USE_DIGITS);
		policy.useSymbols = !!(flags & StoreSerializer._PASSWORD_POLICY_USE_SYMBOLS);
		policy.useHexDigits = !!(flags & StoreSerializer._PASSWORD_POLICY_USE_HEX_DIGITS);
		policy.useEasyVision = !!(flags & StoreSerializer._PASSWORD_POLICY_USE_EASY_VISION);
		policy.makePronounceable = !!(flags & StoreSerializer._PASSWORD_POLICY_MAKE_PRONOUNCEABLE);
		policy.length = StoreSerializer._parseHex(data.getString(3));
		policy.lowercaseCountMin = StoreSerializer._parseHex(data.getString(3));
		policy.uppercaseCountMin = StoreSerializer._parseHex(data.getString(3));
		policy.digitsCountMin = StoreSerializer._parseHex(data.getString(3));
		policy.symbolsCountMin = StoreSerializer._parseHex(data.getString(3));
		if (hasName) {
			length = StoreSerializer._parseHex(data.getString(2));
			policy.specialSymbols = StoreSerializer._parseUnicode(data.getString(length));
		} else if (data.tell() < data.byteLength) {
			throw new Error('Data weren\'t parsed completely.');
		}
	} catch(e) {
		throw new Error('Password policy parsing was failed. ' + e);
	}
	return policy;
};

/**
 * @param policy Object
 * @param hasName Boolean
 * @return String
 */
StoreSerializer._serializePasswordPolicy = function(policy, hasName) {
	var serialized = [];
	try {
		if (hasName) {
			var serializedName = StoreSerializer._serializeUnicode(policy.name);
			serialized.push(StoreSerializer._serializeHex(serializedName.length, 2));
			serialized.push(serializedName);
		}
		var flags = 0;
		policy.useLowercase && (flags |= StoreSerializer._PASSWORD_POLICY_USE_LOWERCASE);
		policy.useUppercase && (flags |= StoreSerializer._PASSWORD_POLICY_USE_UPPERCASE);
		policy.useDigits && (flags |= StoreSerializer._PASSWORD_POLICY_USE_DIGITS);
		policy.useSymbols && (flags |= StoreSerializer._PASSWORD_POLICY_USE_SYMBOLS);
		policy.useHexDigits && (flags |= StoreSerializer._PASSWORD_POLICY_USE_HEX_DIGITS);
		policy.useEasyVision && (flags |= StoreSerializer._PASSWORD_POLICY_USE_EASY_VISION);
		policy.makePronounceable && (flags |= StoreSerializer._PASSWORD_POLICY_MAKE_PRONOUNCEABLE);
		serialized.push(StoreSerializer._serializeHex(flags, 4));
		serialized.push(StoreSerializer._serializeHex(policy.length, 3));
		serialized.push(StoreSerializer._serializeHex(policy.lowercaseCountMin, 3));
		serialized.push(StoreSerializer._serializeHex(policy.uppercaseCountMin, 3));
		serialized.push(StoreSerializer._serializeHex(policy.digitsCountMin, 3));
		serialized.push(StoreSerializer._serializeHex(policy.symbolsCountMin, 3));
		if (hasName) {
			var serializedSpecialSymbols = StoreSerializer._serializeUnicode(policy.specialSymbols);
			serialized.push(StoreSerializer._serializeHex(serializedSpecialSymbols.length, 2));
			serialized.push(serializedSpecialSymbols);
		}
	} catch (e) {
		throw new Error('Password policy serializing was failed. ' + e);
	}
	return serialized.join('');
};

/**
 * @param data jDataView
 * @return Date
 */
StoreSerializer._parseTime = function(data){
	/* @see ReadHeader at PWSfileV3.cpp */
	if (8 === data.byteLength) {
		data = data.getString(undefined, 0);
		if (StoreSerializer._HEX_REGEX.test(data)) {
			data = new jDataView(CryptoJS.enc.Latin1.stringify(CryptoJS.enc.Hex.parse(data)), 0, undefined, true);
		}
	} else if (4 !== data.byteLength){
		throw new Error('Incorrect timestamp field\'s length.');
	}
	return new Date(data.getUint32() * 1000);
};

/**
 * @param time Date
 * @return jDataView
 */
StoreSerializer._serializeTime = function(time) {
	var serialized = new jDataView(4, 0, undefined, true);
	serialized.writeUint32(time.getTime() / 1000);
	return serialized;
};

/**
 * @param str String utf-8-encoded "binary" string.
 * @return String full of Unicode characters.
 */
StoreSerializer._parseUnicode = function(str) {
	return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Latin1.parse(str));
};

/**
 * @param str String full of Unicode characters.
 * @return String utf-8-encoded "binary" string.
 */
StoreSerializer._serializeUnicode = function(str) {
	return CryptoJS.enc.Latin1.stringify(CryptoJS.enc.Utf8.parse(str));
};

/**
 * @param data jDataView
 * @throws pws/Error when UUID format is incorrect.
 * @return String
 */
StoreSerializer._parseUuid = function(data) {
	if (StoreSerializer._UUID_LENGTH !== data.byteLength) {
		throw new Error('Incorrect UUID length: ' + data.byteLength + ' instead of ' +
			StoreSerializer._UUID_LENGTH + '.');
	}
	return CryptoJS.enc.Latin1.parse(data.getString(undefined, 0)).toString();
};

/**
 * @param uuid String
 * @throws pws/ValueError when UUID format is incorrect.
 * @return jDataView
 */
StoreSerializer._serializeUuid = function(uuid) {
	if (!StoreSerializer._HEX_REGEX.test(uuid)) {
		throw new ValueError('Incorrect UUID contents. It\'s not a hex string: \"' + uuid + '\"');
	}
	if (uuid.length !== StoreSerializer._UUID_LENGTH * 2) {
		throw new ValueError('Incorrect UUID length: ' + uuid.sigBytes + ' instead of ' +
			StoreSerializer._UUID_LENGTH * 2 + '.');
	}
	uuid = CryptoJS.enc.Hex.parse(uuid);
	var serialized = CryptoJS.enc.Latin1.stringify(uuid);
	return new jDataView(serialized, 0, undefined, true);
};

var Field = StoreSerializer._Field = CryptoJS.lib.Base.extend({
	init: function(options) {
		this.name = options.name;
		this.code = options.code;
		if (options.extendObject) {
			this.extendObject = options.extendObject;
		} else if (options.parse) {
			this.parse = options.parse;
		}
		options.serialize && (this.serialize = options.serialize);
	},

	extendObject: function(obj, data) {
		if (!this.parse) {
			return;
		}
		var value = this.parse(data);
		switch (value) {
		case null:
			return null;
			break;
		case undefined:
			return;
			break;
		default:
			this._setValue(obj, value);
			break;
		}
	},

	serialize: function() {}
});

var HeaderField = StoreSerializer._HeaderField = Field.extend({
	init: function(options) {
		HeaderField.$super.init.apply(this, arguments);
		StoreSerializer._HEADER_FIELDS_CODES[options.code] = this;
		if (options.name) {
			StoreSerializer._HEADER_FIELDS[options.name] = this;
		}
	},

	_setValue: function(obj, value) {
		obj[this.name] = value;
	}
});

HeaderField.create({
	name: 'version',
	code: 0x00,
	parse: function(data) {
		if (2 != data.byteLength && 4 != data.byteLength) {
			throw new VersionError('Incorrect version field length.');
		}
		var value = {
			minor: data.getUint8(),
			major: data.getUint8()
		};
		if (Store._VERSION.major != value.major) {
			throw new VersionError(value);
		}
		return value;
	},
	serialize: function(value) {
		var data = new jDataView(2);
		data.writeUint8(value.minor);
		data.writeUint8(value.major);
		return data;
	}
});

HeaderField.create({
	name: 'uuid',
	code: 0x01,
	parse: function(data) {
		try {
			return StoreSerializer._parseUuid(data);
		} catch(e) {
			throw new Error('Problems while parsing header\'s UUID. ' + e);
		}
	},
	serialize: function(value) {
		return StoreSerializer._serializeUuid(value);
	}
});

HeaderField.create({
	name: 'preferences',
	code: 0x02,
	parse: function(data) {
		return data.getString(undefined, 0);
	},
	serialize: function(value) {
		return new jDataView(value, undefined, 0, true);
	}
});

HeaderField.create({
	name: 'treeDisplayStatus',
	code: 0x03,
	parse: function(data) {
		return _.map(data.getString(undefined, 0), function(c) {
			return '1' === c;
		});
	},
	serialize: function(value) {
		if(!value) {
			return;
		}
		value = _.map(value, function(expanded) {
			return expanded ? '1' : '0';
		});
		return StoreSerializer._serializeText(value.join(''));
	}
});

HeaderField.create({
	name: 'lastSave',
	code: 0x04,
	parse: function(data) {
		return StoreSerializer._parseTime(data);
	},
	serialize: function(value) {
		return StoreSerializer._serializeTime(value);
	}
});

HeaderField.create({ code: 0x05 }); // Who performed last save. Should be ignored.

HeaderField.create({
	name: 'whatPerformedLastSave',
	code: 0x06,
	parse: function(data) {
		return StoreSerializer._parseUnicode(data.getString(undefined, 0));
	},
	serialize: function(value) {
		return StoreSerializer._serializeText(value);
	}
});

HeaderField.create({
	name: 'lastSavedByUser',
	code: 0x07,
	parse: function(data) {
		return StoreSerializer._parseUnicode(data.getString(undefined, 0));
	},
	serialize: function(value) {
		return StoreSerializer._serializeText(value);
	}
});

HeaderField.create({
	name: 'lastSavedOnHost',
	code: 0x08,
	parse: function(data) {
		return StoreSerializer._parseUnicode(data.getString(undefined, 0));
	},
	serialize: function(value) {
		return StoreSerializer._serializeText(value);
	}
});

HeaderField.create({
	name: 'databaseName',
	code: 0x09,
	parse: function(data) {
		return StoreSerializer._parseUnicode(data.getString(undefined, 0));
	},
	serialize: function(value) {
		if (!value) {
			return;
		}
		return StoreSerializer._serializeText(value);
	}
});

HeaderField.create({
	name: 'databaseDescription',
	code: 0x0a,
	parse: function(data) {
		return StoreSerializer._parseUnicode(data.getString(undefined, 0));
	},
	serialize: function(value) {
		if (!value) {
			return;
		}
		return StoreSerializer._serializeText(value);
	}
});

HeaderField.create({
	name: 'recentlyUsedEntries',
	code: 0x0f,
	parse: function(data) {
		var count = data.getString(2, 0);
		if (!StoreSerializer._HEX_REGEX.test(count)) {
			return;
		}
		count = CryptoJS.enc.Latin1.stringify(CryptoJS.enc.Hex.parse(count));
		count = new jDataView(count, 0, undefined, true);
		count = count.getUint8();
		if (data.byteLength !== 2 + count * StoreSerializer._UUID_LENGTH * 2) {
			return;
		}
		var value = [];
		for (var i=2; i<data.byteLength; i+=StoreSerializer._UUID_LENGTH*2) {
			var uuid = data.getString(StoreSerializer._UUID_LENGTH * 2);
			if (!StoreSerializer._HEX_REGEX.test(uuid)) {
				continue;
			}
			value.push(uuid);
		}
		return value;
	},
	serialize: function(value) {
		if (!value || !value.length) {
			return;
		}
		var data = CryptoJS.lib.WordStack.create();
		if (value.length > 0xff) {
			value = value.slice(0, 0xff); // TODO: Check slicing.
		}
		data.pushNumberHex(value.length, 2);
		_.each(value, function(uuid) {
			data.pushBytes(StoreSerializer._serializeUuid(uuid), 2);
		});
		return data;
	}
});

HeaderField.create({
	name: 'namedPasswordPolicies',
	code: 0x10,
	extendObject: function(store, data) {
		/*
		 * Very sad situation here: this field code was also assigned to YUBI_SK in 3.27Y. Here we try
		 * to infer the actual type based on the actual value stored in the field. Specifically,
		 * YUBI_SK is StoreSerializer._YUBI_SK_LENGTH bytes of binary data, whereas
		 * NAMED_PASSWORD_POLICIES is of varying length, starting with at least 4 hex digits.
		 * @see ReadHeader at PWSfileV3.cpp
		 */
		var hex = data.getString(4, 0);
		if (data.byteLength !== StoreSerializer._YUBI_SK_LENGTH || StoreSerializer._HEX_REGEX.test(hex)) {
			var count = StoreSerializer._parseHex(hex.substring(0, 2));
			data.seek(2);
			store.namedPasswordPolicies = [];
			for (var i = 0; i < count; ++i) {
				try {
					store.namedPasswordPolicies.push(StoreSerializer._parsePasswordPolicy(data, true));
				} catch(e) {
					if (e instanceof Error) {
						continue;
					} else {
						throw e;
					}
				}
			}
		} else {
			data.seek(0);
			store.yubiSk = data;
		}
	},
	serialize: function(value) {
		if (!value || !value.length) {
			return;
		}
		var PASSWORD_POLICIES_COUNT_MAX = 0xff;
		if (value.length > PASSWORD_POLICIES_COUNT_MAX) {
			throw new Error('Too much password policies to save. Maximum count is ' +
				PASSWORD_POLICIES_COUNT_MAX + ', but now it\'s ' + value.length + '.');
		}
		var policies = _.map(value, function(policy) {
			return StoreSerializer._serializePasswordPolicy(policy, true);
		});
		policies = policies.join('');
		var serialized = new jDataView(policies.length + 2, 0, undefined, true);
		serialized.writeString(StoreSerializer._serializeHex(value.length, 2));
		serialized.writeString(policies);
		return serialized;
	}
});

HeaderField.create({
	name: 'emptyGroups',
	code: 0x11,
	extendObject: function(store, data) {
		store.emptyGroups.push(StoreSerializer._parseUnicode(data.getString(undefined, 0)));
	},
	serialize: function(value) {
		return _.map(value, function(group) {
			return StoreSerializer._serializeText(group);
		});
	}
});

HeaderField.create({
	name: 'yubiSk',
	code: 0x12,
	parse: function(data) {
		return data;
	},
	serialize: function(value) { // TODO: Test this.
		return value;
	}
});

HeaderField.create({
	name: 'endOfEntry',
	code: 0xff,
	parse: function() {
		return null; // This means that header definition was finished. Start records parsing.
	}
})

var RecordField = StoreSerializer._RecordField = Field.extend({
	init: function(options) {
		RecordField.$super.init.apply(this, arguments);
		StoreSerializer._RECORDS_FIELDS_CODES[options.code] = this;
		StoreSerializer._RECORDS_FIELDS[options.name] = this;
	},

	_setValue: function(obj, value) {
		obj.set(this.name, value);
	}
});

RecordField.create({
	name: 'uuid',
	code: 0x01,
	parse: function(data) {
		try {
			return StoreSerializer._parseUuid(data);
		} catch(e) {
			throw new Error('Problems while parsing record\'s UUID. ' + e);
		}
	},
	serialize: function(value) {
		return StoreSerializer._serializeUuid(value);
	}
});

var UnicodeRecordField = RecordField.extend({
	parse: function(data) {
		return StoreSerializer._parseUnicode(data.getString(undefined, 0));
	},
	serialize: function(value) {
		return StoreSerializer._serializeText(value);
	}
});

UnicodeRecordField.create({
	name: 'group',
	code: 0x02
});

UnicodeRecordField.create({
	name: 'title',
	code: 0x03
});

UnicodeRecordField.create({
	name: 'username',
	code: 0x04
});

UnicodeRecordField.create({
	name: 'notes',
	code: 0x05
});

UnicodeRecordField.create({
	name: 'password',
	code: 0x06
});

var TimeRecordField = RecordField.extend({
	parse: function(data){
		return StoreSerializer._parseTime(data);
	},
	serialize: function(value){
		if(!value){
			return;
		}
		return StoreSerializer._serializeTime(value);
	}
});

TimeRecordField.create({
	name: 'creationTime',
	code: 0x07
});

TimeRecordField.create({
	name: 'passwordModificationTime',
	code: 0x08
});

TimeRecordField.create({
	name: 'lastAccessTime',
	code: 0x09
});

TimeRecordField.create({
	name: 'passwordExpiryTime',
	code: 0x0a
});

/*
 * @see ItemData.cpp for CItemData::GetFieldValue -- reserved 0x0b field should be ignored
 * as reference implementation does.
 */
RecordField.create({ code: 0x0b });

TimeRecordField.create({
	name: 'lastModificationTime',
	code: 0x0c
});

UnicodeRecordField.create({
	name: 'url',
	code: 0x0d
});

UnicodeRecordField.create({
	name: 'autotype',
	code: 0x0e
});

RecordField.create({
	name: 'passwordHistory',
	code: 0x0f,
	parse: function(data) {
		try {
			var value = {
				on: '1' === data.getString(1),
				items: [],
				maxSize: StoreSerializer._parseHex(data.getString(2))
			};
		} catch(e) {
			throw new Error('Problem while parsing password history beginning. ' + e);
		}
		var length = StoreSerializer._parseHex(data.getString(2));
		for (var i = 0; i < length; ++i) {
			try {
				var item = {
					time: new Date(StoreSerializer._parseHex(data.getString(8)) * 1000)
				};
				var passwordLength = StoreSerializer._parseHex(data.getString(4));
				item.password = StoreSerializer._parseUnicode(data.getString(passwordLength));
				value.items.push(item);
			} catch(e) {
				throw new Error('Problem while parsing password history item #' + i + '. ' + e);
			}
		}
		return value;
	},
	serialize: function(value) {
		if (!value) {
			return;
		}
		var data = CryptoJS.lib.WordStack.create();
		data.pushByte((value.on ? '1' : '0').charCodeAt(0));
		data.pushNumberHex(value.maxSize, 2);
		data.pushNumberHex(value.items.length, 2);
		_.each(value.items, function(item){
			data.pushNumberHex(item.time.getTime() / 1000, 8);
			data.pushNumberHex(item.password.length, 4);
			data.pushBytes(StoreSerializer._serializeText(item.password));
		});
		return data;
	}
});

RecordField.create({
	name: 'passwordPolicy',
	code: 0x10,
	parse: function(data) {
		return StoreSerializer._parsePasswordPolicy(data);
	},
	serialize: function(value) {
		if (!value) {
			return;
		}
		return StoreSerializer._serializePasswordPolicy(value);
	}
});

RecordField.create({
	name: 'passwordExpiryInterval',
	code: 0x11,
	parse: function(data) {
		var value = data.getUint32();
		if (isNaN(value) || value < 0 || 3650 < value) {
			throw new Error('Incorrect password expiry interval value ' + value + '.');
		/*
		 * @see formatV3.txt A value of zero is equivalent to this field not being set.
		 */
		} else if (!value) {
			return;
		}
		return value;
	},
	serialize: function(value) {
		if (!value) {
			return;
		}
		var data = CryptoJS.lib.WordStack.create();
		data.pushNumber(value);
		return data;
	}
});

UnicodeRecordField.create({
	name: 'runCommand',
	code: 0x12
});

var ActionRecordField = RecordField.extend({
	parse: function(data) {
		if (2 !== data.byteLength) {
			throw new Error('Incorrect data length: ' + data.byteLength + ' instead of 2.');
		}
		var value = data.getUint16();
		if (0xff === value) {
			return;
		}
		return value;
	},
	serialize: function(value) {
		if (undefined === value || 0xff === value) {
			return;
		}
		var data = CryptoJS.lib.WordStack.create();
		data.pushShort(value);
		return data;
	}
});

ActionRecordField.create({
	name: 'doubleClickAction',
	code: 0x13
});

UnicodeRecordField.create({
	name: 'email',
	code: 0x14
});

RecordField.create({
	name: 'protected',
	code: 0x15,
	/**
	 * @see ItemData.cpp for CItemData::GetProtected -- it marks record as not "protected" when data is
	 * omitted or having wrong length.
	 */
	parse: function(data) {
		if (data && data.getUint8()) {
			return true;
		}
	},
	serialize: function(value) { // TODO: Test this.
		if (!value) {
			return;
		}
		return StoreSerializer._serializeText('1');
	}
});

UnicodeRecordField.create({
	name: 'ownSymbolsForPassword',
	code: 0x16
});

ActionRecordField.create({
	name: 'shiftDoubleClickAction',
	code: 0x17
});

UnicodeRecordField.create({
	name: 'passwordPolicyName',
	code: 0x18
});

RecordField.create({
	name: 'endOfEntry',
	code: 0xff,
	parse: function(data) {
		return null; // This means that record definition was finished. Begin next record.
	}
});

StoreSerializer.prototype.parse = function() {
	this._parseHeader();
	this._parseRecords();
};

StoreSerializer.prototype._parseHeader = function() {
	/**
	 * @see ReadHeader at PWSfileV3.cpp
	 */
	for (var i = 0; i < this.file.fields.length; ++i) {
		if (null === this._parseHeaderField(this.file.fields[i])) {
			break;
		}
	}
	this._headerFieldsEndIndex = Math.min(i + 1, this.file.fields.length);
};

StoreSerializer.prototype._parseHeaderField = function(field) {
	var fieldHandler = StoreSerializer._HEADER_FIELDS_CODES[field.code];
	if (fieldHandler) {
		if (null === fieldHandler.extendObject(this.store, field.data)) {
			return null; // This means that header definition was finished. Start records parsing.
		}
	} else {
		this.store.unknownFields.push(field);
	}
};

/**
 * @throws pws/Error if file hasn't end-of-record field. @see _parseRecord
 * @throws pws/Error if _headerFieldsEndIndex is undefined.
 */
StoreSerializer.prototype._parseRecords = function() {
	if (isNaN(this._headerFieldsEndIndex)) {
		throw new Error('Incorrect parsing order. There\'s no info about file header end. Call _parseHeaderField first.');
	}
	for (var i = this._headerFieldsEndIndex; i < this.file.fields.length; ++i) {
		i = this._parseRecord(i);
	}
};

/**
 * @throws pws/Error if file hasn't end-of-record field.
 * @returns Number index of record's end.
 */
StoreSerializer.prototype._parseRecord = function(index) {
	var record = this.store.records.create();
	for (; index < this.file.fields.length; ++index) {
		if (null === this._parseRecordField(this.file.fields[index], record)) {
			this.store.records.push(record);
			return index;
		}
	}
	throw new Error('Record\'s end field wasn\'t found.');
};

StoreSerializer.prototype._parseRecordField = function(field, record) {
	var fieldHandler = StoreSerializer._RECORDS_FIELDS_CODES[field.code];
	if (fieldHandler) {
		try {
			if (null === fieldHandler.extendObject(record, field.data)) {
				return null; // This means that record definition was finished.
			}
		} catch(e) {
			var message = 'Parsing record field \"' + fieldHandler.name + '\".';
			if (field.data) {
				message += ' Data: ' + Hex.stringify(Latin1.parse(field.data.getString(undefined, 0))) + '.';
			}
			message += ' ' + e;
			throw new Error(message);
		}
	} else {
		record.get('unknownFields').push(field);
	}
};

StoreSerializer.prototype.serialize = function() {

};

exports.StoreSerializer = StoreSerializer;
