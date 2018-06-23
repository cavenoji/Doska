'use strict'

let express 		= require('express');
let path 			= require('path');
let favicon 		= require('serve-favicon');
let logger 			= require('morgan');
let cookieParser 	= require('cookie-parser');
let bodyParser 		= require('body-parser');
let multer 			= require('multer');
let db				= require('./model/db')
let upload 			= multer({dest: __dirname + '/pics'});
let methodOverride  = require('method-override'); //used to manipulate POST

let index 			= require('./routes/index');
let users 			= require('./routes/users');
let routes 			= require('./routes/index');
let blobs 			= require('./routes/blobs');
let staticFiles		= require('./routes/static');
let categories 		= require('./routes/categories');

let app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(methodOverride(function(req, res){
		if (req.body && typeof req.body === 'object' && '_method' in req.body) {
			// look in urlencoded POST bodies and delete it
			let method = req.body._method;
			delete req.body._method;
			return method;
    	}
}));
app.use(logger('dev'));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/api/v1/users', users);
//app.use('/', routes);
app.use('/api/v1/blobs', blobs);
app.use('/api/v1/categories', categories);
app.use('/static/', staticFiles);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
	let err = new Error('Not Found');
  	err.status = 404;
  	next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  	res.locals.message = err.message;
  	res.locals.error = req.app.get('env') === 'development' ? err : {};

  	// render the error page
	console.log(err.status);
  	res.status(err.status || 500);
	//res.render('error');
	res.format({
		//HTML response will set the location and redirect back to the home page. You could also create a 'success' page if that's your thing
	  	html: function(){
			res.render('error');
	 	 },
	  	//JSON response will show the newly created blob
	  	json: function(){
		  	res.send({
			  	error: err
		  	});
	  	}
  	});
});

module.exports = app;
