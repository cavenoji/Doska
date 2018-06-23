'use strict'

let express               = require('express');
let router                = express.Router();
let mongoose              = require('mongoose'); //mongo connection
let bodyParser            = require('body-parser'); //parses information from POST
let methodOverride        = require('method-override'); //used to manipulate POST
let promise               = require('bluebird');
let fs                    = require('fs');
let multer                = require('multer');
let imagemin              = require('imagemin');
let imageminJpegtran      = require('imagemin-jpegtran');
let imageminPngquant      = require('imagemin-pngquant');
let Blob                  = require('../model/blob');
let User 				  = require('../model/user');

const validateJwt 		  = require('express-jwt');
const validateUser		  = require('../libs/validateuser');
const getReqResponse      = require('../libs/getblobs');

const jwt 				  = require('jsonwebtoken');
const secret 			  = "secret";
const bcrypt              = require('bcrypt-nodejs');

const phoneRegex 		  = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;

router.use(methodOverride(function(req, res){
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        // look in urlencoded POST bodies and delete it
        let method = req.body._method;
        delete req.body._method;
        return method;
    }
}));

router.param('userId', validateUser);

const registrationRequiredFields = (name, email, password) => {
    if(Array.prototype.every.call(arguments, x => !!x)) return true;
    return false;
}

function registerUser(req, res, next){
	if(!registrationRequiredFields(req.body.name, req.body.email, req.body.password)){
		res.status(422).json({error: "Incorrect data for registration"});
	}	  
  	bcrypt.hash(req.body.password, null, null, function(err, hash) {
		if (err) {
			return;
		}
		
		let user = new User({
			name: req.body.name,
			email: req.body.email,
			password: hash,
		});
		
		user.save(function (err) {
			if (err) { 
				//console.log(err);
				res.status(422).json({error: "There is user with this email"});
				return;
			}
			let data = {
				userId: user._id
			};
			res.status(200).json({token: jwt.sign(data, secret)});
		});
  	});
};

function loginUser(req, res, next){
	User.findOne({email: req.body.email}, function(err, user){

	  	if(err || !user){
			res.status(422).json({err : "Wrong email or password"});
			return;
		}
		else{
			bcrypt.compare(req.body.password, user.password, function(err, ok) {
				if (err || !ok) {
					res.status(422).json({err : "Wrong email or password"});
					return;
				}
				res.status(200);
				let data = {
					userId: user._id
				};
				res.json({token: jwt.sign(data, secret)});
			});
	  	}
	});
};

function getUserById(req, res){
	User.findOne({_id: req.userId}, function(err, user){
		if(err) {
			console.log(user);
			console.error(err);
			return res.status(404).json({error: err});
			//return;
		}
		//console.log(user);
		res.status(200).json({_id: user._id, email: user.email, name: user.name});
	});
}

function getBlobsByUserId(req, res){
	Blob.find({userId: req.userId}).sort([['date', '-1']]).exec(function (err, blobs) {
        if (err) {
			console.error(err);
            return res.status(404).json({error: err});
        } 
        else {
            //respond to both HTML and JSON. JSON responses require 'Accept: application/json;' in the Request Header
            res.format({
                //HTML response will render the index.jade file in the views/blobs folder. We are also setting "blobs" to be an accessible variable in our jade view
                html: () => {
                    res.render('blobs/index', {
                        title: 'All my Blobs',
                        "blobs" : blobs
                    });
                },
                //JSON response will show all blobs in JSON format
                json: () => {
                	getReqResponse(res, blobs);
                }
            });
        }     
    }).catch(console.err);
}

router
	.post('/login', loginUser)
	.post('/register', registerUser)
	.use(validateJwt({secret : secret}))
	.get('/:userId', getUserById)
	.get('/:userId/blobs', getBlobsByUserId);

module.exports = router;
