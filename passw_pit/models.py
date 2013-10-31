from django.db import models
from django.contrib.auth import models as auth_models


class Account(models.Model):
    class Meta:
        index_together = (
            ('user', 'site', ),
        )
    
    user = models.ForeignKey(auth_models.User)
    site = models.ForeignKey('Site')
    login = models.CharField(max_length=50)
    data = models.TextField()
    created = models.DateTimeField(auto_now_add=True)


class Accounter(models.Model):
    user = models.ForeignKey(auth_models.User)
    name = models.CharField(max_length=50)
    main = models.URLField()
    registration = models.URLField(blank=True)
    login = models.URLField(blank=True)
    logout = models.URLField(blank=True)


class Site(models.Model):
    domain = models.CharField(max_length=50, primary_key=True)
    user = models.ForeignKey(auth_models.User)
    name = models.CharField(max_length=50)
    accounter = models.ForeignKey('Accounter')
    

class UserProfile(models.Model):
    user = models.ForeignKey(auth_models.User, primary_key=True, related_name='profile')
    data = models.TextField()
    salt = models.CharField(max_length=100, blank=True)
