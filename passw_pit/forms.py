from django import forms


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
    password_hash = forms.CharField(widget=forms.HiddenInput())
    salt = forms.CharField(widget=forms.HiddenInput())
