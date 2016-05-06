/**
 * Mail.js Configuration
 */

'use strict';
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var config = require('./config');
var q = require('q');
var transporter = nodemailer.createTransport(smtpTransport(config.mail));

module.exports = {
	sendEmail: function(destino, codigo) {
		var deferred = q.defer();
		var mailOptions = {
			from: 'SIGGO Pruebas <pruebas@siggo.com.mx>', // sender address
			to: destino, // list of receivers
			subject: 'subject', // Subject line
			html:'html content',
		}

		// send mail with defined transport object
		transporter.sendMail(mailOptions, function(error, info){
			if (error) {
				deferred.resolve(false);
			} else {
				if (info.accepted[0]==destino && info.rejected.length == 0)deferred.resolve(true);
				else deferred.resolve(false);
			}
		});

		return deferred.promise;
	},

	SendTokenRecuperacion: function(destino, token) {
		var deferred = q.defer();
		var mailOptions = {
			from: 'SIGGO Pruebas <pruebas@siggo.com.mx>', // sender address
			to: destino, // list of receivers
			subject: 'Recuperación de contraseña', // Subject line
			html: '<p>Para recuperar su contraseña vaya a este enlace: <a href="http://www.siggo.com.mx:88/recuperar?key=' + token + '">Recuperar contraseña</a></p>',
		};

		// send mail with defined transport object
		transporter.sendMail(mailOptions, function(error, info){
			if (error) {
				console.log(error);
				deferred.resolve(false);
			} else {
				console.log('Mensaje enviado: ' + info.response);
				if (info.accepted[0]==destino && info.rejected.length == 0)deferred.resolve(true);
				else deferred.resolve(false);
			}
		});

		return deferred.promise;
	}
}





