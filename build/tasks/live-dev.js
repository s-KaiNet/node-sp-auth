module.exports = function (gulp, $) {
  'use strict';

  gulp.task('live-dev', function () {
    gulp.watch(['src/**/*.ts', 'test/**/*.ts'], function () {
      $.rns('tslint', 'tsc');
    });
  });
};