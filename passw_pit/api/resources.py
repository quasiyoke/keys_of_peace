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
