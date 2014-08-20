import crypto
from tastypie import test as tastypie_test


USER_API_URL = '/api/v1/user/'
USER_API_URL_PATTERN = '/api/v1/user/%s/'


class UserTestCase(tastypie_test.ResourceTestCase):
    pk = '100'
    
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
