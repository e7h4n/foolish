#!/usr/bin/env node

'use strict';

var express = require('express');
var app = express();
var serveStatic = require('serve-static');
var gulp = require('gulp');
var gulpfile = require('./gulpfile');
var order = require('gulp-order');
var through = require('through');
var path = require('path');
var ROOT = path.resolve(gulpfile.SRC);
var less = require('gulp-less');
var sourcemaps = require('gulp-sourcemaps');
var tap = require('gulp-tap');
var gutil = require('gulp-util');
var debug = require('debug');
var concat = require('gulp-concat');

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

app.get('/app.js', function (req, res) {
    res.set('Content-Type', 'text/javascript');

    gulp.src([
        gulpfile.SRC + '**/*.js',
        '!' + gulpfile.SRC + 'node_modules/**/*.*',
        '!' + gulpfile.SRC + '**/gulpfile.js',
        '!' + gulpfile.BUILD + '**/*.*',
    ], {
        base: gulpfile.BASE,
        read: false
    })
    .pipe(order([
        gulpfile.SRC + 'main.js',
        gulpfile.SRC + '**/*.js',
        gulpfile.SRC + 'run.js'
    ], {
        base: gulpfile.BASE
    }))
    .pipe(tapDebug('script'))
    .pipe((function () {
        var files = [];
        return through(function (file) {
            files.push(file.path.substr(ROOT.length).replace(/\\/g, '/'));
        }, function () {
            res.send(files.map(function (file) {
                return 'document.write(\'<script src="' + file + '"></script>\');';
            }).join('\n'));
        });
    }()));
});

app.get('/app.css', function (req, res) {
    res.set('Content-Type', 'text/css');

    gulp.src(gulpfile.SRC + 'main.less')
        .pipe(sourcemaps.init())
        .pipe(less({
            lint: true,
            noIeCompat: true,
            relativeUrls: true
        }))
        .pipe(tapDebug('style'))
        .pipe(concat('app.css'))
        .pipe(sourcemaps.write())
        .pipe(tap(function (file) {
            res.send(file.contents);
        }));
});

app.use(serveStatic(gulpfile.BASE, {
    index: ['index.html']
}));

exports.start = function (port) {
    port = port || 3000;

    app.listen(port, function () {
        gutil.log('Server listening on http://127.0.0.1:' + port);
        gutil.log('This port can be changed by "foolish server --port PORT"');
    });
};
