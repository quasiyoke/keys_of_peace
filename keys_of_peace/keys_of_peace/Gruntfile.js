module.exports = function(grunt) {
  grunt.initConfig({
    jshint: {
      files: ['Gruntfile.js', 'test/pws/StoreFile.js', 'test/pws/StoreSerializer.js', 'test/StretchedKeyGenerator.js'],
      options: {
        globals: {
          jQuery: true
        }
      }
    },
    mochaTest: {
      test: {
        src: ['test/pws/StoreFile.js', 'test/pws/StoreSerializer.js', 'test/StretchedKeyGenerator.js']
      }
    },
    watch: {
      files: ['<%= jshint.files %>'],
      tasks: ['jshint']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-test');

  grunt.registerTask('test', 'mochaTest');
  grunt.registerTask('default', ['jshint', 'test']);
};
