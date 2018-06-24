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
let sharp                 = require('sharp');

const validateUser		  = require('../libs/validateuser');
const getAds              = require('../libs/getblobs');              

const categories          = require('../config/categories.json');

const picturesDirectory = __dirname + "/../pics/";

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
        
        console.log(`request query ${JSON.stringify(req.query.q)}`);
        
        Blob.find({$text: {$search: req.query.q}})
            .limit(+req.query.page_size)
            .skip(req.query.page * req.query.page_size)
            .sort([['date', '-1']])
            .exec(function (err, blobs){
                if(err) {
                    res.status(500).json({error: err});
                }
                res.status(200).json(getAds(blobs));
        }).catch(error => {
            new Error("An error ocurred");
            console.error(error);
        });
    });

//GET all blobs
router.get('/', function(req, res, next) {

    //skip: req.query.page * req.query.page_size, limit: req.query.page_size
    Blob.find({$or: [{category: req.query.category}, {}]})
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

        let largePhotoName = picturesDirectory + req.file.filename;
        let thumbnailPhotoName = picturesDirectory + "downscaled_" + req.file.filename;

        let extension = req.file.filename.split('.').pop();
        let normalPhotoName = [picturesDirectory, 'compressed_', req.file.filename].join('');

        let copyOriginalFileName = [picturesDirectory, 'original_', req.file.filename].join('');
        fs.createReadStream(largePhotoName).pipe(fs.createWriteStream(copyOriginalFileName));

        imagemin([largePhotoName], picturesDirectory, {
            plugins: [
                imageminJpegtran(),
                imageminPngquant({quality: '65-80'})
            ]
        })
        .then(file => {
            fs.rename(file[0].path, normalPhotoName, function(error){
                if(error) console.error(error);
            });
            sharp(normalPhotoName)
            .resize(300)
            .toFile(thumbnailPhotoName, function(err) {
                console.log(err);
                if(err) thumbnailPhotoName = "";
            });
        })
        .catch(error => console.error(error));

        Blob.create({
            price: req.body.price,
            adName: req.body.ad_name,
            description: req.body.description,
            photo: {
                large: copyOriginalFileName,
                normal: normalPhotoName,
                thumbnail: thumbnailPhotoName  
            },
            date: req.body.date,
            userId: req.user.userId,
            category: req.body.category,
            phoneNumber: req.body.number
        }, function (err, blob) {
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
            new Error("an error ocurred!");
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
            res.status(200).download(blob.photo.normal);
        }
	}).catch(err => {
        console.error(err);
        new Error("An error ocurred!");
    });
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
                        blob.photo.normal = "/static/photos/" + blob.photo.normal.split("/").pop();
                        blob.photo.large = "/static/photos/" + blob.photo.large.split("/").pop();
                        blob.photo.thumbnail = "/static/photos/" + blob.photo.thumbnail.split("/").pop();
                        res.status(200).json(blob);
                    }
                });
     	    }
        }).catch(error => {
            new Error("An error ocurred!");
            console.error(error);
        });
    });


//TODO: change put to post
//update a blob by ID
router.post('/:id/', upload.single('file'), function(req, res) {
    
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

        //remember blob photo large name
        let oldFileName = blob.photo.large;

        let largePhotoName = null;
        let normalPhotoName = null;
        let thumbnailPhotoName = null;
        let copyOriginalFileName = null;

        if(req.file) {
            largePhotoName = picturesDirectory + req.file.filename;
            copyOriginalFileName = [picturesDirectory, 'original_', req.file.filename].join('');
            thumbnailPhotoName = [picturesDirectory, 'downscaled_', req.file.filename].join('');
            normalPhotoName = [picturesDirectory, 'compressed_', req.file.filename].join('');
        }

        //copy original photo
        fs.createReadStream(largePhotoName).pipe(fs.createWriteStream(copyOriginalFileName));

        blob.price = req.body.price || blob.price;
        blob.adName =  req.body.ad_name || blob.adName;
        blob.description = req.body.description || blob.description;
        blob.photo.normal = copyOriginalFileName || blob.photo.normal;
        blob.photo.large = largePhotoName || blob.photo.large;
        blob.photo.thumbnail = thumbnailPhotoName || blob.photo.thumbnail;
        blob.date = req.body.date || Date.now();
        blob.category = req.body.category || blob.category;

        //update it
        blob.save(function (err, updatedBlob) {
            if (err) {
                res.status(500).json({error: err});
                return;
            }
            if(oldFileName !== updatedBlob.photo.large) {
                imagemin([largePhotoName], picturesDirectory, {
                    plugins: [
                        imageminJpegtran(),
                        imageminPngquant({quality: '65-80'})
                    ]
                })
                .then(file => {
                    fs.rename(file[0].path, normalPhotoName, function(error){
                        if(error) console.error(error);
                    });
                    sharp(normalPhotoName)
                    .resize(300)
                    .toFile(thumbnailPhotoName, function(err) {
                        console.log(err);
                        if(err) thumbnailPhotoName = "";
                    });
                })
                .catch(error => console.error(error));
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
router.delete('/:id/', function (req, res){
    //find blob by ID
    Blob.findById(req.id, function (err, blob) {
        if (err) {
            return new Error("An error ocurred!");
        }
        else if(req.user.userId != blob.userId) {
            res.status(403).json({error: "Incorrect token"});
            return;
        } 
        //remove it from Mongo
        blob.remove(function (err, blob) {
            if (err) {
                return new Error("An error ocurred");
            }      
            //Returning success messages saying it was deleted
            //fs.unlink(blob.photoFile, (err) => {
                //if (err) console.error(err);
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
    }).catch(new Error("An error ocurred!"));
});

module.exports = router;