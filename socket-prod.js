'use strict';



//dependencias

var ioServer=require('socket.io');
var config = require('./config/config');
var _ = require('lodash-node');
var connection=require('./config/connection');
var jwt = require('jsonwebtoken');
var socketioJwt = require("socketio-jwt");
var database = require('./config/mongo');
var Usuario = database.getModel("Usuario");
var Cliente = database.getModel("Cliente");
var Conductor = database.getModel("Conductor");
var generador = require('./config/generador');
var md5 = require('md5');
var post = require('request');

module.exports = function(app, httpsserver) {

	//inicializa el servicor de socket escuchando al servidor https
	var io = ioServer.listen(httpsserver);

	//almacenaje de relacion socket usuario
	var socketUsuario = [];

	//verificacion de autenticidad
	io.of("/socket").use(socketioJwt.authorize({

	  secret: function(request, decodedToken, callback) {

		  	//se utiliza esto cuando el codigo de encripcion es personal y diferente para cada usuario.
			 connection.query("SELECT TokenSeguridad FROM USUARIOS WHERE Id="+decodedToken.Id, function(err, rows, fields) {

				  if(err)callback(null, "fail");
				  else if(rows.length>0){
					  callback(null, rows[0].TokenSeguridad);
				  }else callback(null, "fail");  
			  })

			 //callback(null, config.secret); //esta linea es para utilizar el mismo codigo de encripcion para cada usuario
		},

		timeout: 15000,
	  handshake: true
	}));

	//al usar io.of("/socket") cuando quieres conectarte via sockets necesitas usar la siguiente direccion ip:puerto/sockets   ej 40.40.40.40:88/socket

	io.of("/socket")
	.on('connection', function (socket) {
		//presenta al socket en consola
		console.log("conectado:" + socket.decoded_token.Usuario) //para pruebas es muy util
		//verifica si hay otros usuarios de su misma cuenta conectados
		Usuario.find({Id:socket.decoded_token.Id}, function(err,data){
			//si no los hay almacena el usuario en la base de datos
			if(data.length==0){
				var usuario = new Usuario(socket.decoded_token);
				usuario.save();
				socketUsuario.push({Id:socket.decoded_token.Id, Socket:socket})
			}else {
				//si si los hay almacena el valor de log que esta guardado en base de datos
				var log = data[0].Log;
				//si el nuevo socket tiene un log mayor 
				if(socket.decoded_token.Log > data[0].Log){

					//actualiza la base de datos con el socket mas reciente
					Usuario.update({Id:socket.decoded_token.Id},socket.decoded_token);
					log=socket.decoded_token.Log
					socketUsuario[_.findIndex(socketUsuario, {Id:socket.decoded_token.Id})].Socket=socket;
				}

				//envia un emit a todos los sockets para que se salgan los que deben de hacerlo (repetidos)
				socket.broadcast.emit("setLogOut",{Id:socket.decoded_token.Id,Log:log});
			}

				

		})		

		//desconexion de socket

		socket.on('disconnect', function () {
			console.log("desconectado:"+socket.decoded_token.Usuario)
		})

		//prefijo serv_ para todo lo relacionado con solicitar un Servicio
		//Tipo 1 es Cliente y Tipo2 es Conductor

		//INICIO DE LA SECCION SERVICIOS
		socket.on('serv_registrar',function(datos){

			if(socket.decoded_token.Tipo==1){
				var NuevoCliente = new Cliente({Id:socket.decoded_token.Id,StatusCancelacion:true,Status:0});
				Cliente.save();
			}
			if(socket.decoded_token.Tipo==2){
				var NuevoConductor = new Conductor({Id:socket.decoded_token.Id,Status:0,IdVehiculo:datos.IdVehiculo,IdCategoria:datos.IdCategoria});
				Conductor.save();
			}
		socket.emit('serv_registrar',"RESP":resp);
		})

		//ACTUALIZA POSICIONES;
		socket.on('serv_posicion' , function(datos){

			if(socket.decoded_token.Tipo==1){
				Cliente.update({Id:socket.decoded_token.Id},{Posicion:datos.Posicion});
			}

			if(socket.decoded_token.Tipo==2){
				Conductor.update({Id:socket.decoded_token.Id},{Posicion:datos.Posicion});
			}
		})


		// PAGOS
		socket.on('serv_pagar' , function(datos){

			if(datos.StatusPago==1)
			if(socket.decoded_token.Tipo==1){
				Cliente.update({Id:socket.decoded_token.Id},{Posicion:datos.Posicion});
			}

			if(socket.decoded_token.Tipo==2){
				Conductor.update({Id:socket.decoded_token.Id},{Posicion:datos.Posicion});
				Conductor.find({Id:socket.decoded_token.Id, Status:1},function(err,data){
					if(data.length>0){
						datos={
								IdCategoria:data.IdCategoria,
								Posicion:data.Posicion,
								Status:1
							}

						replicar_posicion(datos);	
					} 
				});
			}
		})


		//Función Notificación Masiva 
		function replicar_posicion(datos){
			var Clientes_Notificar = database.runCommand({
			    geoNear: "Clientes",
			    near: { type: "Point", coordinates: [ datos.Posicion ] },
			    spherical: true,
			    maxDistance: 5000,
			    query: { datos }
	   		});

	   		socket.broadcast.emit('serv_conductores_activos',{Clientes_Notificar,IdConductor:socket.decoded_token.Id,Posicion:datos.Posicion} );
	}


		//Auto mas Cercano






	})
	return module.exports;
}