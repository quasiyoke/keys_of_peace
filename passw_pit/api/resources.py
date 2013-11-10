from django import db
from passw_pit import crypto
from passw_pit import models
from tastypie import exceptions
from tastypie import fields
from tastypie import resources
from django.contrib.auth import models as auth_models


class User(resources.ModelResource):
    class Meta:
        resource_name = 'user'
        queryset = auth_models.User.objects.all()
        list_allowed_methods = ['get', 'post', ]
        detail_allowed_methods = ['put', ]
        fields = ['email', ]
        filtering = {
            'email': ['exact', ]
        }

    def obj_create(self, bundle, request=None, **kwargs):
        try:
            email = bundle.data['email']
            salt = bundle.data['salt']
            password_hash = bundle.data['password_hash']
        except KeyError:
            raise exceptions.BadRequest('Specify email, salt and password_hash.')
        try:
            bundle.obj = self._meta.object_class.objects.create(
                email = email,
                username = email,
                password = crypto.make_password(
                    crypto.from_string(password_hash),
                    crypto.from_string(salt),
                ),
            )
        except db.IntegrityError:
            raise exceptions.BadRequest('There\'s already user with this email.')
        models.UserProfile.objects.create(
            user=bundle.obj,
        )
        return bundle
