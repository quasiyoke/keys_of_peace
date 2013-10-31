import views
from django.contrib import admin
from django.conf.urls import patterns, include, url


admin.autodiscover()


urlpatterns = patterns('',
    url(r'^$', views.Home.as_view(), name='home'),
    url(r'^admin/', include(admin.site.urls)),
)
