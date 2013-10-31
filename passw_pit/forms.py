from django import forms


class Login(forms.Form):
    email=forms.EmailField()
    password=forms.CharField()
    salt=forms.CharField(widget=forms.HiddenInput())
