import models
from django import forms
from keys_of_peace import crypto


class Form(forms.Form):
    def __unicode__(self):
        return self.as_p()


class Account(Form):
    link = forms.CharField(label='Link or name')
    login = forms.CharField(label='Login (optional)')
    email = forms.EmailField(label='Email (optional)')
    password = forms.CharField(widget=forms.PasswordInput())
    alphabet = forms.ChoiceField(choices=models.ALPHABET_CHOICES)
    length = forms.IntegerField()
    notes = forms.CharField(label='Notes (optional)', widget=forms.Textarea())


class Login(Form):
    email = forms.EmailField()
    password = forms.CharField(widget=forms.PasswordInput())


class PasswordChange(Form):
    current_password = forms.CharField(widget=forms.PasswordInput())
    new_password = forms.CharField(widget=forms.PasswordInput())
    new_password_confirmation = forms.CharField(label='Confirm new password', widget=forms.PasswordInput())


class Registration(Form):
    email = forms.EmailField()
    password = forms.CharField(widget=forms.PasswordInput())
    password_confirmation = forms.CharField(label='Confirm password', widget=forms.PasswordInput())
