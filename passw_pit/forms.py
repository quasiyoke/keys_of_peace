import models
from django import forms
from passw_pit import crypto
from passw_pit import validators


class Form(forms.Form):
    def __unicode__(self):
        return self.as_p()


class Account(Form):
    link = forms.CharField(label='Link or name')
    login = forms.CharField(label='Login or email')
    email = forms.EmailField()
    password = forms.CharField(widget=forms.PasswordInput())
    alphabet = forms.ChoiceField(choices=models.ALPHABET_CHOICES)
    length = forms.IntegerField(initial=20)
    notes = forms.CharField(widget=forms.Textarea())


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
