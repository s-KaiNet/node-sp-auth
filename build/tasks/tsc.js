var _ = require('lodash');

module.exports = function (gulp, $) {
  'use strict';

  gulp.task('tsc', function () {
    var tsSourcesResult = gulp.src(['src/**/*.ts'])
      .pipe($.sourcemaps.init())
      .pipe($.tsc.createProject('tsconfig.json')());

    var tsTestsResult = gulp.src(['test/**/*.ts'])
      .pipe($.sourcemaps.init())
      .pipe($.tsc.createProject('tsconfig.json')());

    var sources = tsSourcesResult.js
      .pipe($.sourcemaps.write('.'))
      .pipe(gulp.dest('./lib/src'));

    var tests = tsTestsResult.js
      .pipe($.sourcemaps.write('.'))
      .pipe(gulp.dest('./lib/test'));

      var declarations = tsSourcesResult.dts
      .pipe(gulp.dest('./lib/src'));

      return $.merge(sources, declarations, tests);
  });
};