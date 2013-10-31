# -*- coding: utf-8 -*-

import base64
import binascii
import os
import re
from django.conf import settings
from django.utils.crypto import pbkdf2


HASH_BITS_COUNT = 256

HASH_ITERATIONS_COUNT = 1000

SALT_BITS_COUNT = 256


def from_string(s):
    return binascii.a2b_hex(s)


def get_salt():
    return os.urandom(SALT_BITS_COUNT / 8)


def hash(passw, salt):
    return pbkdf2(passw, salt, HASH_ITERATIONS_COUNT, HASH_BITS_COUNT / 8)


def make_password(hash, salt):
    return '%s$%d$%s$%s' % (
        'pbkdf2_sha256',
        HASH_ITERATIONS_COUNT,
        base64.b64encode(salt).strip(),
        base64.b64encode(hash).strip(),
        )


PASSWORD_PATTERN = re.compile(
    ur'^\w+\$\d+\$(?P<salt>%(base64)s)\$(?P<hash>%(base64)s)$' % {
        'base64': ur'(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?',
        }
    )

def parse_password(passw):
    return {key: base64.b64decode(value) for key, value in PASSWORD_PATTERN.match(passw).groupdict().iteritems()}


def to_string(s):
    return binascii.b2a_hex(s)
