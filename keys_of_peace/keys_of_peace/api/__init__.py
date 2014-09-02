from tastypie import api

import resources


v1 = api.Api(api_name = 'v1')
v1.register(resources.Accounter())
v1.register(resources.User())
