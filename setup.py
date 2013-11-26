#!/usr/bin/env python

import os
import setuptools
from distutils.command.build import build
from setuptools.command.install import install


SETUP_DIR = os.path.dirname(os.path.abspath(__file__))


class BuildCSS(setuptools.Command):
    description = 'build CSS from SCSS'
    
    user_options = []
    
    def initialize_options(self):
        pass
    
    def run(self):
        current_dir = os.getcwd()
        os.chdir(os.path.join(SETUP_DIR, 'keys_of_peace', 'keys_of_peace'))
        import platform
        if 'Windows' == platform.system():
            command = 'compass.bat compile'
        else:
            command = 'compass compile'
        import subprocess
        try:
            subprocess.check_call(command.split())
        except (subprocess.CalledProcessError, OSError):
            print 'ERROR: problems with compiling Sass. Is Compass installed?'
            raise SystemExit
        os.chdir(current_dir)
    
    def finalize_options(self):
        pass


class Build(build):
    sub_commands = build.sub_commands + [('build_css', None)]


class Install(install):
    def do_egg_install(self):
        self.run_command('build_css')
        install.do_egg_install(self)


setuptools.setup(
    name='keys_of_peace',
    version='0.0.1',
    description='Open website to save your passwords safely.',
    author='Pyotr Ermishkin',
    author_email='quasiyoke@gmail.com',
    url='https://github.com/quasiyoke/keys_of_peace',
    packages=[
        'keys_of_peace',
        'keys_of_peace.keys_of_peace',
        'keys_of_peace.keys_of_peace.api',
    ],
    package_data={
        'keys_of_peace.keys_of_peace': [
            'static/css/*.css',
            'static/images/*.gif',
            'static/images/*.jpg',
            'static/images/*.svg',
            'static/js/*.js',
            'static/swf/*.swf',
            'templates/*.html',
        ],
    },
    install_requires=[
        'django>=1.6',
        'django_permission>=0.4',
        'django_tastypie>=0.9',
        'mimeparse>=0.1.3',
    ],
    cmdclass={
        'build': Build,
        'build_css': BuildCSS,
        'install': Install,
    },
)
