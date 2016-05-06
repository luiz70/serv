/**
 * mysql.js Configuration
 */

'use strict';
//dependencias

module.exports={
	generate: function(length){
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		for( var i=0; i < length; i++ )
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		return text;
	}
}