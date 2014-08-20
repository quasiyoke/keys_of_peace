import authorization
import json
from django import db
from django import http
from keys_of_peace import crypto
from keys_of_peace import models
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
        authorization = authorization.Authorization()
        always_return_data = True

    def dehydrate(self, bundle):
        password = crypto.parse_password(bundle.obj.password)
        bundle.data['salt'] = crypto.to_string(password['salt'])
        try:
            bundle.data['one_time_salt'] = bundle.request.session['one_time_salt']
        except KeyError:
            bundle.data['one_time_salt'] = crypto.to_string(self.rotate_one_time_salt(bundle.request))
        if bundle.request.user == bundle.obj and bundle.request.user.is_authenticated():
            bundle.data['data'] = bundle.obj.profile.data
        return bundle

    def full_hydrate(self, bundle):
        bundle = super(User, self).full_hydrate(bundle)
        bundle.obj.profile.data = bundle.data['data']
        return bundle

    def is_authenticating(self, user, credentials, request):
        '''
        Checks authentication credentials for validity and prepares them for authentication.
        
        @returns `True` if somebody tries to authenticate, `False` otherwise.
        '''
        if not set(credentials.keys()).issuperset(['one_time_salt', 'password_hash', 'salt', ]):
            return False
        try:
            credentials['salt'] = crypto.from_string(credentials['salt'])
        except (ValueError, TypeError, ):
            raise exceptions.BadRequest('Incorrect salt value.')
        try:
            credentials['one_time_salt'] = crypto.from_string(credentials['one_time_salt'])
        except (ValueError, TypeError, ):
            raise exceptions.BadRequest('Incorrect one_time_salt value.')
        try:
            credentials['password_hash'] = crypto.from_string(credentials['password_hash'])
        except (ValueError, TypeError, ):
            raise exceptions.BadRequest('Incorrect password_hash value.')
        return True

    def obj_create(self, bundle, request=None, **kwargs):
        try:
            email = bundle.data['email']
            salt = bundle.data['salt']
            password_hash = bundle.data['password_hash']
        except KeyError:
            raise exceptions.BadRequest('Specify email, salt and password_hash.')
        try:
            salt = crypto.from_string(salt)
        except (ValueError, TypeError, ):
            raise exceptions.BadRequest('Incorrect salt value.')
        try:
            password_hash = crypto.from_string(password_hash)
        except (ValueError, TypeError, ):
            raise exceptions.BadRequest('Incorrect password_hash value.')
        try:
            bundle.obj = self._meta.object_class.objects.create(
                email = email,
                username = email,
                password = crypto.make_password(password_hash, salt),
            )
        except db.IntegrityError:
            raise exceptions.BadRequest('There\'s already user with this email.')
        except (ValueError, TypeError, ):
            raise exceptions.BadRequest('Invalid data provided (mismatched type).')
        models.UserProfile.objects.create(
            user=bundle.obj,
        )
        bundle.data = {} # To prevent creation data e.g. `password_hash` population.
        return bundle

    def obj_get_list(self, bundle, **kwargs):
        filters = {}
        if hasattr(bundle.request, 'GET'):
            filters = bundle.request.GET.dict()
        filters.update(kwargs)
        try:
            email = filters['email']
        except KeyError:
            raise exceptions.BadRequest('Email is not specified.')
        try:
            queryset = self.get_object_list(bundle.request).filter(email=email)
        except (ValueError, TypeError, ):
            raise exceptions.BadRequest('Invalid resource lookup data provided (mismatched type).')
        try:
            user = queryset[0]
        except IndexError:
            raise exceptions.ImmediateHttpResponse(http.HttpNotFound('A user matching the provided arguments could not be found.')) # Unfortunatelly `exceptions.NotFound` is problematic for testing.
        if self.is_authenticating(user, filters, bundle.request):
            auth.authenticate(
                request=bundle.request,
                user=user,
                salt=filters['salt'],
                one_time_salt=filters['one_time_salt'],
                password_hash=filters['password_hash'],
            )
            one_time_salt = self.rotate_one_time_salt(bundle.request)
            if not bundle.request.user.is_authenticated():
                self.unauthorized_result(bundle=bundle)
        elif 'one_time_salt' not in bundle.request.session:
            self.rotate_one_time_salt(bundle.request)
        return queryset

    def obj_update(self, bundle, skip_errors=False, **kwargs):
        if not bundle.obj or not self.get_bundle_detail_data(bundle):
            try:
                lookup_kwargs = self.lookup_kwargs_with_identifiers(bundle, kwargs)
            except:
                # if there is trouble hydrating the data, fall back to just
                # using kwargs by itself (usually it only contains a "pk" key
                # and this will work fine.
                lookup_kwargs = kwargs
            try:
                bundle.obj = self.obj_get(bundle=bundle, **lookup_kwargs)
            except auth_models.User.DoesNotExist:
                raise exceptions.ImmediateHttpResponse(http.HttpNotFound('A user matching the provided arguments could not be found.'))
        if self.is_authenticating(bundle.obj, bundle.data, bundle.request):
            auth.authenticate(
                request=bundle.request,
                user=bundle.obj,
                salt=bundle.data['salt'],
                one_time_salt=bundle.data['one_time_salt'],
                data=bundle.data['data'],
                password_hash=bundle.data['password_hash'],
            )
            one_time_salt = self.rotate_one_time_salt(bundle.request)
            if not bundle.request.user.is_authenticated():
                self.unauthorized_result(bundle=bundle)
        else:
            raise exceptions.ImmediateHttpResponse(http.HttpUnauthorized('Authentication data wasn\'t provided.'))
        bundle = self.full_hydrate(bundle)
        bundle.data = {} # To prevent update data e.g. `password_hash` population.
        return self.save(bundle, skip_errors=skip_errors)

    def rotate_one_time_salt(self, request):
        one_time_salt = crypto.get_salt()
        request.session['one_time_salt'] = crypto.to_string(one_time_salt)
        return one_time_salt

    def save(self, bundle, skip_errors=False):
        bundle = super(User, self).save(bundle, skip_errors)
        bundle.obj.profile.save()
        return bundle

    def unauthorized_result(self, exception=None, bundle=None):
        kwargs = {}
        if bundle:
            kwargs['content'] = json.dumps({
                'one_time_salt': bundle.request.session['one_time_salt'],
            })
            kwargs['content_type'] = 'application/json'
        raise exceptions.ImmediateHttpResponse(http.HttpUnauthorized(**kwargs))
