define('pws/Store', [
  'jbinary'
], function(
  jBinary
) {
  function Store() {
    this.emptyGroups = [];
    this.unknownFields = [];
  }

  Store._VERSION = { major: 0x03, minor: 0x0d }

	return Store;
});
