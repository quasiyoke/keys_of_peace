import oneself_permission_logic
import permission
from django.db import models
from django.contrib.auth import models as auth_models
from django.db.models import Q
from django.db.models import query


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


class AccounterManager(models.Manager):
    def get_query_set(self):
        return AccounterQuerySet(self.model, using=self._db)


class AccounterQuerySet(query.QuerySet):
    def contains(self, s):
        return self.filter(Q(alternative_names__icontains=s) | Q(name__icontains=s) | Q(sites__host__icontains=s)).distinct()


class Accounter(models.Model):
    alternative_names = models.CharField(max_length=200)
    icon = models.URLField(blank=True)
    main_site = models.ForeignKey('Site', null=True, related_name='main_site_for')
    name = models.CharField(max_length=50)
    password_alphabet = models.PositiveSmallIntegerField(choices=ALPHABET_CHOICES)
    password_length = models.PositiveSmallIntegerField()

    objects = AccounterManager()


class Site(models.Model):
    accounter = models.ForeignKey('Accounter', related_name='sites')
    host = models.URLField()


class UserProfile(models.Model):
    user = models.OneToOneField(auth_models.User, primary_key=True, related_name='profile')
    data = models.TextField(blank=True)


permission.add_permission_logic(auth_models.User, oneself_permission_logic.OneselfPermissionLogic())
