'use strict'

let mongoose = require('mongoose');  

let blobSchema = new mongoose.Schema({ 
	price: { type: Number }, 
	adName: { type: String, required: true },
	phoneNumber: { type: String, required: true },
  	photoFile: { type: String, required: true },
  	description: { type: String, required: true },
	date: { type: Date, default: Date.now },
	userId: {type: String, required: true},
	//category: {type: String, required: true}
});

blobSchema.index({adName: 'text', description: 'text'});

module.exports = mongoose.model('Blob', blobSchema);