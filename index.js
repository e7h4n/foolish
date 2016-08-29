#!/usr/bin/env node
'use strict';

var argv = require('yargs')
    .alias('p', 'port')
    .alias('c', 'cdn')
    .argv;

var command = argv._[0];

if (command === 'server') {
    require('./server').start(argv.port);
    return;
}

require('./gulpfile').gulp.start('default');
