'use strict'

let fs = require('fs');

module.exports = function(req, res, next, file){
    fs.stat(file, (err, stats) => {
        if (err) {
            console.error(`Photo ${file} was not found`);
            res.status(404).json({error: "Not Found"});
        } 
        else {
            //uncomment this next line if you want to see every JSON document response for every GET/PUT/DELETE call
            console.log(`Photo ${file} was found`);
            // once validation is done save the new item in the req
            req.name = file;
            // go to the next thing
            next(); 
        }
    })
}