import crypto
from tastypie import test as tastypie_test


USER_API_URL = '/api/v1/user/'
USER_API_URL_PATTERN = '/api/v1/user/%s/'


class UserTestCase(tastypie_test.ResourceTestCase):
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
    pk = '100'
    
    def test_delete_detail(self):
        response = self.api_client.delete(USER_API_URL_PATTERN % self.pk)
        self.assertHttpMethodNotAllowed(response)
    
    def test_delete_list(self):
        response = self.api_client.delete(USER_API_URL)
        self.assertHttpMethodNotAllowed(response)
    
    def test_get_detail(self):
        response = self.api_client.get(USER_API_URL_PATTERN % self.pk)
        self.assertHttpMethodNotAllowed(response)
    
    def test_patch_detail(self):
        response = self.api_client.patch(USER_API_URL_PATTERN % self.pk, data={})
        self.assertHttpMethodNotAllowed(response)
        
    def test_patch_list(self):
        response = self.api_client.patch(USER_API_URL, data={})
        self.assertHttpMethodNotAllowed(response)
    
    def test_post_detail(self):
        response = self.api_client.post(USER_API_URL_PATTERN % self.pk, data={})
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
    credentials1 = {
        'pk': '1',
        'email': 'john@example.com',
        'salt': crypto.to_string('alpha'),
        'password_hash': crypto.to_string('beta'),
        'data': 'gamma',
    }
    credentials2 = {
        'pk': '2',
        'email': 'sam@example.com',
        'salt': crypto.to_string('epsilon'),
        'password_hash': crypto.to_string('zeta'),
        'data': 'eta',
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
        self.api_client.post(USER_API_URL, data={
            'email': self.credentials1['email'],
            'salt': self.credentials1['salt'],
            'password_hash': self.credentials1['password_hash'],
        })
        self.api_client.post(USER_API_URL, data={
            'email': self.credentials2['email'],
            'salt': self.credentials2['salt'],
            'password_hash': self.credentials2['password_hash'],
        })


class UserWithoutData(UserAccessTestCase):
    def test_get_list_himself(self):
        response = self.api_client.get(USER_API_URL, data={
            'email': self.credentials2['email'],
        })
        self.assertHttpOK(response)
        user = self.deserialize(response)['objects'][0]
        self.assertUser(user, self.credentials2)
        
    def test_get_list_foreign(self):
        response = self.api_client.get(USER_API_URL, data={
            'email': self.credentials1['email'],
        })
        self.assertHttpOK(response)
        user = self.deserialize(response)['objects'][0]
        self.assertUser(user, self.credentials1)
        
    def test_guest_get_list_missing(self):
        response = self.api_client.get(USER_API_URL, data={
            'email': self.email,
        })
        self.assertHttpNotFound(response)

    def test_update_detail_missing(self):
        response = self.api_client.put(USER_API_URL_PATTERN % '100', data={
            'salt': self.base64_string,
            'one_time_salt': self.base64_string,
            'password_hash': self.base64_string,
            'data': self.string,
        })
        self.assertHttpNotFound(response)

    def test_update_detail_no_credentials_specified(self):
        response = self.api_client.get(USER_API_URL, data={
            'email': self.credentials1['email'],
        })
        user = self.deserialize(response)['objects'][0]
        response = self.api_client.put(USER_API_URL_PATTERN % self.credentials1['pk'], data={})
        self.assertHttpUnauthorized(response)

    def test_update_detail_bad_salt(self):
        response = self.api_client.get(USER_API_URL, data={
            'email': self.credentials1['email'],
        })
        user = self.deserialize(response)['objects'][0]
        response = self.api_client.put(USER_API_URL_PATTERN % self.credentials1['pk'], data={
            'salt': self.string,
            'one_time_salt': user['one_time_salt'],
            'password_hash': self.credentials1['password_hash'],
            'data': self.credentials1['data'],
        })
        self.assertHttpBadRequest(response)

    def test_update_detail_bad_one_time_salt(self):
        response = self.api_client.get(USER_API_URL, data={
            'email': self.credentials1['email'],
        })
        user = self.deserialize(response)['objects'][0]
        response = self.api_client.put(USER_API_URL_PATTERN % self.credentials1['pk'], data={
            'salt': self.credentials1['salt'],
            'one_time_salt': self.string,
            'password_hash': self.credentials1['password_hash'],
            'data': self.credentials1['data'],
        })
        self.assertHttpBadRequest(response)

    def test_update_detail_bad_password_hash(self):
        response = self.api_client.get(USER_API_URL, data={
            'email': self.credentials1['email'],
        })
        user = self.deserialize(response)['objects'][0]
        response = self.api_client.put(USER_API_URL_PATTERN % self.credentials1['pk'], data={
            'salt': self.credentials1['salt'],
            'one_time_salt': user['one_time_salt'],
            'password_hash': self.string,
            'data': self.credentials1['data'],
        })
        self.assertHttpBadRequest(response)

    def test_update_detail_not_hashed_password_hash(self):
        response = self.api_client.get(USER_API_URL, data={
            'email': self.credentials1['email'],
        })
        user = self.deserialize(response)['objects'][0]
        response = self.api_client.put(USER_API_URL_PATTERN % self.credentials1['pk'], data={
            'salt': self.credentials1['salt'],
            'one_time_salt': user['one_time_salt'],
            'password_hash': self.credentials1['password_hash'],
            'data': self.credentials1['data'],
        })
        self.assertHttpUnauthorized(response)
        one_time_salt = self.deserialize(response)['one_time_salt']
        self.assertSalt(one_time_salt, user['one_time_salt'])

    def test_update_detail(self):
        response = self.api_client.get(USER_API_URL, data={
            'email': self.credentials1['email'],
        })
        user = self.deserialize(response)['objects'][0]
        response = self.api_client.put(USER_API_URL_PATTERN % self.credentials1['pk'], data={
            'salt': self.credentials1['salt'],
            'one_time_salt': user['one_time_salt'],
            'password_hash': self.get_password_hash(self.credentials1['password_hash'], user['one_time_salt'], self.credentials1['data']),
            'data': self.credentials1['data'],
        })
        self.assertHttpOK(response)
        last_one_time_salt = user['one_time_salt']
        user = self.deserialize(response)
        self.assertUser(user, self.credentials1, one_time_salt=last_one_time_salt, data=True)

class UserWithData(UserAccessTestCase):
    def setUp(self):
        super(UserWithData, self).setUp()
        response = self.api_client.get(USER_API_URL, data={
            'email': self.credentials1['email'],
        })
        user = self.deserialize(response)['objects'][0]
        response = self.api_client.put(USER_API_URL_PATTERN % self.credentials1['pk'], data={
            'salt': self.credentials1['salt'],
            'one_time_salt': user['one_time_salt'],
            'password_hash': self.get_password_hash(self.credentials1['password_hash'], user['one_time_salt'], self.credentials1['data']),
            'data': self.credentials1['data'],
        })
        user = self.deserialize(response)
        response = self.api_client.put(USER_API_URL_PATTERN % self.credentials2['pk'], data={
            'salt': self.credentials2['salt'],
            'one_time_salt': user['one_time_salt'],
            'password_hash': self.get_password_hash(self.credentials2['password_hash'], user['one_time_salt'], self.credentials2['data']),
            'data': self.credentials2['data'],
        })
        user = self.deserialize(response)
        self.one_time_salt = user['one_time_salt']

    def test_get_list_no_email(self):
        response = self.api_client.get(USER_API_URL, data={
            'salt': self.credentials1['salt'],
            'one_time_salt': self.one_time_salt,
            'password_hash': self.get_password_hash(self.credentials1['password_hash'], self.one_time_salt),
        })
        self.assertHttpBadRequest(response)

    def test_get_list_bad_email(self):
        response = self.api_client.get(USER_API_URL, data={
            'email': self.email,
            'salt': self.credentials1['salt'],
            'one_time_salt': self.one_time_salt,
            'password_hash': self.get_password_hash(self.credentials1['password_hash'], self.one_time_salt),
        })
        self.assertHttpNotFound(response)

    def test_get_list_bad_salt(self):
        response = self.api_client.get(USER_API_URL, data={
            'email': self.credentials1['email'],
            'salt': self.string,
            'one_time_salt': self.one_time_salt,
            'password_hash': self.get_password_hash(self.credentials1['password_hash'], self.one_time_salt),
        })
        self.assertHttpBadRequest(response)

    def test_get_list_bad_one_time_salt(self):
        response = self.api_client.get(USER_API_URL, data={
            'email': self.credentials1['email'],
            'salt': self.credentials1['salt'],
            'one_time_salt': self.string,
            'password_hash': self.get_password_hash(self.credentials1['password_hash'], self.one_time_salt),
        })
        self.assertHttpBadRequest(response)

    def test_get_list_bad_password_hash(self):
        response = self.api_client.get(USER_API_URL, data={
            'email': self.credentials1['email'],
            'salt': self.credentials1['salt'],
            'one_time_salt': self.one_time_salt,
            'password_hash': self.string,
        })
        self.assertHttpBadRequest(response)

    def test_get_list_not_hashed_password_hash(self):
        response = self.api_client.get(USER_API_URL, data={
            'email': self.credentials1['email'],
            'salt': self.credentials1['salt'],
            'one_time_salt': self.one_time_salt,
            'password_hash': self.credentials1['password_hash'],
        })
        self.assertHttpUnauthorized(response)
        user = self.deserialize(response)
        self.assertSalt(user['one_time_salt'], self.one_time_salt)

    def test_get_list(self):
        response = self.api_client.get(USER_API_URL, data={
            'email': self.credentials1['email'],
            'salt': self.credentials1['salt'],
            'one_time_salt': self.one_time_salt,
            'password_hash': self.get_password_hash(self.credentials1['password_hash'], self.one_time_salt),
        })
        self.assertHttpOK(response)
        user = self.deserialize(response)['objects'][0]
        self.assertUser(user, self.credentials1, one_time_salt=self.one_time_salt, data=True)
    
    def test_get_list_himself(self):
        response = self.api_client.get(USER_API_URL, data={
            'email': self.credentials2['email'],
        })
        self.assertHttpOK(response)
        user = self.deserialize(response)['objects'][0]
        self.assertUser(user, self.credentials2)
    
    def test_get_list_foreign(self):
        response = self.api_client.get(USER_API_URL, data={
            'email': self.credentials1['email'],
        })
        self.assertHttpOK(response)
        user = self.deserialize(response)['objects'][0]
        self.assertUser(user, self.credentials1)

    def test_get_list_guest(self):
        self.api_client.client.cookies.clear()
        response = self.api_client.get(USER_API_URL, data={
            'email': self.credentials2['email'],
        })
        self.assertHttpOK(response)
        user = self.deserialize(response)['objects'][0]
        self.assertUser(user, self.credentials2)
