import api
import views
from django.conf import settings
from django.conf import urls
from django.contrib import admin


admin.autodiscover()


urlpatterns = urls.patterns(
    '',
    urls.url(r'^configuration/$', views.configuration, name='configuration'),
    urls.url(r'^$', views.App.as_view(), name='home'),
    urls.url(r'^dashboard/$', views.App.as_view(), name='dashboard'),
    urls.url(r'^registration/$', views.App.as_view(), name='registration'),
    urls.url(r'^registration/success/$', views.App.as_view(), name='registration_success'),
    urls.url(r'^dashboard/settings/$', views.App.as_view(), name='settings'),
    urls.url(
        settings.ADMIN_URL_REGEX,
        urls.include(admin.site.urls)
        ),
    urls.url(r'^api/', urls.include(api.v1.urls)),
    )
