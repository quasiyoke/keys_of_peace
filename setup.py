#!/usr/bin/env python

import os
import setuptools
from distutils import dir_util
from distutils import log
from distutils.command.build import build as _build
from distutils.command.clean import clean as _clean
from setuptools.command.bdist_egg import bdist_egg as _bdist_egg
from setuptools.command.develop import develop as _develop


SETUP_DIR = os.path.dirname(os.path.abspath(__file__))


class bdist_egg(_bdist_egg):
    def run(self):
        self.run_command('build_css')
        _bdist_egg.run(self)


class build_css(setuptools.Command):
    description = 'build CSS from SCSS'
    
    user_options = [
        ('sass-dir=', None,
         'the source directory where SCSS stylesheets were placed'),
        ('css-dir=', None,
         'the target directory for CSS'),
        ('css-mode=', None,
         'select a CSS output mode (default: compressed)'),
    ]
    
    def initialize_options(self):
        self.sass_dir = None
        self.css_dir = None
        self.css_mode = None
    
    def finalize_options(self):

        if self.sass_dir is None:
            self.sass_dir = os.path.join(SETUP_DIR, 'keys_of_peace', 'keys_of_peace', 'scss')
        if self.css_dir is None:
            print 
            if getattr(self, 'develop', False):
                self.css_dir = os.path.join('keys_of_peace', 'keys_of_peace', 'static', 'css')
            else:
                build = self.distribution.get_command_obj('build')
                build.ensure_finalized()
                self.css_dir = os.path.join(build.build_lib, 'keys_of_peace', 'keys_of_peace', 'static', 'css')
        if self.css_mode is None:
            self.css_mode = 'compressed'
    
    def run(self):
        import platform
        if 'Windows' == platform.system():
            executable = 'compass.bat'
        else:
            executable = 'compass'
        command = (
            executable,
            'compile',
            '--sass-dir', self.sass_dir,
            '--css-dir', self.css_dir,
            '--output-style', self.css_mode,
        )
        import subprocess
        try:
            subprocess.check_call(command)
        except (subprocess.CalledProcessError, OSError):
            print 'ERROR: problems with compiling Sass. Is Compass installed?'
            raise SystemExit


class build(_build):
    sub_commands = _build.sub_commands + [('build_css', None)]


class clean(_clean):
    def run(self):
        sass_cache_dir = '.sass-cache'
        if os.path.exists(sass_cache_dir):
            dir_util.remove_tree(sass_cache_dir, dry_run=self.dry_run)
        else:
            log.warn("'%s' does not exist -- can't clean it", sass_cache_dir)
        if self.all:
            css_dir = os.path.join('keys_of_peace', 'keys_of_peace', 'static', 'css')
            if os.path.exists(css_dir):
                dir_util.remove_tree(css_dir, dry_run=self.dry_run)
            else:
                log.warn("'%s' does not exist -- can't clean it", css_dir)            
        _clean.run(self)


class develop(_develop):
    def run(self):
        build_css = self.distribution.get_command_obj('build_css')
        build_css.develop = True
        self.run_command('build_css')
        _develop.run(self)


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
            'static/js/crypto/*.js',
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
        'bdist_egg': bdist_egg,
        'build': build,
        'build_css': build_css,
        'clean': clean,
        'develop': develop,
    },
)
