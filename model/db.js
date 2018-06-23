'use strict'

let mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/board_auth', {useMongoClient: true});