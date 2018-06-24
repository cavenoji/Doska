'use strict'

let express = require('express');
let router = express.Router();
let fs = require('fs');
const filesPath = '/home/cavenoj/doska-v2-auth/pics/';

router
    .param('name', function(req, res, next, name){
        fs.stat(filesPath + name, (err, stats) => {
            if (err) {
                console.error(`Photo ${name} was not found`);
                res.status(404)
                let err = new Error('Not Found');
                err.status = 404;
                res.format({
                    html: function(){
                        next(err);
                    },
                    json: function(){
                        res.status(err.status).json({message : ' ' + err});
                    }
                });
            //if it is found we continue on
            } 
            else {
                //uncomment this next line if you want to see every JSON document response for every GET/PUT/DELETE call
                console.log(`Photo ${name} was found`);
                // once validation is done save the new item in the req
                req.name = filesPath + name;
                // go to the next thing
                next(); 
            }
        })
    });

router
    .get('/photos/:name', function(req, res, next){
        res.status(200).download(req.name);
    });


module.exports = router;