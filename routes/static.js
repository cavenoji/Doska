'use strict'

let express = require('express');
let router = express.Router();
let fs = require('fs');
let validateFile = require('../libs/validatefile');

const adsFilesPath = [__dirname, '..', 'pics', ''].join('/');
const categoriesThumbnailsPath = [__dirname, '..', 'config', 'categories', ''].join('/');


router
    .param('name', function(req, res, next, name){
        name = adsFilesPath + name;
        validateFile(req, res, next, name);
    })
    .param('thumbnail', function(req, res, next, thumbnail){
        thumbnail = categoriesThumbnailsPath + thumbnail;
        validateFile(req, res, next, thumbnail);
    });

router
    .get('/photos/:name', function(req, res, next){
        res.status(200).download(req.name);
    });
router
    .get('/photos/categories/:thumbnail', function(req, res, next){
        res.status(200).download(req.name);
    });


module.exports = router;