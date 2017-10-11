import gulp from 'gulp';
import eslint from 'gulp-eslint';
import mocha from 'gulp-spawn-mocha';
import runSequence from 'run-sequence';
import { Instrumenter } from 'isparta';
import istanbul from 'gulp-istanbul';
import shell from 'gulp-shell';

// Replace hardcoded keys with environment based values 'process.env[KEY_NAME]'.
const serverJSFilePath = 'node_modules/chat-engine/server.js';
gulp.task('patch_server', shell.task([
    `cp ${serverJSFilePath} ${serverJSFilePath}.bak`,
    `sed -i "" "s/publishKey:[ ]'[a-zA-Z0-9-]*'/publishKey: process.env.PUBLISH_KEY/g" ${serverJSFilePath}`,
    `sed -i "" "s/subscribeKey:[ ]'[a-zA-Z0-9-]*'/subscribeKey: process.env.SUBSCRIBE_KEY/g" ${serverJSFilePath}`,
    `sed -i "" "s/secretKey:[ ]'[a-zA-Z0-9-]*'/secretKey: process.env.SECRET_KEY/g" ${serverJSFilePath}`,
]));
gulp.task('restore_server', shell.task([`mv ${serverJSFilePath}.bak ${serverJSFilePath}`]));

gulp.task('lint_code', () =>
    gulp.src(['src/**/*.js'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError()));

gulp.task('lint_tests', () =>
    gulp.src(['test/**/*.js'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError()));

gulp.task('pre-test', () => gulp.src(['src/**/*.js'])
    .pipe(istanbul({ instrumenter: Instrumenter, includeAllSources: true }))
    .pipe(istanbul.hookRequire()));

gulp.task('unit_tests', () =>
    gulp.src(['test/unit/**/*.test.js'], { read: false })
        .pipe(mocha({ reporter: 'spec', require: 'babel-register' })));

gulp.task('integration_tests', () =>
    gulp.src(['test/integration/**/*.test.js'], { read: false })
        .pipe(mocha({ reporter: 'spec', require: 'babel-register' })));

gulp.task('validate', ['lint_code', 'lint_tests']);

gulp.task('test', done => runSequence('unit_tests', 'integration_tests', 'validate', done));
