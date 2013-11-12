import crypto
import forms
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
