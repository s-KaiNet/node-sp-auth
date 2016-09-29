module.exports = function (gulp, $) {
  'use strict';

  gulp.task('test-int', function (callback) {
    $.rns('tsc', 'test-integration', callback);
  });

  gulp.task('test-integration', function () {
    return gulp.src('./lib/test/integration/tests.js', { read: false })
      .pipe($.plumber())
      .pipe($.mocha({ reporter: 'spec' }));
  });
};
