module.exports = function (gulp, $) {
  'use strict';

  var tsconfig = require('./../../tsconfig.json');

  gulp.task('clean', function () {
    return $.del(['lib/**']);
  });

  gulp.task('prepublish', ['clean'], function () {
    var tsSourcesResult = gulp.src(['./src/**/*.ts'])
      .pipe($.tsc.createProject('tsconfig.json')());

    return $.merge[
      tsSourcesResult.js
        .pipe(gulp.dest('./lib/src')),
      tsSourcesResult.dts
        .pipe(gulp.dest('./lib/src'))];
  });
};