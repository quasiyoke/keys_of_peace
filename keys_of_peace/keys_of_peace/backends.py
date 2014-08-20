import crypto
from django.contrib.auth import backends
from django.contrib.auth import models as auth_models


class Backend(backends.ModelBackend):
    def authenticate(self, request, user, salt, one_time_salt, password_hash, data=None):
        password = crypto.parse_password(user.password)
        try:
            session_one_time_salt = request.session['one_time_salt']
        except KeyError:
            return
        if crypto.from_string(session_one_time_salt) == one_time_salt and password['salt'] == salt:
            valid_password_hash = crypto.hash(password['hash'], one_time_salt)
            if data:
                valid_password_hash = crypto.hash(data, valid_password_hash)
            if crypto.constant_time_compare(valid_password_hash, password_hash):
                request.user = user
                return user
