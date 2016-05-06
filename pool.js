/**
 * mysql.js Configuration
 */

'use strict';
//dependencias
var config = require('./config');
var mysql      = require('mysql');

var pool =mysql.createPool(config.mysql);
pool.on('enqueue', function () {
  //console.log('Waiting for available connection slot');
});
module.exports = pool;





