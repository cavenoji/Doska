'use strict'

let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;  

let User = mongoose.model('User', new mongoose.Schema({
    id: ObjectId,
    name: String,
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: String,
  })
);

module.exports = User;