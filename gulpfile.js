/*jshint node:true*/

'use strict';

var gulp = require('gulp');
var less = require('gulp-less');
var concat = require('gulp-concat');
var merge = require('merge-stream');
var order = require('gulp-order');
var tap = require('gulp-tap');
var del = require('del');
var vinylPaths = require('vinyl-paths');
var Vinyl = require('vinyl');
var debug = require('debug');
var rework = require('rework');
var reworkPluginURL = require('rework-plugin-url');
var through2 = require('through2');
var _ = require('underscore');
var assets = require('gulp-assets');
var path = require('path');

var PREFIX = process.env.PREFIX || '';
if (PREFIX.length > 0 && PREFIX[PREFIX.length - 1] !== '/') {
    PREFIX = PREFIX + '/';
}
debug('init')('PREFIX=%s', PREFIX);

var tapDebug = function (name, showContent) {
    var logger = debug(name);
    return tap(function (file) {
        if (showContent) {
            logger(file.path, file.contents.toString().substr(0, 1024));
        } else {
            logger(file.path);
        }
    });
};

var BUILD = 'dist/';
var SRC = '';
var BASE = SRC || './';

function scripts() {
    var scriptFiles = gulp.src([
        SRC + '**/*.js',
        '!' + SRC + 'node_modules/**/*.*',
        '!' + SRC + '**/gulpfile.js',
        '!' + BUILD + '**/*.*',
    ], {
        base: BASE
    })
    .pipe(tapDebug('script'));

    var index = gulp.src(SRC + 'index.html', {
        base: BASE
    });

    var vendors = index.pipe(tapDebug('jsVendors')).pipe(assets({
        js: true,
        css: false,
        cwd: false
    })).pipe(tapDebug('jsVendors'));

    var appJs = scriptFiles
        .pipe(order([
            SRC + 'main.js',
            SRC + '**/*.js',
            SRC + 'run.js'
        ], {
            base: BASE
        }))
        .pipe(tapDebug('script'))
        .pipe(concat({
            path: 'app.js',
            newLine: ';'
        }));

    return merge(vendors, appJs);
}

function styles() {
    var index = gulp.src(SRC + 'index.html', {
        base: BASE
    });

    var cssVendors = index.pipe(assets({
        js: false,
        css: true,
        cwd: false
    }));

    var lessStyle = gulp.src(SRC + 'main.less', {
        base: BASE
    }).pipe(less({
        lint: true,
        noIeCompat: true,
        relativeUrls: true
    })).pipe(concat({
        path: 'app.css' // 只是懒得再引入 rename
    }));

    return merge(cssVendors, lessStyle)
        .pipe(tapDebug('style'));
}

function images() {
    var allImages =  gulp.src([
        '!' + SRC + 'node_modules/**/*.*',
        '!' + BUILD + '**/*.*',
        SRC + '**/*.png',
        SRC + '**/*.jpg',
        SRC + '**/*.gif',
        SRC + '**/*.svg',
        SRC + '**/*.ico'
    ], {
        base: BASE
    });

    var cssImages = styles()
        .pipe(through2.obj(function (cssFile, enc, done) {
            var files = [];
            rework(cssFile.contents.toString())
                .use(reworkPluginURL(function (url) {
                    if (url.indexOf('?') !== -1) {
                        url = url.substr(0, url.indexOf('?'));
                    }

                    if (url.indexOf('#') !== -1) {
                        url = url.substr(0, url.indexOf('#'));
                    }

                    url = path.resolve(cssFile.dirname, url);

                    files.push(url);
                    return url;
                }));
            files = _.uniq(files);

            var self = this;
            gulp.src(files, {
                base: BASE
            }).pipe(through2.obj(function (imgFile, enc, cb) {
                self.push(imgFile);
                cb();
            }, function () {
                done();
            }));
        }));

    return merge(allImages, cssImages).pipe(tapDebug('image'));
}

// tasks ------------------------------------------------------------
gulp.task('copy', ['clean'], function () {
    return gulp.src(SRC + 'index.html', {
        base: BASE
    }).pipe(gulp.dest(BUILD));
});

gulp.task('build', ['clean'], function () {
    return merge(scripts(), styles(), images(), gulp.src(SRC + 'index.html', {
            base: BASE
        }))
        .pipe(tapDebug('src'))
        .pipe(gulp.dest(BUILD))
        .pipe(tapDebug('dist'));
});

gulp.task('clean', function () {
    return gulp.src(BUILD + '**/*.*', {
        read: false
    }).pipe(vinylPaths(del));
});

gulp.task('default', ['copy', 'build']);

exports.SRC = SRC;
exports.BASE = BASE;
exports.BUILD = BUILD;
exports.gulp = gulp;
