import api
import views
from django.conf import urls
from django.contrib import admin
from django.contrib.auth import views as auth_views


admin.autodiscover()


urlpatterns = urls.patterns(
    '',
    urls.url(r'^configuration/$', views.configuration, name='configuration'),
    urls.url(r'^$', views.Home.as_view(), name='home'),
    urls.url(r'^logout/$', auth_views.logout, {'next_page': '/'}, name='logout'),
    urls.url(r'^register/$', views.Registration.as_view(), name='registration'),
    urls.url(r'^admin/', urls.include(admin.site.urls)),
    urls.url(r'^api/', urls.include(api.v1.urls)),
    )
