import models
from passw_pit import crypto as crypto_module


def crypto(request):
    return {
        'crypto': {
            'HASH_BITS_COUNT': crypto_module.HASH_BITS_COUNT,
            'HASH_ITERATIONS_COUNT': crypto_module.HASH_ITERATIONS_COUNT,
            'SALT_BITS_COUNT': crypto_module.SALT_BITS_COUNT,

            'ALPHABETS_BITS': models.ALPHABETS_BITS,
            'ALPHABETS': dict(models.ALPHABETS),
            'ALPHABETS_CHOICES': models.ALPHABET_CHOICES,
        }
    }
