import crypto
import forms
import json
import models
from django import http
from django import template
from django.core import urlresolvers
from django.views.generic import edit as edit_views


class Home(edit_views.FormView):
    template_name = 'home.html'
    form_class = forms.Login

    def get_context_data(self, **kwargs):
        context = super(Home, self).get_context_data(**kwargs)
        context['account_form'] = forms.Account()
        return context


class Registration(edit_views.FormView):
    template_name = 'registration.html'
    form_class = forms.Registration


def configuration(request):
    configuration = {
        'CRYPTO': {
            'HASH_BITS_COUNT': crypto.HASH_BITS_COUNT,
            'HASH_ITERATIONS_COUNT': crypto.HASH_ITERATIONS_COUNT,
            'SALT_BITS_COUNT': crypto.SALT_BITS_COUNT,

            'ALPHABETS_BITS': models.ALPHABETS_BITS,
            'ALPHABETS': models.ALPHABETS,
            'ALPHABETS_CHOICES': models.ALPHABET_CHOICES,
            },

        'API_URL': '/api/v1/',
        'LOGIN_URL': urlresolvers.reverse('home'),
        }
    response = 'CONFIGURATION = %s;' % json.dumps(configuration)
    return http.HttpResponse(response)


def csrf_failure(request, reason=''):
    context = template.RequestContext(request, {})
    t = template.loader.get_template('403.html')
    return http.HttpResponseForbidden(t.render(context))
