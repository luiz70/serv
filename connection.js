/**
 * mysql.js Configuration
 */

'use strict';
//dependencias
var config = require('./config');
var pool      = require('./pool');

	module.exports = {
		query:function(query,funcion){
			pool.getConnection(function(err, conn) {
				if(err) {
					console.log(err);
					funcion(true,null,null);
				}else{
				conn.query(query,function(item1,item2,item3){
					conn.release();
					funcion(item1,item2,item3);
				});
				}
			})
		},
		end:function(){
			console.log("end");
		}
	}





