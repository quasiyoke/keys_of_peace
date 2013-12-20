"""
Django settings for keys_of_peace project.
"""

import os
BASE_DIR = os.path.dirname(os.path.dirname(__file__))

SECRET_KEY = '(t9!klkzu2mne225l=35$4%g9hh0_+ui2q7zcxsar74=g(ol!x'

DEBUG = True

TEMPLATE_DEBUG = True

STATIC_URL = '/static/'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

ALLOWED_HOSTS = []

# json_settings module allows to keep your project's configuration in JSON file. It replaces all settings defined before this import.
from json_settings import *

USE_I18N = True

USE_L10N = True

USE_TZ = True

INSTALLED_APPS = (
    'keys_of_peace',
    'permission',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
)

MIDDLEWARE_CLASSES = (
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
)

ROOT_URLCONF = 'keys_of_peace.urls'

WSGI_APPLICATION = 'keys_of_peace.wsgi.application'

AUTHENTICATION_BACKENDS = (
    'keys_of_peace.backends.Backend',
    'permission.backends.RoleBackend',
    'permission.backends.PermissionBackend',
)

import mimetypes
mimetypes.add_type('image/svg+xml', '.svg', True)
