import forms
from django.views.generic import edit as edit_views


class Home(edit_views.FormView):
    template_name = 'home_login.html'
    form_class = forms.Login


class Registration(edit_views.FormView):
    template_name = 'registration.html'
    form_class = forms.Registration
