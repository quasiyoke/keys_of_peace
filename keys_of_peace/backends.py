import crypto
from django.contrib.auth import backends
from django.contrib.auth import models as auth_models


class Backend(backends.ModelBackend):
    def authenticate(self, request, one_time_salt, salt, password_hash, email):
        success = False
        try:
            user = auth_models.User.objects.get(email=email)
        except auth_models.User.DoesNotExist:
            pass
        else:
            password = crypto.parse_password(user.password)
            session_one_time_salt = request.session.get('one_time_salt')
            if session_one_time_salt and crypto.from_string(session_one_time_salt) == one_time_salt and password['salt'] == salt and \
                      crypto.constant_time_compare(crypto.hash(password['hash'], one_time_salt), password_hash):
                return user
