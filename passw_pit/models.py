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


class Account(models.Model):
    class Meta:
        index_together = (
            ('user', 'site', ),
        )
    
    user = models.ForeignKey(auth_models.User)
    site = models.ForeignKey('Site')
    login = models.CharField(max_length=50)
    password = models.CharField(max_length=50)
    created = models.DateTimeField(auto_now_add=True)


class Accounter(models.Model):
    user = models.ForeignKey(auth_models.User)
    name = models.CharField(max_length=50)
    main = models.URLField()
    registration = models.URLField(blank=True)
    login = models.URLField(blank=True)
    logout = models.URLField(blank=True)
    password_alphabet = models.PositiveSmallIntegerField(choices=ALPHABET_CHOICES, default=700)
    password_length = models.PositiveSmallIntegerField(default=20)


class Site(models.Model):
    domain = models.CharField(max_length=50, primary_key=True)
    user = models.ForeignKey(auth_models.User)
    name = models.CharField(max_length=50)
    accounter = models.ForeignKey('Accounter')
    

class UserProfile(models.Model):
    user = models.ForeignKey(auth_models.User, primary_key=True, related_name='profile')
    data = models.TextField(blank=True)
