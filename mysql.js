/**
 * mysql.js Configuration
 */

'use strict';
//dependencias
var config = require('./config');
var mysql      = require('mysql');

var connection = mysql.createConnection(config.mysql);
	connection.connect(function(err){
		if(err)console.log(err);
	});
	connection.on('error',function(error){
		if(err)console.log(error);
	})
	
	module.exports = connection;





