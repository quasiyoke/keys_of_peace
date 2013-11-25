import models
import permission
from permission import registry
from django.contrib.auth import models as auth_models


class User(permission.PermissionHandler):
    def has_perm(self, user, perm, obj=None):
        if user.is_authenticated():
            if perm == 'auth.change_user':
                return obj == user
        return False


registry.register(auth_models.User, User)
