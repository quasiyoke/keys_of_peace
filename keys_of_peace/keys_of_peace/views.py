import crypto
import forms
import json
import models
from django import http
from django import template
from django.conf import settings
from django.core import urlresolvers
from django.views.generic import edit as edit_views


class App(edit_views.FormView):
    template_name = 'app.html'
    form_class = forms.Login

    def get_context_data(self, **kwargs):
        context = super(App, self).get_context_data(**kwargs)
        context['account_form'] = forms.Account()
        context['password_change_form'] = forms.PasswordChange()
        context['registration_form'] = forms.Registration()
        return context

def csrf_failure(request, reason=''):
    context = template.RequestContext(request, {})
    t = template.loader.get_template('403.html')
    return http.HttpResponseForbidden(t.render(context))
