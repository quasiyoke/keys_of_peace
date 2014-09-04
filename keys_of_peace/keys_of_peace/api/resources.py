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


class Site(resources.ModelResource):
    class Meta:
        resource_name = 'site'
        queryset = models.Site.objects.all()
        list_allowed_methods = []
        detail_allowed_methods = []
        fields = ['host', ]


class Accounter(resources.ModelResource):
    main_site = fields.ForeignKey(Site, 'main_site', full=True, null=True)
    sites = fields.ToManyField(Site, 'sites', full=True, null=True)
    
    class Meta:
        resource_name = 'accounter'
        queryset = models.Accounter.objects.all()
        list_allowed_methods = ['get', ]
        detail_allowed_methods = []
        fields = ['alternative_names', 'icon', 'name', 'password_alphabet', 'password_length', ]
        authorization = authorization.Authorization()

    def apply_filters(self, request, filters):
        s = filters['contains']
        return self.get_object_list(request).contains(filters['contains'])

    def build_filters(self, filters=None):
        if not filters or 'contains' not in filters or filters['contains'] in ' ': # Checks for empty "contains" filter and space-only filter simultaneously.
            raise exceptions.BadRequest('Specify some string for "contains" filter.')
        return filters


class User(resources.ModelResource):
    PASSWORD_CHANGING_FIELDS = ['new_password_hash', 'new_salt', ]
    
    class Meta:
        resource_name = 'user'
        queryset = auth_models.User.objects.all()
        list_allowed_methods = ['get', 'post', ]
        detail_allowed_methods = ['get', 'patch', ]
        fields = ['email', ]
        filtering = {
            'email': ['exact', ]
        }
        authorization = authorization.Authorization()
        always_return_data = True

    def build_filters(self, *args, **kwargs):
        filters = super(User, self).build_filters(*args, **kwargs)
        if not filters:
            raise exceptions.BadRequest('Specify user\'s email.')
        return filters

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
        if not bundle.request.user.is_authenticated():
            self.unauthorized_result(bundle=bundle)
        bundle = super(User, self).full_hydrate(bundle)
        bundle.obj.profile.data = bundle.data['data']
        fields = set(bundle.data.keys())
        if fields.intersection(self.PASSWORD_CHANGING_FIELDS):
            if fields.issuperset(self.PASSWORD_CHANGING_FIELDS):
                try:
                    password_hash = crypto.from_string(bundle.data['new_password_hash'])
                except (ValueError, TypeError, ):
                    raise exceptions.BadRequest('Incorrect new_password_hash value.')
                try:
                    salt = crypto.from_string(bundle.data['new_salt'])
                except (ValueError, TypeError, ):
                    raise exceptions.BadRequest('Incorrect new_salt value.')
                bundle.obj.password = crypto.make_password(password_hash, salt)
            else:
                raise exceptions.BadRequest('Both new_password_hash and new_salt fields should be presented.')
        bundle.data = {} # To prevent update data e.g. `password_hash` population.
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
        
    def obj_get(self, bundle, **kwargs):
        credentials = (bundle.request.GET and bundle.request.GET.dict()) or (bundle.request.body and self.deserialize(bundle.request, bundle.request.body, format=bundle.request.META.get('CONTENT_TYPE', 'application/json'))) or {}
        try:
            object_list = self.get_object_list(bundle.request).filter(**kwargs)
            stringified_kwargs = ', '.join(["%s=%s" % (k, v) for k, v in kwargs.items()])
            if len(object_list) <= 0:
                raise self._meta.object_class.DoesNotExist("Couldn't find an instance of '%s' which matched '%s'." % (self._meta.object_class.__name__, stringified_kwargs))
            elif len(object_list) > 1:
                raise MultipleObjectsReturned("More than '%s' matched '%s'." % (self._meta.object_class.__name__, stringified_kwargs))
            bundle.obj = object_list[0]
            if self.is_authenticating(bundle.obj, credentials, bundle.request):
                auth.authenticate(
                    request=bundle.request,
                    user=bundle.obj,
                    salt=credentials['salt'],
                    one_time_salt=credentials['one_time_salt'],
                    data=credentials.get('data'),
                    password_hash=credentials['password_hash'],
                )
                one_time_salt = self.rotate_one_time_salt(bundle.request)
                if not bundle.request.user.is_authenticated():
                    self.unauthorized_result(bundle=bundle)
            self.authorized_read_detail(object_list, bundle)
            return bundle.obj
        except ValueError:
            raise exceptions.BadRequest('Invalid resource lookup data provided (mismatched type).')

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
