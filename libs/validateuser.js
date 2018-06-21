'use strict'

const User = require('../model/user');

module.exports = function(req, res, next, userId) {
    //console.log('validating ' + id + ' exists');
    //find the ID in the Database
    User.findById(userId, function (err, user) {
        //if it isn't found, we are going to respond with 404
        if (!!!user) {
            console.log(userId + ' was not found');
            res.status(404)
            let err = new Error('Not Found');
            err.status = 404;
            res.format({
                html: function(){
                    next(err);
                },
                json: function(){
                    res.status(err.status).json({error: `${err}`});
                }
            });
        //if it is found we continue on
        } 
        else {
            //uncomment this next line if you want to see every JSON document response for every GET/PUT/DELETE call
            console.log(userId);
            // once validation is done save the new item in the req
            req.userId = userId;
            // go to the next thing
            next(); 
        }
    }).catch(console.error);
}