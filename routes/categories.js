'use strict'

let express = require('express');
let router = express.Router();

const categories = require('../config/categories.json');

router
    .get('/', function(req, res){
        res.status(200).json(categories);
    });

module.exports = router;