# -*- coding: utf-8 -*-

import crypto
import itertools
from casper import tests as casper_test
from os import path
from tastypie import test as tastypie_test
from django.conf import settings


ACCOUNTER_API_URL = '/api/v1/accounter/'
ACCOUNTER_API_URL_PATTERN = '/api/v1/accounter/%s/'
SITE_API_URL = '/api/v1/site/'
SITE_API_URL_PATTERN = '/api/v1/site/%s/'
USER_API_URL = '/api/v1/user/'
USER_API_URL_PATTERN = '/api/v1/user/%s/'


class TestCase(tastypie_test.ResourceTestCase):
    pk = '100'


class AccounterDisallowedRequestsMethods(TestCase):
    def test_delete_detail(self):
        response = self.api_client.delete(ACCOUNTER_API_URL_PATTERN % self.pk)
        self.assertHttpMethodNotAllowed(response)
    
    def test_delete_list(self):
        response = self.api_client.delete(ACCOUNTER_API_URL)
        self.assertHttpMethodNotAllowed(response)
    
    def test_get_detail(self):
        response = self.api_client.get(ACCOUNTER_API_URL_PATTERN % self.pk)
        self.assertHttpMethodNotAllowed(response)
        
    def test_patch_list(self):
        response = self.api_client.patch(ACCOUNTER_API_URL, data={})
        self.assertHttpMethodNotAllowed(response)
    
    def test_patch_detail(self):
        response = self.api_client.patch(ACCOUNTER_API_URL_PATTERN % self.pk, data={})
        self.assertHttpMethodNotAllowed(response)
        
    def test_post_list(self):
        response = self.api_client.post(ACCOUNTER_API_URL, data={})
        self.assertHttpMethodNotAllowed(response)
    
    def test_post_detail(self):
        response = self.api_client.post(ACCOUNTER_API_URL_PATTERN % self.pk, data={})
        self.assertHttpMethodNotAllowed(response)
    
    def test_put_detail(self):
        response = self.api_client.put(ACCOUNTER_API_URL_PATTERN % self.pk, data={})
        self.assertHttpMethodNotAllowed(response)
        
    def test_put_list(self):
        response = self.api_client.put(ACCOUNTER_API_URL, data={})
        self.assertHttpMethodNotAllowed(response)


class Accounter(TestCase):
    def setUp(self):
        super(Accounter, self).setUp()
        import models
        self.accounter1 = models.Accounter.objects.create(
            alternative_names='alpha beta gamma',
            icon='delta',
            name='epsilon',
            password_alphabet=800,
            password_length=40,
        )
        site = models.Site.objects.create(
            host='zeta',
            accounter=self.accounter1,
        )
        self.accounter1.main_site = site
        self.accounter1.save()
        site = models.Site.objects.create(
            host='eta',
            accounter=self.accounter1,
        )
        site = models.Site.objects.create(
            host='theta',
            accounter=self.accounter1,
        )
        self.accounter2 = models.Accounter.objects.create(
            alternative_names=u'alpha iota kappa lambda азъ',
            icon='mu',
            name='nu',
            password_alphabet=800,
            password_length=40,
        )

    def assertAccounter(self, accounter_dict, accounter):
        self.assertKeys(accounter_dict, ['alternative_names', 'icon', 'main_site', 'name', 'password_alphabet', 'password_length', 'resource_uri', 'sites', ])
        self.assertEqual(accounter_dict['alternative_names'], accounter.alternative_names)
        self.assertEqual(accounter_dict['icon'], accounter.icon)
        self.assertEqual(bool(accounter_dict['main_site']), bool(accounter.main_site))
        self.assertEqual(accounter_dict['name'], accounter.name)
        self.assertEqual(accounter_dict['password_alphabet'], accounter.password_alphabet)
        self.assertEqual(accounter_dict['password_length'], accounter.password_length)
        self.assertEqual(accounter_dict['resource_uri'], ACCOUNTER_API_URL_PATTERN % accounter.pk)
        if accounter.main_site:
            self.assertSite(accounter_dict['main_site'], accounter.main_site)
            for site_dict, site in itertools.izip(accounter_dict['sites'], accounter.sites.all()):
                self.assertSite(site_dict, site)

    def assertAccounters(self, response, *accounters):
        deserialized = self.deserialize(response)
        self.assertEqual(len(deserialized['objects']), len(accounters))
        for accounter_dict, accounter in itertools.izip(deserialized['objects'], accounters):
            self.assertAccounter(accounter_dict, accounter)

    def assertSite(self, site_dict, site):
        self.assertKeys(site_dict, ['host', 'resource_uri', ])
        self.assertEqual(site_dict['host'], site.host)
        self.assertEqual(site_dict['resource_uri'], SITE_API_URL_PATTERN % site.pk)
    
    def test_get_list_by_main_site(self):
        response = self.api_client.get(ACCOUNTER_API_URL, data={
            'contains': 'zeta',
        })
        self.assertHttpOK(response)
        self.assertAccounters(response, self.accounter1)
    
    def test_get_list_by_not_main_site(self):
        response = self.api_client.get(ACCOUNTER_API_URL, data={
            'contains': 'theta',
        })
        self.assertHttpOK(response)
        self.assertAccounters(response, self.accounter1)
    
    def test_get_list_by_name(self):
        response = self.api_client.get(ACCOUNTER_API_URL, data={
            'contains': 'nu',
        })
        self.assertHttpOK(response)
        self.assertAccounters(response, self.accounter2)
    
    def test_get_list_by_cyrillic_alternative_name(self):
        response = self.api_client.get(ACCOUNTER_API_URL, data={
            'contains': u'азъ',
        })
        self.assertHttpOK(response)
        self.assertAccounters(response, self.accounter2)
    
    def test_get_list_by_common_alternative_name(self):
        response = self.api_client.get(ACCOUNTER_API_URL, data={
            'contains': 'alpha',
        })
        self.assertHttpOK(response)
        self.assertAccounters(response, self.accounter1, self.accounter2)
    
    def test_get_list_by_password_alphabet(self):
        response = self.api_client.get(ACCOUNTER_API_URL, data={
            'contains': '800',
        })
        self.assertHttpOK(response)
        self.assertAccounters(response)
    
    def test_get_list_by_password_length(self):
        response = self.api_client.get(ACCOUNTER_API_URL, data={
            'contains': '40',
        })
        self.assertHttpOK(response)
        self.assertAccounters(response)
    
    def test_get_list_no_data(self):
        response = self.api_client.get(ACCOUNTER_API_URL)
        self.assertHttpBadRequest(response)
    
    def test_get_list_empty_contains(self):
        response = self.api_client.get(ACCOUNTER_API_URL, data={
            'contains': '',
        })
        self.assertHttpBadRequest(response)
    
    def test_get_list_contains_space(self):
        response = self.api_client.get(ACCOUNTER_API_URL, data={
            'contains': ' ',
        })
        self.assertHttpBadRequest(response)


class JS(casper_test.CasperTestCase):
    JS_DIR = path.join(settings.BASE_DIR, 'keys_of_peace', 'js')
    
    def test_pws(self):
        self.assertTrue(self.casper(path.join(self.JS_DIR, 'pws-tests.js')))


class SiteDisallowedRequestsMethods(TestCase):
    def test_delete_detail(self):
        response = self.api_client.delete(SITE_API_URL_PATTERN % self.pk)
        self.assertHttpMethodNotAllowed(response)
    
    def test_delete_list(self):
        response = self.api_client.delete(SITE_API_URL)
        self.assertHttpMethodNotAllowed(response)
    
    def test_get_detail(self):
        response = self.api_client.get(SITE_API_URL_PATTERN % self.pk)
        self.assertHttpMethodNotAllowed(response)
    
    def test_get_list(self):
        response = self.api_client.get(SITE_API_URL)
        self.assertHttpMethodNotAllowed(response)
        
    def test_patch_list(self):
        response = self.api_client.patch(SITE_API_URL, data={})
        self.assertHttpMethodNotAllowed(response)
    
    def test_patch_detail(self):
        response = self.api_client.patch(SITE_API_URL_PATTERN % self.pk, data={})
        self.assertHttpMethodNotAllowed(response)
        
    def test_post_list(self):
        response = self.api_client.post(SITE_API_URL, data={})
        self.assertHttpMethodNotAllowed(response)
    
    def test_post_detail(self):
        response = self.api_client.post(SITE_API_URL_PATTERN % self.pk, data={})
        self.assertHttpMethodNotAllowed(response)
    
    def test_put_detail(self):
        response = self.api_client.put(SITE_API_URL_PATTERN % self.pk, data={})
        self.assertHttpMethodNotAllowed(response)
        
    def test_put_list(self):
        response = self.api_client.put(SITE_API_URL, data={})
        self.assertHttpMethodNotAllowed(response)


class UserTestCase(TestCase):
    def assertSalt(self, salt, previous_salt=None):
        salt = crypto.from_string(salt)
        self.assertEqual(len(salt), crypto.SALT_BITS_COUNT / 8)
        if previous_salt is not None:
            previous_salt = crypto.from_string(previous_salt)
            self.assertNotEqual(salt, previous_salt)

    def assertUser(self, user, credentials, one_time_salt=None, data=False):
        keys = ['resource_uri', 'email', 'salt', 'one_time_salt', ]
        if data:
            keys.append('data')
        self.assertKeys(user, keys)
        self.assertEqual(user['resource_uri'], USER_API_URL_PATTERN % credentials['pk'])
        self.assertEqual(user['email'], credentials['email'])
        self.assertEqual(user['salt'], credentials['salt'])
        self.assertSalt(user['one_time_salt'], one_time_salt)
        if data:
            self.assertEqual(user['data'], credentials['data'])


class UserDisallowedRequestsMethods(UserTestCase):
    def test_delete_detail(self):
        response = self.api_client.delete(USER_API_URL_PATTERN % self.pk)
        self.assertHttpMethodNotAllowed(response)
    
    def test_delete_list(self):
        response = self.api_client.delete(USER_API_URL)
        self.assertHttpMethodNotAllowed(response)
        
    def test_patch_list(self):
        response = self.api_client.patch(USER_API_URL, data={})
        self.assertHttpMethodNotAllowed(response)
    
    def test_post_detail(self):
        response = self.api_client.post(USER_API_URL_PATTERN % self.pk, data={})
        self.assertHttpMethodNotAllowed(response)
    
    def test_put_detail(self):
        response = self.api_client.put(USER_API_URL_PATTERN % self.pk, data={})
        self.assertHttpMethodNotAllowed(response)
        
    def test_put_list(self):
        response = self.api_client.put(USER_API_URL, data={})
        self.assertHttpMethodNotAllowed(response)


class UserRegistration(UserTestCase):
    email = 'john@example.com'
    base64_string = crypto.to_string('hello')
    bad_base64_string = 'hello'
    
    def test_no_data_specified(self):
        response = self.api_client.post(USER_API_URL)
        self.assertHttpBadRequest(response)

    def test_bad_salt(self):
        response = self.api_client.post(USER_API_URL, data={
            'email': self.email,
            'salt': self.bad_base64_string,
            'password_hash': self.base64_string,
        })
        self.assertHttpBadRequest(response)

    def test_bad_password_hash(self):
        response = self.api_client.post(USER_API_URL, data={
            'email': self.email,
            'salt': self.base64_string,
            'password_hash': self.bad_base64_string,
        })
        self.assertHttpBadRequest(response)

    def test_ok(self):
        credentials = {
            'pk': '1',
            'email': self.email,
            'salt': self.base64_string,
            'password_hash': self.base64_string,
        }
        response = self.api_client.post(USER_API_URL, data={
            'email': credentials['email'],
            'salt': credentials['salt'],
            'password_hash': credentials['password_hash'],
        })
        self.assertHttpCreated(response)
        user = self.deserialize(response)
        self.assertUser(user, credentials)

    def test_twins(self):
        response = self.api_client.post(USER_API_URL, data={
            'email': self.email,
            'salt': self.base64_string,
            'password_hash': self.base64_string,
        })
        self.assertHttpCreated(response)
        response = self.api_client.post(USER_API_URL, data={
            'email': self.email,
            'salt': self.base64_string,
            'password_hash': self.base64_string,
        })
        self.assertHttpBadRequest(response)


class UserAccessTestCase(UserTestCase):
    credentials = {
        'pk': '1',
        'email': 'john@example.com',
        'salt': crypto.to_string('alpha'),
        'password_hash': crypto.to_string('beta'),
        'data': 'gamma',
    }
    email = 'paul@example.com'
    string = 'theta'
    base64_string = crypto.to_string('iota')

    def get_password_hash(self, password_hash, one_time_salt, data=None):
        password_hash = crypto.hash(
            crypto.from_string(password_hash),
            crypto.from_string(one_time_salt),
        )
        if data is not None:
            password_hash = crypto.hash(data, password_hash)
        return crypto.to_string(password_hash)
    
    def setUp(self):
        super(UserAccessTestCase, self).setUp()
        response = self.api_client.post(USER_API_URL, data={
            'email': self.credentials['email'],
            'salt': self.credentials['salt'],
            'password_hash': self.credentials['password_hash'],
        })
        user = self.deserialize(response)
        self.one_time_salt = user['one_time_salt']


class UserWithoutData(UserAccessTestCase):
    def test_get_list(self):
        response = self.api_client.get(USER_API_URL, data={
            'email': self.credentials['email'],
        })
        self.assertHttpOK(response)
        deserialized = self.deserialize(response)
        self.assertEqual(deserialized['meta']['total_count'], 1)
        user = deserialized['objects'][0]
        self.assertUser(user, self.credentials)
        
    def test_get_list_missing(self):
        response = self.api_client.get(USER_API_URL, data={
            'email': self.email,
        })
        self.assertHttpOK(response)
        deserialized = self.deserialize(response)
        self.assertEqual(deserialized['meta']['total_count'], 0)

    def test_patch_detail(self):
        response = self.api_client.patch(USER_API_URL_PATTERN % self.credentials['pk'], data={
            'salt': self.credentials['salt'],
            'one_time_salt': self.one_time_salt,
            'password_hash': self.get_password_hash(self.credentials['password_hash'], self.one_time_salt, self.credentials['data']),
            'data': self.credentials['data'],
        })
        self.assertHttpAccepted(response)
        user = self.deserialize(response)
        self.assertUser(user, self.credentials, one_time_salt=self.one_time_salt, data=True)

    def test_patch_detail_missing(self):
        response = self.api_client.patch(USER_API_URL_PATTERN % self.pk, data={
            'salt': self.base64_string,
            'one_time_salt': self.base64_string,
            'password_hash': self.base64_string,
            'data': self.string,
        })
        self.assertHttpNotFound(response)

    def test_patch_detail_no_credentials_specified(self):
        response = self.api_client.get(USER_API_URL, data={
            'email': self.credentials['email'],
        })
        user = self.deserialize(response)['objects'][0]
        response = self.api_client.patch(USER_API_URL_PATTERN % self.credentials['pk'], data={})
        self.assertHttpUnauthorized(response)

    def test_patch_detail_bad_salt(self):
        response = self.api_client.patch(USER_API_URL_PATTERN % self.credentials['pk'], data={
            'salt': self.string,
            'one_time_salt': self.one_time_salt,
            'password_hash': self.credentials['password_hash'],
            'data': self.credentials['data'],
        })
        self.assertHttpBadRequest(response)

    def test_patch_detail_bad_one_time_salt(self):
        response = self.api_client.patch(USER_API_URL_PATTERN % self.credentials['pk'], data={
            'salt': self.credentials['salt'],
            'one_time_salt': self.string,
            'password_hash': self.credentials['password_hash'],
            'data': self.credentials['data'],
        })
        self.assertHttpBadRequest(response)

    def test_patch_detail_bad_password_hash(self):
        response = self.api_client.patch(USER_API_URL_PATTERN % self.credentials['pk'], data={
            'salt': self.credentials['salt'],
            'one_time_salt': self.one_time_salt,
            'password_hash': self.string,
            'data': self.credentials['data'],
        })
        self.assertHttpBadRequest(response)

    def test_patch_detail_not_hashed_password_hash(self):
        response = self.api_client.patch(USER_API_URL_PATTERN % self.credentials['pk'], data={
            'salt': self.credentials['salt'],
            'one_time_salt': self.one_time_salt,
            'password_hash': self.credentials['password_hash'],
            'data': self.credentials['data'],
        })
        self.assertHttpUnauthorized(response)
        deserialized = self.deserialize(response)
        self.assertSalt(deserialized['one_time_salt'], self.one_time_salt)


class UserWithDataTestCase(UserAccessTestCase):
    def setUp(self):
        super(UserWithDataTestCase, self).setUp()
        response = self.api_client.patch(USER_API_URL_PATTERN % self.credentials['pk'], data={
            'salt': self.credentials['salt'],
            'one_time_salt': self.one_time_salt,
            'password_hash': self.get_password_hash(self.credentials['password_hash'], self.one_time_salt, self.credentials['data']),
            'data': self.credentials['data'],
        })
        user = self.deserialize(response)
        self.one_time_salt = user['one_time_salt']

        
class UserWithData(UserWithDataTestCase):
    def test_get_list_no_email(self):
        response = self.api_client.get(USER_API_URL, data={})
        self.assertHttpBadRequest(response)

    def test_get_detail(self):
        response = self.api_client.get(USER_API_URL_PATTERN % self.credentials['pk'], data={
            'salt': self.credentials['salt'],
            'one_time_salt': self.one_time_salt,
            'password_hash': self.get_password_hash(self.credentials['password_hash'], self.one_time_salt),
        })
        self.assertHttpOK(response)
        user = self.deserialize(response)
        self.assertUser(user, self.credentials, one_time_salt=self.one_time_salt, data=True)

    def test_get_detail_missing(self):
        response = self.api_client.get(USER_API_URL_PATTERN % self.pk, data={
            'salt': self.string,
            'one_time_salt': self.one_time_salt,
            'password_hash': self.get_password_hash(self.credentials['password_hash'], self.one_time_salt),
        })
        self.assertHttpNotFound(response)

    def test_get_detail_bad_pk(self):
        response = self.api_client.get(USER_API_URL_PATTERN % self.string, data={
            'salt': self.string,
            'one_time_salt': self.one_time_salt,
            'password_hash': self.get_password_hash(self.credentials['password_hash'], self.one_time_salt),
        })
        self.assertHttpBadRequest(response)

    def test_get_detail_bad_salt(self):
        response = self.api_client.get(USER_API_URL_PATTERN % self.credentials['pk'], data={
            'salt': self.string,
            'one_time_salt': self.one_time_salt,
            'password_hash': self.get_password_hash(self.credentials['password_hash'], self.one_time_salt),
        })
        self.assertHttpBadRequest(response)

    def test_get_detail_bad_one_time_salt(self):
        response = self.api_client.get(USER_API_URL_PATTERN % self.credentials['pk'], data={
            'salt': self.credentials['salt'],
            'one_time_salt': self.string,
            'password_hash': self.get_password_hash(self.credentials['password_hash'], self.one_time_salt),
        })
        self.assertHttpBadRequest(response)

    def test_get_detail_bad_password_hash(self):
        response = self.api_client.get(USER_API_URL_PATTERN % self.credentials['pk'], data={
            'salt': self.credentials['salt'],
            'one_time_salt': self.one_time_salt,
            'password_hash': self.string,
        })
        self.assertHttpBadRequest(response)

    def test_get_detail_not_hashed_password_hash(self):
        response = self.api_client.get(USER_API_URL_PATTERN % self.credentials['pk'], data={
            'salt': self.credentials['salt'],
            'one_time_salt': self.one_time_salt,
            'password_hash': self.credentials['password_hash'],
        })
        self.assertHttpUnauthorized(response)
        deserialized = self.deserialize(response)
        self.assertSalt(deserialized['one_time_salt'], self.one_time_salt)

    def test_get_detail_guest(self):
        self.api_client.client.cookies.clear()
        response = self.api_client.get(USER_API_URL_PATTERN % self.credentials['pk'])
        self.assertHttpOK(response)
        user = self.deserialize(response)
        self.assertUser(user, self.credentials)

        
class UserChangePassword(UserWithDataTestCase):
    new_credentials = {
        'pk': UserWithData.credentials['pk'],
        'email': UserWithData.credentials['email'],
        'salt': crypto.to_string('delta'),
        'password_hash': crypto.to_string('epsilon'),
        'data': 'zeta',
    }

    def test_ok(self):
        response = self.api_client.patch(USER_API_URL_PATTERN % self.credentials['pk'], data={
            'salt': self.credentials['salt'],
            'one_time_salt': self.one_time_salt,
            'password_hash': self.get_password_hash(self.credentials['password_hash'], self.one_time_salt, self.new_credentials['data']),
            'new_salt': self.new_credentials['salt'],
            'new_password_hash': self.new_credentials['password_hash'],
            'data': self.new_credentials['data'],
        })
        self.assertHttpAccepted(response)
        user = self.deserialize(response)
        self.assertUser(user, self.new_credentials, one_time_salt=self.one_time_salt, data=True)
        self.one_time_salt = user['one_time_salt']
        response = self.api_client.get(USER_API_URL_PATTERN % self.new_credentials['pk'], data={
            'salt': self.new_credentials['salt'],
            'one_time_salt': self.one_time_salt,
            'password_hash': self.get_password_hash(self.new_credentials['password_hash'], self.one_time_salt),
        })
        self.assertHttpOK(response)
        user = self.deserialize(response)
        self.assertUser(user, self.new_credentials, one_time_salt=self.one_time_salt, data=True)

    def test_wrong_password_hash(self):
        response = self.api_client.patch(USER_API_URL_PATTERN % self.credentials['pk'], data={
            'salt': self.credentials['salt'],
            'one_time_salt': self.one_time_salt,
            'password_hash': self.get_password_hash(self.credentials['password_hash'], self.one_time_salt),
            'new_salt': self.new_credentials['salt'],
            'new_password_hash': self.new_credentials['password_hash'],
            'data': self.new_credentials['data'],
        })
        self.assertHttpUnauthorized(response)
        deserialized = self.deserialize(response)
        self.assertSalt(deserialized['one_time_salt'], self.one_time_salt)

    def test_no_new_password_hash(self):
        response = self.api_client.patch(USER_API_URL_PATTERN % self.credentials['pk'], data={
            'salt': self.credentials['salt'],
            'one_time_salt': self.one_time_salt,
            'password_hash': self.get_password_hash(self.credentials['password_hash'], self.one_time_salt, self.new_credentials['data']),
            'new_salt': self.new_credentials['salt'],
            'data': self.new_credentials['data'],
        })
        self.assertHttpBadRequest(response)

    def test_no_new_salt(self):
        response = self.api_client.patch(USER_API_URL_PATTERN % self.credentials['pk'], data={
            'salt': self.credentials['salt'],
            'one_time_salt': self.one_time_salt,
            'password_hash': self.get_password_hash(self.credentials['password_hash'], self.one_time_salt, self.new_credentials['data']),
            'new_password_hash': self.new_credentials['password_hash'],
            'data': self.new_credentials['data'],
        })
        self.assertHttpBadRequest(response)

    def test_bad_new_password_hash(self):
        response = self.api_client.patch(USER_API_URL_PATTERN % self.credentials['pk'], data={
            'salt': self.credentials['salt'],
            'one_time_salt': self.one_time_salt,
            'password_hash': self.get_password_hash(self.credentials['password_hash'], self.one_time_salt, self.new_credentials['data']),
            'new_salt': self.new_credentials['salt'],
            'password_hash': self.string,
            'data': self.new_credentials['data'],
        })
        self.assertHttpBadRequest(response)

    def test_bad_new_salt(self):
        response = self.api_client.patch(USER_API_URL_PATTERN % self.credentials['pk'], data={
            'salt': self.credentials['salt'],
            'one_time_salt': self.one_time_salt,
            'password_hash': self.get_password_hash(self.credentials['password_hash'], self.one_time_salt, self.new_credentials['data']),
            'new_salt': self.string,
            'new_password_hash': self.new_credentials['password_hash'],
            'data': self.new_credentials['data'],
        })
        self.assertHttpBadRequest(response)
