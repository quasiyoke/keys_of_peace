import json
from django import db
from passw_pit import crypto
from passw_pit import models
from tastypie import exceptions
from tastypie import fields
from tastypie import http
from tastypie import resources
from django.contrib import auth
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

    def obj_get_list(self, request=None, **kwargs):
        filters = {}
        if request is None:
            request = kwargs['bundle'].request
        if hasattr(request, 'GET'):
            filters = request.GET.copy()
        filters.update(kwargs)
        try:
            email = filters['email']
        except KeyError:
            raise exceptions.BadRequest('Email is not specified.')
        try:
            queryset = self.get_object_list(request).filter(email=email)
        except ValueError:
            raise exceptions.BadRequest("Invalid resource lookup data provided (mismatched type).")
        user = 1 == len(queryset) and queryset[0]
        authentication_try = set(filters.keys()).issuperset(['email', 'one_time_salt', 'password_hash', 'salt', ])
        if authentication_try and user:
            try:
                one_time_salt = crypto.from_string(filters['one_time_salt'])
            except ValueError:
                raise exceptions.BadRequest('Incorrect one_time_salt value.')
            try:
                password_hash = crypto.from_string(filters['password_hash'])
            except ValueError:
                raise exceptions.BadRequest('Incorrect password_hash value.')
            try:
                salt = crypto.from_string(filters['salt'])
            except ValueError:
                raise exceptions.BadRequest('Incorrect salt value.')
            if auth.authenticate(request=request, one_time_salt=one_time_salt, salt=salt, password_hash=password_hash, email=email):
                user = True
        one_time_salt = crypto.get_salt()
        request.session['one_time_salt'] = crypto.to_string(one_time_salt)
        if authentication_try and user and not getattr(user, 'authenticated', False):
            raise exceptions.ImmediateHttpResponse(
                http.HttpUnauthorized(
                    json.dumps({
                        'one_time_salt': crypto.to_string(one_time_salt),
                    })
                )
            )
        return queryset

    def dehydrate(self, bundle):
        password = crypto.parse_password(bundle.obj.password)
        bundle.data['salt'] = crypto.to_string(password['salt'])
        bundle.data['one_time_salt'] = bundle.request.session['one_time_salt']
        if getattr(bundle.obj, 'authenticated', False):
            profile = bundle.obj.profile
            bundle.data['data'] = profile.data
            bundle.data['data_salt'] = profile.data_salt
        return bundle

    def obj_create(self, bundle, request=None, **kwargs):
        try:
            email = bundle.data['email']
            salt = bundle.data['salt']
            password_hash = bundle.data['password_hash']
        except KeyError:
            raise exceptions.BadRequest('Specify email, salt and password_hash.')
        try:
            salt = crypto.from_string(salt)
        except ValueError:
            raise exceptions.BadRequest('Incorrect salt value.')
        try:
            password_hash = crypto.from_string(password_hash)
        except ValueError:
            raise exceptions.BadRequest('Incorrect password_hash value.')
        try:
            bundle.obj = self._meta.object_class.objects.create(
                email = email,
                username = email,
                password = crypto.make_password(password_hash, salt),
            )
        except db.IntegrityError:
            raise exceptions.BadRequest('There\'s already user with this email.')
        except ValueError:
            raise exceptions.BadRequest("Invalid data provided (mismatched type).")
        models.UserProfile.objects.create(
            user=bundle.obj,
        )
        return bundle
