import base64
from django.core import exceptions
from django.utils import encoding


class Base64(object):
    message = 'Value is not correct base64 encoded string.'
    code = 'invalid'

    def __call__(self, value):
        value = encoding.force_text(value)
        try:
            value = base64.b64decode(value)
        except TypeError:
            raise exceptions.ValidationError(self.message, code=self.code)
