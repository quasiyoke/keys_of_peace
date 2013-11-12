import api
import views
from django.contrib import admin
from django.conf.urls import patterns, include, url
from django.contrib.auth import views as auth_views


admin.autodiscover()


urlpatterns = patterns(
    '',
    url(r'^$', views.Home.as_view(), name='home'),
    url(r'^logout/$', auth_views.logout, {'next_page': '/'}, name='logout'),
    url(r'^register/$', views.Registration.as_view(), name='registration'),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^api/', include(api.v1.urls)),
)
