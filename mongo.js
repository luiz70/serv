/**
 * Mongo.js Configuration
 */

'use strict';
//dependencias
var config = require('./config');
var mongoose = require('mongoose');

mongoose.connect(config.mongoDB.uri, config.mongoDB.options);
mongoose.connection.on('error', function(err) {
	console.log('MongoDB connection error: ' + err);
});
mongoose.connection.on('open', function() {
mongoose.connection.db.dropDatabase();
});

var usuarioSchema = new mongoose.Schema({
	Id: {type:Number, unique: true },
	Usuario:String,
	Log:Number
	},{autoIndex:true});
	mongoose.connection.model("Usuario", usuarioSchema);

var conductorSchema = new mongoose.Schema({
	Id: {type:Number, unique: true },
	Posicion:Object,
	IdVehiculo:Number,
	IdCategoria:Number,
	Status:Number
	},{autoIndex:true});
	mongoose.connection.model("Conductor", conductorSchema);

var clienteSchema = new mongoose.Schema({
	Id: {type:Number, unique: true },
	Posicion:Object,
	IdCategoria:Number,
	Status:Number,
	StatusCancelacion:Number
	},{autoIndex:true});
	mongoose.connection.model("Cliente", clienteSchema);


module.exports={
	'getModel':function(model){
		return mongoose.connection.model(model);
	}
}