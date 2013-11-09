import api
import views
from django.contrib import admin
from django.conf.urls import patterns, include, url


admin.autodiscover()


urlpatterns = patterns(
    '',
    url(r'^$', views.Home.as_view(), name='home'),
    url(r'^register/$', views.Registration.as_view(), name='registration'),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^api/', include(api.v1.urls)),
)
