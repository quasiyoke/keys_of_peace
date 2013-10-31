from django import forms


class Form(forms.Form):
    def __unicode__(self):
        return self.as_p()


class Login(Form):
    email=forms.EmailField()
    password=forms.CharField(widget=forms.PasswordInput())
    salt=forms.CharField(widget=forms.HiddenInput())
