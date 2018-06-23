'use strict'

let express               = require('express');
let router                = express.Router();
let mongoose              = require('mongoose'); //mongo connection
let bodyParser            = require('body-parser'); //parses information from POST
let promise               = require('bluebird');
let fs                    = require('fs');
let multer                = require('multer');
let imagemin              = require('imagemin');
let imageminJpegtran      = require('imagemin-jpegtran');
let imageminPngquant      = require('imagemin-pngquant');
let Blob                  = require('../model/blob');
let validateJwt           = require('express-jwt');
let User                  = require('../model/user');
//let sharp                 = require('sharp');

const validateUser		  = require('../libs/validateuser');
const getAds              = require('../libs/getblobs');              

const categories          = require('../config/categories.json');

mongoose.Promise = promise;     

const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;

let storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname + '/../pics');
    },
    filename: function (req, file, cb) {
        cb(null, [new Date().getTime().toString(), ".", file.mimetype.split("/")[1]].join(''));
  	}
});

let upload = multer({ 
    fileFilter: function(req, file, cb) {
        if(!file.mimetype.startsWith("image")){
            return cb(new Error("Only images are allowed"));
        }
        cb(null, true);
    }, 
    storage: storage, 
    limits: { fileSize : '50mb'}
});

router.use(bodyParser.urlencoded({ extended: true }));

//fields checking
const requiredFieldsValidator = (file, phoneNumber, description, adName, price, userId) => {
    if(Array.prototype.every.call(arguments, x => !!x )) return true;
    return false;
}

const categoryValidator = (category) => categories.includes(category);

//SEARCH
router.route('/search')
    .get(function(req, res){
        
        let query = "";
        
        for(const key in req.query){
            if(key == "num") break;
            query += req.query[key];
        }
        
        console.log(`request query ${JSON.stringify(query)}`);
        
        let num = parseInt(req.query.num);
        if(!!req.query.num === false) {
            num = 5;
        }
        console.log(`number of posts ${num}`);
        
        Blob.find({$text: {$search: query}})
            .limit(num)
            .sort([['date', '-1']])
            .exec(function (err, blobs){
                if(err) {
                    res.status(500).json({error: err});
                }
                getAds(res, blobs);
        }).catch(console.error);
    });

//GET all blobs
router.get('/', function(req, res, next) {
    console.log(req.query);

    //skip: req.query.page * req.query.page_size, limit: req.query.page_size
    Blob.find({})
        .limit(+req.query.page_size)
        .skip(req.query.page * req.query.page_size)
        .sort([['date', '-1']])
        .exec(function (err, blobs) {
            if (err) {
                return console.error(err);
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
                        res.status(200).json(getAds(blobs));
                    }
                });
            }     
    }).catch(error => new Error(error));
});

//GET Blobs by category
router.use(validateJwt({secret: "secret"}));

//TODO change post to put
//create a new blob
router.put('/', upload.single('file'), function(req, res) {

        console.log(upload);

        console.log("Body" + req.body);
        console.log("User" + req.user);

        if(!requiredFieldsValidator(req.body.number, req.body.description, req.body.ad_name, 
            req.body.price, req.user.userId) || !categoryValidator(req.body.category)) {
            res.status(400).send({error: "400"});
            return;
        }
        
        let regEx = new RegExp(phoneRegex);
		if(!regEx.test(req.body.number)){
			res.status(500).send({error: "incorrect phone number"});
			return;
		}
        
        let largePhotoName = __dirname + "/../pics/" + req.file.filename;
        let compressedPhotosDirectory = largePhotoName.substring(0, largePhotoName.lastIndexOf('/')) + "/compressed/";
        let downscaledPhotNamesDirectory = largePhotoName.substring(0, largePhotoName.lastIndexOf('/')) 
            + "/downScaled" + largePhotoName;

        /*imagemin([largePhotoName], compressedPhotosDirectory, {
            plugins: [
                imageminJpegtran(),
                imageminPngquant({quality: '65-80'})
            ]
        });*/

        /*sharp(largePhotoName)
            .resize(300)
            .toFile(downscaledPhotosDirectory, function(err) {
                downscaledPhotosDirectory = "";
            });*/
    
        console.log(compressedPhotosDirectory + req.file.filename);

        Blob.create({
            price: req.body.price,
            adName: req.body.ad_name,
            description: req.body.description,
            photo: {
                large: largePhotoName,
                normal: compressedPhotosDirectory + req.file.filename,
                thumbnail: downscaledPhotoName   
            },
            date: req.body.date,
            userId: req.user.userId,
            category: req.body.category,
            phoneNumber: req.body.number
        }, function (err, blob) {
            console.error(blob);
            if (err) {
                console.log("Err" + err);
                console.log("Blob" + blob);
                res.status(500).send({error: "There was a problem adding the information to the database."});
                return;
            } 
                //Blob has been created
            console.log('PUT creating new blob: ' + blob);
            res.format({
                //HTML response will set the location and redirect back to the home page. You could also create a 'success' page if that's your thing
                html: function(){
                    // If it worked, set the header so the address bar doesn't still say /adduser
                    res.location("blobs");
                    // And forward to success page
                    res.redirect("/api/v1/blobs");
                },
                        //JSON response will show the newly created blob
                json: function(){
                    res.status(201).send({
                        id: blob._id
                    });
                }
            });
        }).catch(error => {
            //new Error("an error ocurred!");
            console.log("Error" + error);
        });
});

/* GET New Blob page. */
router.get('/new', function(req, res) {
    res.render('blobs/new', { title: 'Add New Blob' });
});

//route middleware to validate :id
router.param('id', function(req, res, next, id) {
    //console.log('validating ' + id + ' exists');
    //find the ID in the Database
    Blob.findById(id, function (err, blob) {
        //if it isn't found, we are going to respond with 404
        if (!!!blob) {
            console.log(id + ' was not found');
            res.status(404)
            let err = new Error('Not Found');
            err.status = 404;
            res.format({
                html: function(){
                    next(err);
                },
                json: function(){
                    res.status(err.status).json({error: err});
                }
            });
        //if it is found we continue on
        } 
        else {
            //uncomment this next line if you want to see every JSON document response for every GET/PUT/DELETE call
            console.log(blob);
            // once validation is done save the new item in the req
            req.id = id;
            // go to the next thing
            next(); 
        }
    }).catch(console.error);
});

router.get('/:id/photo', function (req, res){
	Blob.findById(req.id, function (err, blob){
        if (err) {
            res.status(403).json({error: err});
        }
		else {
            res.status(200).download(blob.photoFile);
        }
	}).catch(err => new Error(err));
});

router.route('/:id')
    .get(function(req, res) {
    	Blob.findById(req.id, function (err, blob) {
      		if (err) {
       			console.log('GET Error: There was a problem retrieving: ' + err);
      		} 
      		else {
                console.log('GET Retrieving ID: ' + blob._id);
                let blobdate = blob.date.toISOString();
                blobdate = blobdate.substring(0, blobdate.indexOf('T'));
                res.format({
                    html: function(){
                        res.render('blobs/show', {
                            "blobdate" : blobdate,
                            "blob" : blob
                        });
                    },
                    json: function(){
                        blob.photoFile = "/static/photos/" + blob.photoFile.split("/").pop();
                        res.status(200).json(blob);
                    }
                });
     	    }
        }).catch(error => new Error(error));
});


//TODO: change put to post
//update a blob by ID
router.post('/:id/edit', upload.single('file'), function(req, res) {
    
    if(Object.getOwnPropertyNames(req.body).length === 0 || !!!req.file){
        res.status(304).send({message: "Nothing to modify"});
        return;
    }

    Blob.findById(req.id, function (err, blob) {

        console.error(err);

        console.log(req.user.userId + " " + blob.userId);

        if(!!err || req.user.userId != blob.userId){
            res.status(403).json({error: "Incorrect token"});
            return;
        }

        let photoName = null;

        if(req.file) photoName = __dirname + "/../pics/" + req.file.filename;

        let oldFileName = blob.photoFile;

        blob.price = req.body.price || blob.price;
        blob.adName =  req.body.ad_name || blob.adName;
        blob.description = req.body.description || blob.description;
        blob.photoFile = photoName || blob.photoFile;
        blob.date = req.body.date || Date.now();
        blob.category = req.body.category || blob.category;

        //update it
        blob.save(function (err, updatedBlob) {
            if (err) {
                res.status(500).json({error: err});
            }
            else {
                if(blob.photoFile !== updatedBlob.photoFile){
                    imagemin([photoName], photoName.substring(0, photoName.lastIndexOf('/')), {
                        plugins: [
                            imageminJpegtran(),
                            imageminPngquant({quality: '65-80'})
                        ]
                    });
                }
                res.format({
                    html: function(){
                        res.redirect("/api/v1/blobs/" + blob._id);
                    },
                    //JSON responds showing the updated values
                    json: function(){
                        res.status(200).json({message: "Post edited successfully!"});
                    }
                });
            }
        }).catch(error => {
            console.error(error);
            new Error(error)
        });
    }).catch(error => {
        console.error(error);
        new Error(error)
    });
});


//DELETE a Blob by ID
router.delete('/:id/delete', function (req, res){
    //find blob by ID
    Blob.findById(req.id, function (err, blob) {
        if (err) {
            return new Error("An error ocurred!");
        }
        else if(req.user.userId !== blob.userId) {
            res.status(403).json({error: "Incorrect token"});
            return;
        } 
        //remove it from Mongo
        blob.remove(function (err, blob) {
            if (err) {
                return new Error("An error ocurred");
            }      
            //Returning success messages saying it was deleted
            fs.unlink(blob.photoFile, (err) => {
                if (err) throw err;
                console.log('deleted ' + blob.photoFile);
                console.log('DELETE removing ID: ' + blob._id);
                res.format({
                    //HTML returns us back to the main page, or you can create a success page
                    html: function(){
                        res.redirect("/api/v1/blobs");
                    },
                    //JSON returns the item with the message that is has been deleted
                    json: function(){
                        res.status(200).json({message: "Post successfully deleted"});
                    }
                    });
                });
        });
    }).catch(new Error("An error ocurred!"));
});

module.exports = router;