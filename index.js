#!/usr/bin/env node
'use strict';

var argv = require('yargs').argv;

var command = argv._[0];

process.env.PREFIX = argv.prefix || '';

if (command === 'server') {
    require('./server').start(argv.port || 3000);
    return;
}

require('./gulpfile').gulp.start('default');
