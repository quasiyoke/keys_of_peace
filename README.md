# Keys of Peace

Never lose your passwords. Keys of Peace will give you free access to your passwords even from public computers and portable devices. Keep your secrets at [keysofpeace.com][1]

## Principles

Principles of Keys of Peace operation were introduced at the first time [here (russian).][2] Here is their overall results.

### Basic Concepts
* Account &mdash; a combination of URL, login and password for some site.
* Password &mdash; account's password.
* Master-password &mdash; password which user uses to login to Keys of Peace.
* Salt &mdash; random string for master-password hashing.
* Master-salt &mdash; salt used every time user logins to generate master-hash.

### Registration
Assume that Alice wants to register at Bob's Keys of Peace server.

1. Alice invents her master-password, generates master-salt and sends to Bob email, master-salt and master-hash where `master_hash = hash(master_password, master_salt)`
2. Bob just saves at DB email, master-salt and master-hash.

Alice should use trusted connection for registration, cause if Mallory knows master-hash, he can login any time he want, but he can't read Alice's accounts.

### Getting Accounts
Alice have arrived to Bahamas for vacation and she wants to login at her photosharing service to publish some photos. She uses Keys of Peace to keep passwords. What will she do to get her accounts?

1. Alice sends her email to Bob.
2. Bob generates one-time salt and saves it at Alice's session, gets Alice's master-salt from DB and sends to Alice master-salt and one-time salt.
3. Alice sends to Bob master-salt and one-time salt (to prove completion of steps 1 and 2), email and `hash(master_hash, one_time_salt)` where master-hash was gotten this way (because Alice doesn't remembers it): `master_hash = hash(master_password, master_salt)`.
4. Bob checks master-salt and one-time salt given by Alice and generates `hash(master_hash, one_time_salt)` to check does Alice have master-password. If login was failed, Bob responds with 401 (Unauthorized) status code, otherwise he marks Alice's session ID as authenticated and sends her ciphered accounts and accounts' salt.
5. Alice decodes accounts' JSON: `accounts = decipher(ciphered_accounts, hash(master_password, accounts_salt))`.

If Mallory has sniffed Alice's master-hash while registration, he can login and get ciphered accounts, but he can't decipher the accounts, because he still doesn't know master-password.

If Mallory listens Alice during authentication, he can't login by themselves, because Bob'll use another one-time salt next time.

### Saving Accounts
Assume that after login at Keys of Peace Alice has registered at some rental service and wants to save her automatically generated 20-letters password at Keys of Peace.

1. Alice generates new accounts' salt and sends to Bob accounts' salt and `cipher(accounts, hash(master_password, accounts_salt))`.

Done!

## Algorithms

We are using PBKDF2 (1000 times SHA-256) for hashing and AES-256 for ciphering.


## Requirements

Keys of Peace was written on [Python 2.7][3] and [Django 1.6][4], uses [Tastypie][5] to provide API and [Compass][6] for stylesheets compilation.

All requirements except Compass and Django will be installed automatically.

To install Compass follow instructions [here.][8]

## Installation

If Django and Compass are installed, his will download, compile CSS and install the rest of requirements in your environment:

    $ pip install -e git+git://github.com/quasiyoke/keys_of_peace.git#egg=keys_of_peace
    
This installs Keys of Peace in &ldquo;editable mode&rdquo; &mdash; at current directory.

## Building CSS

Execute this to compile SASS files:

    $ python setup.py build_css
    
## Running The Site

To run Keys of Peace after described installation, execute:

    $ cd src/keys_of_peace
    $ python manage.py runserver

After that you may go to http://127.0.0.1:8000 and observe the site running on your machine.

## Testing

To launch Keys of Peace tests, execute:

    $ cd src/keys_of_peace
	$ python manage.py test keys_of_peace.tests


  [1]: http://keysofpeace.com
  [2]: https://vk.com/note36407797_11676492
  [3]: http://www.python.org/
  [4]: https://www.djangoproject.com/
  [5]: http://tastypieapi.org/
  [6]: http://compass-style.org/
  [7]: https://pypi.python.org/pypi/setuptools/
  [8]: http://compass-style.org/install/
