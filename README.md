# Keys of Peace

## Requirements

Keys of Peace was written on [Python 2.7][1] and [Django 1.6][2], uses [Tastypie][3] to provide API and [Compass][4] for stylesheets compilation.

If you have [Setuptools][5] installed, all requirements except Compass will be installed automatically.

To install Compass follow instructions [here.][6]

## Installation

If Setuptools and Compass are installed, this will download, compile CSS and install all requirements in your environment:

    $ pip install -e git+git://github.com/quasiyoke/keys_of_peace.git#egg=keys_of_peace
    
This installs Keys of Peace in &ldquo;editable mode&rdquo; &mdash; at current directory.

Installation may take a few minutes if you have no Django 1.6 installed.
    
## Running The Site

To run Keys of Peace after described installation, execute:

    $ cd src/keys_of_peace
    $ python manage.py runserver

After that you may go at http://127.0.0.1:8000 and observe the site running on your machine.

## Building CSS

Execute this to compile SASS files:

    $ python setup.py build_css



  [1]: http://www.python.org/
  [2]: https://www.djangoproject.com/
  [3]: http://tastypieapi.org/
  [4]: http://compass-style.org/
  [5]: https://pypi.python.org/pypi/setuptools/
  [6]: http://compass-style.org/install/
