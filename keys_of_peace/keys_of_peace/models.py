from django.db import models
from django.contrib.auth import models as auth_models


ALPHABETS_BITS = {
    'Digits': '23456789',
    'latin': 'abcdefghijkmnopqrstuvwxyz',
    'LATIN': 'ABCDEFGHJKLMNPQRSTUVWXYZ',
    'hex': '0123456789abcdef',
    'Punctuation': '~!@#$;%^:&?*()-+=[]{}\\|/<>,.',
    }

ALPHABETS = (
    (800, ('latin', 'LATIN', 'Digits', 'Punctuation', )),
    (700, ('latin', 'LATIN', 'Digits', )),
    (600, ('latin', 'LATIN', )),
    (500, ('latin', 'Digits', )),
    (400, ('latin', )),
    (300, ('LATIN', )),
    (200, ('hex', )),
    (100, ('Digits', )),
    )

ALPHABET_CHOICES = [(k, ' + '.join(v), ) for k, v in ALPHABETS]
    

class UserProfile(models.Model):
    user = models.OneToOneField(auth_models.User, primary_key=True, related_name='profile')
    data = models.TextField(blank=True)
    data_salt = models.CharField(blank=True, max_length=100)
