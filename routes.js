'use strict';

var http = require('http');
var config = require('./config/config');
var generador = require('./config/generador');
var connection = require('./config/connection');
var mail = require('./config/mail');
var jwt = require('jsonwebtoken');
//var md5 = require('md5');
var sha1 = require('sha1');
var fs = require('fs');

module.exports = function(app) {
	var httpsserver = http.createServer(app);
	httpsserver.listen(config.http.port);
	require('./socket')(app, httpsserver);
	
	app.post('/login', function(req, res) {
		var data = req.body;
		console.log(data);

		connection.query("SELECT Id, Correo, Nombre, ApellidoPaterno, ApellidoMaterno, Codigo, TokenSeguridad FROM USUARIOS WHERE Correo='" + data.Usuario + "' AND BINARY Acceso='"+ sha1(data.Contrasena) + "'", 
		
		function(err, rows, fields) {
			if (err) {
				res.send({error:true, code: "540"}); // error en la conexion
			} else {
				if (rows.length==0) {
					res.send({error:true, code: "541"}); // Usuario no existe o incorrecto
				} else {
					var time = (new Date()).getTime();
					rows[0]["Token"] = jwt.sign({Id: rows[0].Id,Tipo:1, Usuario: rows[0].Correo, Log:time}, rows[0].TokenSeguridad, {noTimestamp:true});
					rows[0]["Log"] = time;
					delete rows[0].TokenSeguridad;
					res.send(rows[0]);
					//almacenar log
					//connection.query("INSERT INTO CLIENTES_LOG(ID_CLIENTE) VALUES("+rows[0].Id+")", function(err2, result) {})
				}
			}
		})
	});

	app.post('/loginconductor', function(req, res) {
		var data = req.body;
		console.log(data);

		connection.query("SELECT Id, Correo, Nombre, ApellidoPaterno, ApellidoMaterno, Codigo, TokenSeguridad, IdSocio, Status FROM CONDUCTOR INNER JOIN USUARIOS ON CONDUCTOR.IdConductor=USUARIOS.Id WHERE USUARIOS.Correo='" + data.Usuario + "' AND BINARY USUARIOS.Acceso='" + sha1(data.Contrasena) + "'", 
		
		function(err, rows, fields) {
			if (err) {
				res.send({error:true, code: "540"}); // error en la conexion
			} else {
				if (rows.length==0) {
					res.send({error:true, code: "541"}); // Usuario no existe o incorrecto
				} else {
					if (rows[0].Status == 'Activo') {
						var time = (new Date()).getTime();
						rows[0]["Token"] = jwt.sign({Id: rows[0].Id, Tipo:2 , Usuario: rows[0].Correo, Log:time}, rows[0].TokenSeguridad, {noTimestamp:true});
						rows[0]["Log"] = time;
						delete rows[0].TokenSeguridad;
						res.send(rows[0]);
						//almacenar log
						//connection.query("INSERT INTO CLIENTES_LOG(ID_CLIENTE) VALUES("+rows[0].Id+")", function(err2, result) {})
					} else {
						res.send({error:true, code: "543"}); // No es un conductor activo
					}
				}
			}
		})
	});

	
app.post('/registro', function(req,res){
	//console.log(req.body);	
  
  connection.query("SELECT Correo FROM USUARIOS WHERE Correo='"+req.body.Correo+"' or Telefono='"+req.body.Telefono+"'", function(err, rows, fields) {
	if (err) {
			res.send({error:true, message: "error en conexion"});
			console.log(err);
	} else {
		if (rows.length == 0) {
			connection.query("SELECT Correo FROM PREREGISTRO WHERE Correo='"+req.body.Correo+"' or Telefono='"+req.body.Telefono+"'", function(err, rows, fields) {
				if (rows.length == 0) {

var Codigo=generador.codigoSMS();
connection.query("INSERT INTO PREREGISTRO (`Correo`, `Acceso`, `Nombre`, `ApellidoPaterno`, `Telefono`, `Lada`, `Codigo`) VALUES ('"+req.body.Correo+"','"+sha1(req.body.Acceso)+"','"+req.body.Nombre+"','"+req.body.Apellido+"','"+req.body.Telefono+"','"+req.body.Lada+"','"+Codigo+"')", function(err, rows, fields) {
							if(err){
								console.log(err);
							}else{
								console.log('PRE REGISTRANDO');
								res.send({"RESP":"OK"});
								
							}
						})
	
					}else{
						if(rows[0].Correo==req.body.Correo && rows[0].Telefono==req.body.Telefono){
								console.log('PRE REGISTRADO');
							res.send({"RESP":"OK"});
						}else{
							if(rows[0].Correo==req.body.Correo){
								console.log('YA ESTA EL CORREO');
								res.send({"REP":"NO","OBJ":"CORREO","ORIGEN":"PRE"});
							}
							if(rows[0].Telefono==req.body.Telefono){
								console.log('YA ESTA EL TELEFONO');
								res.send({"REP":"NO","OBJ":"TELEFONO","ORIGEN":"PRE"});
							}
						}
					}
				});
		} else {
				console.log('YA ESTA EN REGISTRO');
				res.send({"RESP":"EN USO"});
			}
		}
	});
});


app.post('/validar', function(req, res){
console.log(req.body);	
  
connection.query("SELECT * FROM PREREGISTRO WHERE Correo='"+req.body.Correo+"' and Telefono='"+req.body.Telefono+"' and Codigo='"+req.body.CodigoSMS+"'", function(err, rows, fields) {
	if (err) {
			res.send({error:true, message: "error en conexion"});
			console.log(err);
	} else {
		if (rows.length == 0) {
				console.log('CODIGO NO VALIDO');
				res.send({"RESP":"CODIGO INVALIDO"});
			} else {

				var Token=generador.TokenSeguridad();
				var Codigo=generador.CodigoCompartir();
				var Rs=rows[0];
				
				console.log(Rs);
				
				connection.query("INSERT INTO USUARIOS (`Correo`, `Acceso`, `Nombre`, `ApellidoPaterno`, `Telefono`, `TokenSeguridad`, `Lada`, `Codigo`) VALUES ('"+Rs.Correo+"','"+Rs.Acceso+"','"+Rs.Nombre+"','"+Rs.ApellidoPaterno+"','"+Rs.Telefono+"','"+Token+"','"+Rs.Lada+"','"+Codigo+"')", function(err, rows, fields){
					connection.query("SELECT * FROM USUARIOS WHERE Correo='"+Rs.Correo+"'", function(err, rows, fields){
					var Rs=rows[0];
						connection.query("INSERT INTO CLIENTES (`Id`) VALUES ("+Rs.Id+")", function(err, rows, fields){
							connection.query("DELETE FROM `PREREGISTRO`  WHERE Correo='"+req.body.Correo+"'", function(err, rows, fields) {
								console.log('CODIGO CORRECTO');
								res.send({"RESP":"CODIGO VALIDO"});
							})
						})
					})
				})
			}
		}
	});
});



app.post('/activacionmodo', function(req,res){
	//console.log(req.body);	
	if(req.body.Opc==1){//Socio y Conductor 
		connection.query("INSERT INTO SOCIO (IdSocio,Status)VALUES("+req.body.Id+",'POR ACTIVAR')", function(err, rows, fields) {
		console.log(err);
			connection.query("INSERT INTO CONDUCTOR (IdConductor,Status)VALUES("+req.body.Id+",'POR ACTIVAR')", function(err, rows, fields) {
				console.log(err);
				res.send({"RESP":"REGISTRO COMPLETO"});
				console.log(req.body.Id+" Socio y Conductor");
			})
		})
		
	}
	if(req.body.Opc==2){//Socio 
		connection.query("INSERT INTO SOCIOS (IdSocio,Status)VALUES("+req.body.Id+",'POR ACTIVAR')", function(err, rows, fields) {				
			res.send({"RESP":"REGISTRO COMPLETO"});
			console.log(req.body.Id+" Socio y Conductor");
		})
	}
	if(req.body.Opc==3){//Conductor 
		connection.query("INSERT INTO CONDUCTOR (IdConductor,Status)VALUES("+req.body.Id+",'POR ACTIVAR')", function(err, rows, fields) {
			res.send({"RESP":"REGISTRO COMPLETO"});
			console.log(req.body.Id+" Conductor");
		})
	}
});



app.post('/registroconductor', function(req,res){
	//console.log(req.body);	
  
  connection.query("SELECT Correo FROM USUARIOS WHERE Correo='"+req.body.Correo+"' or Telefono='"+req.body.Telefono+"'", function(err, rows, fields) {
	if (err) {
			res.send({error:true, message: "error en conexion"});
			console.log(err);
	} else {
		if (rows.length == 0) {
			connection.query("SELECT Correo FROM PREREGISTRO WHERE Correo='"+req.body.Correo+"' or Telefono='"+req.body.Telefono+"'", function(err, rows, fields) {
				if (rows.length == 0) {

				var Token=generador.TokenSeguridad();
				var Codigo=generador.CodigoCompartir();
				connection.query("INSERT INTO USUARIOS (`Correo`, `Acceso`, `Nombre`, `ApellidoPaterno`, `Telefono`, `TokenSeguridad` , `Lada`, `Codigo`) VALUES ('"+req.body.Correo+"','"+sha1(req.body.Acceso)+"','"+req.body.Nombre+"','"+req.body.Apellido+"','"+req.body.Telefono+"','"+Token+"','"+req.body.Lada+"','"+Codigo+"')", function(err, rows, fields) {
					connection.query("SELECT * FROM USUARIOS WHERE Correo='"+req.body.Correo+"'", function(err, rows, fields){
								if(err){
									console.log(err);
								}else{
									console.log('REGISTRADO '+rows[0].Id);
									res.send({"RESP":"OK","ID":rows[0].Id});
								}
							})
						})
	
					}else{
						res.send({"RESP":"NO"});
							}
						})
				} else {
					console.log('YA ESTA EN REGISTRO');
					res.send({"RESP":"EN USO"});
			}
		}
	});
});
return module.exports;
}; 

console.log("Servidor Iniciado");
