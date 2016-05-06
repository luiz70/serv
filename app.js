/*
	Main app file
*/

'use strict';

// Dependencies
var express = require('express');
var config = require('./config/config');

// Setup server
var app = express();
app.set('secret', config.secret);
require('./config/express')(app);
require('./config/headers')(app);
require('./routes')(app);

process.on('uncaughtException', function(err){
  console.log(err);
});
module.exports = app;