import base64
from django import forms
from passw_pit import crypto
from passw_pit import validators


class Form(forms.Form):
    def __unicode__(self):
        return self.as_p()


class Login(Form):
    email = forms.EmailField()
    password = forms.CharField(widget=forms.PasswordInput())
    salt = forms.CharField(widget=forms.HiddenInput())


class Registration(Form):
    email = forms.EmailField()
    password = forms.CharField(widget=forms.PasswordInput(), required=False)
    password_confirmation = forms.CharField(label='Confirm password', required=False, widget=forms.PasswordInput())
    password_hash = forms.CharField(validators=[validators.Base64()], widget=forms.HiddenInput())
    salt = forms.CharField(validators=[validators.Base64()], widget=forms.HiddenInput())

    def clean_salt(self):
        salt = self.cleaned_data['salt']
        salt = base64.b64decode(salt)
        return salt

    def clean_password_hash(self):
        password_hash = self.cleaned_data['password_hash']
        password_hash = base64.b64decode(password_hash)
        return password_hash
