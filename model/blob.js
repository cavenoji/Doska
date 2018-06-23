'use strict'

let mongoose = require('mongoose'); 
let ObjectId = mongoose.Schema.ObjectId;  
let categories = require('../config/categories.json'); 
console.log(categories);

let blobSchema = new mongoose.Schema({ 
	price: { type: Number }, 
	adName: { type: String, required: true },
  	photo: { 
		large: String,
		normal: String,
		thumbnail: String
	},
  	description: { type: String, required: true },
	date: { type: Date, default: Date.now },
	userId: {type: ObjectId, required: true},
	category: {type: String, enum: categories, required: true},
	phoneNumber: {type: String, required: true}
});

blobSchema.index({adName: 'text', description: 'text'});

module.exports = mongoose.model('Blob', blobSchema);