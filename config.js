'use strict';

var fs=require('fs');

//Development environment specific configuration
module.exports = {
	mongoDB: {
		uri: 'mongodb://198.136.56.226',
		options: {
			db: {
				safe:true
			}
		}
	},

	secret: '', //seguridad para cifrado de jwt
	http:{
		port: 90,//puerto para la conexion, recomiendo dejar 88
		ip: "198.136.56.226"
	},

	mysql: {
  		host: 'localhost',
  		user: 'siggocom',
  		password: '',
  		database: 'siggocom_plataforma',
		connectionLimit: 50, //conexiones en pool, consejo, mantener asi
		queueLimit:80000, //mantener asi
	},
	
	mail: {
		host: 'mail.siggo.com.mx', //host de email
    	port: 25, 
		secure: false, 
		ignoreTLS: false,
		tls: { rejectUnauthorized: false },
    	auth: {
			user: 'pruebas@siggo.com.mx', //email sender
			pass: ''
    	}
	} 
	
};