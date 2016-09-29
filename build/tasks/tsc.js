var _ = require('lodash');

module.exports = function (gulp, $) {
  'use strict';

  var tsconfig = require('./../../tsconfig.json');

  gulp.task('tsc', function () {
    var tsSourcesResult = gulp.src(['src/**/*.ts', 'typings/index.d.ts'])
      .pipe($.sourcemaps.init())
      .pipe($.tsc(tsconfig.compilerOptions));

    var tsTestsResult = gulp.src(['test/**/*.ts', 'typings/index.d.ts'])
      .pipe($.sourcemaps.init())
      .pipe($.tsc(tsconfig.compilerOptions));

    var sources = tsSourcesResult.js
      .pipe($.sourcemaps.write('.'))
      .pipe(gulp.dest('./lib/src'));

    var tests = tsTestsResult.js
      .pipe($.sourcemaps.write('.'))
      .pipe(gulp.dest('./lib/test'));

      return $.merge(sources, tests);
  });
};