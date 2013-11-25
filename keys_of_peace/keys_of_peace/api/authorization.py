from tastypie import authorization
from tastypie import exceptions


class Authorization(authorization.DjangoAuthorization):
    def update_detail(self, object_list, bundle):
        klass = self.base_checks(bundle.request, bundle.obj.__class__)

        if klass is False:
            raise exceptions.Unauthorized("You are not allowed to access that resource.")

        permission = '%s.change_%s' % (klass._meta.app_label, klass._meta.module_name)

        if not bundle.request.user.has_perm(permission, bundle.obj):
            raise exceptions.Unauthorized("You are not allowed to access that resource.")

        return True
