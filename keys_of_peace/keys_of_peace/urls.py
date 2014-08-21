import api
import views
from django.conf import settings
from django.conf import urls
from django.contrib import admin


admin.autodiscover()


urlpatterns = urls.patterns(
    '',
    urls.url(r'^configuration/$', views.configuration, name='configuration'),
    urls.url(r'^$', views.Home.as_view(), name='home'),
    urls.url(r'^dashboard/$', views.Home.as_view(), name='home'),
    urls.url(r'^register/$', views.Registration.as_view(), name='registration'),
    urls.url(
        settings.ADMIN_URL_REGEX,
        urls.include(admin.site.urls)
        ),
    urls.url(r'^api/', urls.include(api.v1.urls)),
    )
