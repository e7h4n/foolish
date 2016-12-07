#!/usr/bin/env node

'use strict';

var express = require('express');
var app = express();
var serveStatic = require('serve-static');
var gulp = require('gulp');
var order = require('gulp-order');
var through = require('through');
var fs = require('fs');
var path = require('path');
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
        '**/*.js',
        '!node_modules/**/*.*',
        '!gen/**/*.*',
        '!**/gulpfile.js',
        '!dist/**/*.*',
    ], {
        read: false
    })
    .pipe(order([
        'main.js',
        '!run.js'
    ]))
    .pipe(tapDebug('script'))
    .pipe((function () {
        var files = [];
        return through(function (file) {
            files.push(file.relative);
        }, function () {
            res.send(files.map(function (file) {
                return 'document.write(\'<script src="' + file + '"></script>\');';
            }).join('\n'));
        });
    }()));
});

app.get('/app.css', function (req, res) {
    res.set('Content-Type', 'text/css');

    gulp.src('main.less')
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

app.get('*', function (req, res, next) {
    var filePath = path.join('.', req.url);
    if (filePath.indexOf('/app.js') !== -1) {
        filePath = filePath.replace(/\/app\.js$/, '/app.dev.js');
        fs.stat(filePath, function (err, stats) {
            if (err) {
                next();
                return;
            }

            console.log('[INFO] dev mode for ', req.url, '=>', filePath);
            req.url = req.url.replace(/\/app\.js$/, '/app.dev.js');
            next();
        });
        return;
    }

    next();
});

app.use(serveStatic('.', {
    index: ['index.html']
}));

exports.start = function (port) {
    port = port || 3000;

    app.listen(port, function () {
        gutil.log('Server listening on http://127.0.0.1:' + port);
        gutil.log('This port can be changed by "foolish server --port PORT"');
    });
};
