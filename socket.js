/**Main app socket**/

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
		Usuario.find(function(err,data){
			console.log(data);
		});
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
		//example 1
		


/*SECCION E VIAJES*/
		socket.on('viajes',function(datos){
			console.log(datos);
			connection.query("SELECT IdServicio,Origen,Destino,ImporteTotal,Inicia from SERVICIOS WHERE IdCliente="+datos.Id+" and Status='FINALIZADO' order by IdServicio DESC LIMIT 0, 5", function(err,rows,fields){
				if(err){
					console.log(err);
					socket.emit('viajes',{"RESP":"NO"});
				}else if(rows.length>0){
						socket.emit('viajes',{"RESP":"OK","DATOS":rows});
					}else{
						socket.emit('viajes',{"RESP":"NO"});
				}
			})		
		})
	
		socket.on('viajes_anteriores', function(datos){

			connection.query("SELECT IdServicio,Origen,Destino,ImporteTotal,Inicia,Ruta from SERVICIOS WHERE IdCliente="+datos.Id+" and Status='FINALIZADO' order by IdServicio DESC LIMIT "+datos.Inicial+", 5", function(err,rows,fields){
				if(err){
					console.log(err);
					socket.emit('viajes_anteriores',{"RESP":"NO"});
				}else if(rows.length>0){
						socket.emit('viajes_anteriores',{"RESP":"OK","DATOS":rows});
					}else{
						socket.emit('viajes_anteriores',{"RESP":"NO"});
				}
			})
		})

		socket.on('viajes_actualizar', function(datos){
			connection.query("SELECT  IdServicio,Origen,Destino,ImporteTotal,Inicia,Ruta from SERVICIOS WHERE IdCliente="+datos.Id+" and Status='FINALIZADO' and IdServicio>"+datos.IdServicio+" order by IdServicio DESC", function(err,rows,fields){
				if(err){
					console.log(err);
					socket.emit('viajes_actualizar',{"RESP":"NO"});
				}else if(rows.length>0){
						socket.emit('viajes_actualizar',{"RESP":"OK","DATOS":rows});
					}else{
						socket.emit('viajes_actualizar',{"RESP":"NO"});
				}
			})	
		})

		socket.on('viajes_detalles', function(datos){
			console.log(datos);
			connection.query("SELECT `IdServicio`,B.Nombre as CondNombre, B.ApellidoPaterno as CondApellido, `Origen`, `Destino`,C.Descripcion as Categ, `TarifaBase`, `CostoPorMinuto`, `CostoPorKilometro`, `ImporteTotal`, `TiempoTotal`, `DistanciaTotal`, `Inicia`, `Termina`, `Ruta`, D.Descripcion as TipoPago, `Status` FROM `SERVICIOS` AS A LEFT JOIN CATEGORIAS as C ON A.Categoria=C.IdCategoria LEFT JOIN METODOS_PAGO as D ON A.MetodoPago=D.IdMetodo LEFT JOIN USUARIOS as B ON A.IdConductor=B.Id where IdServicio="+datos.IdServicio, function(err,rows,fields){
				if(err){
					console.log(err);
					socket.emit('viajes_detalles',{"RESP":"NO"});
				}else if(rows.length>0){
						socket.emit('viajes_detalles',{"RESP":"OK","DATOS":rows});
					}else{
						socket.emit('viajes_detalles',{"RESP":"NO"});
				}
			})	
		})

		socket.on('viajes_ayuda', function(datos){
			console.log(datos);
			connection.query("INSERT INTO `SERVICIOS_AYUDA`(`IdServicio`, `Asunto`, `Comentarios`, `Status`) VALUES ("+datos.IdServicio+", '"+datos.Asunto+"', '"+datos.Comentarios+"', 0)", function(err,rows,fields){
				if(err){
					console.log(err);
					socket.emit('viajes_ayuda',{"RESP":"NO"});
				}else{
					socket.emit('viajes_ayuda',{"RESP":"OK"});
				}
			})	
		})


// INGRESOS
		socket.on('ingresos_lista', function(datos){
			console.log(datos);
			connection.query("SELECT Sum(ImporteTotal) as T_Importe, Count(IdConductor) as T_Servicios FROM SERVICIOS WHERE (Inicia BETWEEN '"+datos.Fechas.Inicia+"' and '"+datos.Fechas.Termina+"') and Status='FINALIZADO'and IdConductor="+datos.Id, function(err,Montos,fields){
				if(err){
					console.log(err);
				}else{				
					connection.query("SELECT IdServicio, Inicia, ImporteTotal FROM SERVICIOS WHERE (Inicia BETWEEN '"+datos.Fechas.Inicia+"' and '"+datos.Fechas.Termina+"') and Status='FINALIZADO'and IdConductor="+datos.Id+" Order by IdServicio DESC LIMIT 0, 5", function(err,Registros,fields){
						if(err){
							console.log(err);
							socket.emit('ingresos_lista',{"RESP":"NO"});
						}else{
							socket.emit('ingresos_lista',{"RESP":"OK","TOTALES":Montos,"REGISTROS":Registros});
						}
					})
				}
			})	
		})	

		socket.on('ingresos_anteriores', function(datos){
			console.log(datos);
			connection.query("SELECT Sum(ImporteTotal) as T_Importe, Count(IdConductor) as T_Servicios FROM SERVICIOS WHERE (Inicia BETWEEN '"+datos.Fechas.Inicia+"' and '"+datos.Fechas.Termina+"') and Status='FINALIZADO'and IdConductor="+datos.Id, function(err,Montos,fields){
				if(err){
					console.log(err);
				}else{				
					connection.query("SELECT IdServicio, Inicia, ImporteTotal FROM SERVICIOS WHERE (Inicia BETWEEN '"+datos.Fechas.Inicia+"' and '"+datos.Fechas.Termina+"') and Status='FINALIZADO'and IdConductor="+datos.Id+" Order by IdServicio DESC LIMIT "+datos.Indice+", 5", function(err,Registros,fields){
						if(err){
							console.log(err);
							socket.emit('ingresos_anteriores',{"RESP":"NO"});
						}else{
							if(Registros.length>0){
								socket.emit('ingresos_anteriores',{"RESP":"OK","TOTALES":Montos,"REGISTROS":Registros});
							}else{
								socket.emit('ingresos_anteriores',{"RESP":"NO"});
							}
						}
					})
				}
			})	
		})	


		socket.on('ingresos_actualizar', function(datos){
			console.log(datos);
			connection.query("SELECT Sum(ImporteTotal) as T_Importe, Count(IdConductor) as T_Servicios FROM SERVICIOS WHERE (Inicia BETWEEN '"+datos.Fechas.Inicia+"' and '"+datos.Fechas.Termina+"') and Status='FINALIZADO'and IdConductor="+datos.Id, function(err,Montos,fields){
				if(err){
					console.log(err);
				}else{				
					connection.query("SELECT IdServicio, Inicia, ImporteTotal FROM SERVICIOS WHERE (Inicia BETWEEN '"+datos.Fechas.Inicia+"' and '"+datos.Fechas.Termina+"') and IdServicio>"+datos.IdServicio+" and  Status='FINALIZADO'and IdConductor="+datos.Id, function(err,Registros,fields){
						if(err){
							console.log(err);
							socket.emit('ingresos_actualizar',{"RESP":"NO"});
						}else{							
							if(Registros.length>0){
								socket.emit('ingresos_lista',{"RESP":"OK","TOTALES":Montos,"REGISTROS":Registros});
							}else{
								socket.emit('ingresos_lista',{"RESP":"NO"});
							}
						}
					})
				}
			})	
		})	

		socket.on('ingresos_detalle', function(datos){
			console.log(datos);
			connection.query("SELECT * FROM SERVICIOS WHERE IdServicio="+datos.IdServicio, function(err,Registro,fields){
				if(err){
					console.log(err);
					socket.emit('ingresos_detalle',{"RESP":"NO"});
				}else{
					socket.emit('ingresos_detalle',{"RESP":"OK","REGISTRO":Registro});
				}
			})
		})





		//prefijo serv_ para todo lo relacionado con solicitar un Servicio
		//Tipo 1 es Cliente y Tipo2 es Conductor

		//INICIO DE LA SECCION SERVICIOS
		socket.on('serv_registrar',function(datos){
			if(socket.decoded_token.Tipo==1){
				var NuevoCliente = new Cliente({Id:socket.decoded_token.Id,StatusCancelacion:true,Status:0, Posicion:0});
				NuevoCliente.save();
				Cliente.find(function(err,data){
					console.log("Cliente\n"+data);
				});

			}

			if(socket.decoded_token.Tipo==2){
				var NuevoConductor = new Conductor({Id:socket.decoded_token.Id,Status:0,IdVehiculo:datos.IdVehiculo,IdCategoria:datos.IdCategoria});
				NuevoConductor.save();
				Conductor.find(function(err,data){
					console.log("Conductor\n"+data);
				});
			}


		socket.emit('serv_registrar');
		})



		//Crea varios usuarios para prueba
		socket.on('crear_usuarios',function(){
			console.log("Creando Usuarios...\n");
				var C1 = new Cliente({Id:45,Posicion:[123345,-12345],Status:1});
				C1.save(function(err,data){
				// 	console.log("ERROR"+err);
				// 	console.log("DATOS"+data);
				 });

				var C2 = new Cliente({Id:25,Posicion:[123344,-12342],Status:1});
				C2.save(function(err,data){
				// 	console.log("ERROR"+err);
				// 	console.log("DATOS"+data);
				 });

				var C3 = new Cliente({Id:43,Posicion:[123341,-12315],Status:1});
				C3.save(function(err,data){
				// 	console.log("ERROR"+err);
				// 	console.log("DATOS"+data);
				 });
				
			Cliente.find(function(err,data){
				console.log(data);
			})
		})






		//ACTUALIZA POSICIONES;
		socket.on('serv_posicion' , function(datos){
			console.log(datos);

			if(socket.decoded_token.Tipo==1){
				Cliente.update({Id:socket.decoded_token.Id},{Posicion:100},,function(err,data){
					
				});
				Cliente.find(function(err,e){
					console.log("CLIENTE_ _ _\n"+e);
				})
			}

			if(socket.decoded_token.Tipo==2){
				Conductor.where({Id:socket.decoded_token.Id}).update({Posicion:[datos.Posicion]});
				Conductor.find(function(err,e){
					console.log("CONDUCTOR _ _ _\n"+e);
				})
			}

			socket.emit('serv_posicion',{"RESP":"OK"}); 
		})


		// PAGOS
		socket.on('serv_pagar' , function(datos){

			if(datos.StatusPago==1)
			if(socket.decoded_token.Tipo==1){
				db.Cliente.update({Id:socket.decoded_token.Id},{Posicion:datos.Posicion});
				Cliente.find(function(err,e){
					console.log("CLIENTE_ _ _\n"+e);
				})
			}

			if(socket.decoded_token.Tipo==2){
				Conductor.where({Id:socket.decoded_token.Id}).update({Posicion:datos.Posicion});
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

		socket.on('buscar_disponible',function(datos){
			datos={
				Status:1,
				IdCategoria:datos.IdCategoria,
				Posicion:[datos.Posicion]
			}
			buscar_conductor(datos);
		})




		//Función Notificación Masiva 
		function replicar_posicion(datos){
			var Clientes_Notificar = database.runCommand({
			    $geoNear: "Clientes",
			    	near: { type: "Point", coordinates: [ datos.Posicion ] },
			    	spherical: true,
			    	maxDistance: 5000,
			    	query: { datos }
				});

	   		socket.broadcast.emit('serv_conductores_activos',{Clientes_Notificar,IdConductor:socket.decoded_token.Id,Posicion:datos.Posicion} );
		}


		function buscar_conductor(datos){
			var Clientes_Notificar = database.runCommand({
			    $geoNear : "Clientes",
			    near: { type: "Point", coordinates: [ datos.Posicion ] },
			    spherical: true,
			    maxDistance: 5000,
			    query: { datos }
	   		});

	   		socket.broadcast.emit('serv_conductores_activos',{Clientes_Notificar,IdConductor:socket.decoded_token.Id,Posicion:datos.Posicion} );
		}

	})
return module.exports;
};