var express = require('express');
var path = require('path');
var passport = require('passport');
var mongoose = require('mongoose');
var session = require('express-session');
var flash = require('connect-flash');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var app = express();
var router = express.Router();


/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {
        title: 'URKC Index',
        user: req.user
    });

});

router.get('/about', function (req, res, next) {
    res.render('about', {
        title: 'About URKC',
        user: req.user
    });
});

router.get('/intro', function (req, res, next) {
    res.render('intro', {
        title: 'About Eboard/Developers',
        user: req.user
    });
});


module.exports = router;
