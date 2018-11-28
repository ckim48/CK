var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var passport = require('passport');
var path = require('path');
var mongoose = require('mongoose');
var session = require('express-session');
var flash = require('connect-flash');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var LocalStrategy = require('passport-local').Strategy;
// Compression
var compression = require('compression')
    // User input sanitization
var expressSanitizer = require('express-sanitizer');
//email verification
var nev = require('email-verification')(mongoose);
require('./routes/db/email-verification')(nev);
// Routers
var router = express.Router();
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRouter = require('./routes/auth');
var adminRouter = require('./routes/admin');
var profileRouter = require('./routes/profile');
var boardRouter = require('./routes/board/board');
var imagesRouter = require('./routes/image-server');
var rateRouter = require('./routes/rate');
// var nev = require('email-verification')(mongoose);
// require('./routes/db/email-verification')(nev);
//Functions related to auth
//set db
var app = express();
app.locals.moment = require('moment');
app.set('nev', nev);
// compression
app.use(compression());
app.set('trust proxy', true);
if (app.get('env') === 'production') {
    app.use(logger('combined'));
} else {
    app.use(logger('dev'));
}
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
    , limit: '16mb' // allow up to 16mb body size for image upload
}));
// User input sanitization
app.use(expressSanitizer());
// Get Database Ready
require('./routes/db/passport')(passport);
// Mongoose connection
mongoose.connect('mongodb://localhost:27017/urkc', {
    useNewUrlParser: true
});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log('Hello mongoDB');
});
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
/* Passport */
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
require('./routes/db/passport')(passport, nev);
app.use(logger('dev'));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/', authRouter);
app.use('/admin', adminRouter);
app.use('/profile', profileRouter);
app.use('/board', boardRouter);
app.use('/image-server', imagesRouter);
app.use('/rate', rateRouter);
// app.use('/post', postRouter);
// app.use('/poster', posterRouter);
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

console.log("App is using " + app.get('env'));

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    // render the error page
    res.status(err.status || 500);
    res.render('error');
});
module.exports = app;