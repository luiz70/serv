/**
 * Express.js Configuration
 */

 'use strict';

var bodyParser = require('body-parser');

module.exports = function(app) {
	app.use(bodyParser.urlencoded({
		extended: false
	}));
	app.use(bodyParser.json());
};