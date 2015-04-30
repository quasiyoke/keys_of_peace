define('TooFewIterationsError', ['KeysOfPeaceError'], function(KeysOfPeaceError){
  function TooFewIterationsError() {
    KeysOfPeaceError.call(this, 'Too small hashing iterations count for key stretching was specified.');
    this.name = 'TooFewIterationsError';
  }

  TooFewIterationsError.prototype = Object.create(KeysOfPeaceError.prototype);

  return TooFewIterationsError;
});
