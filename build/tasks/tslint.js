module.exports = function (gulp, $) {
  'use strict';

var emitError = !!$.yargs.argv.emitError;

  gulp.task('tslint', function () {
    return gulp.src(['src/**/*.ts', 'test/**/*.ts'])
      .pipe($.tslint({
        configuration: './tslint.json',
        formatter: 'verbose'
      }))
      .pipe($.tslint.report({
        summarizeFailureOutput: true,
        emitError: emitError
      }));
  });
};