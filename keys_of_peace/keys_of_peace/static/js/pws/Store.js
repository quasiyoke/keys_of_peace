function Store() {
	this.emptyGroups = [];
	this.records = [];
	this.unknownFields = [];
}

Store._VERSION = { major: 0x03, minor: 0x10 }

exports.Store = Store;
