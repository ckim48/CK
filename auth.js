var express = require('express');
var passport = require('passport');
var router = express.Router();
var path = require('path');
var mongoose = require('mongoose');
var session = require('express-session');
var flash = require('connect-flash');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var app = express();
var LocalStrategy = require('passport-local').Strategy;

// require('./db/email-verification')(nev);


var colors = ["red", "orange", "yellow", "olive", "green", "teal", "blue", "violet", "purple", "pink", "brown"];

/*
 *  Login
 */
router.get('/login', function (req, res, next) {
    if (req.user) {
        res.redirect('/');
    } else {
        res.render('auth/login', {
            title: 'URKC Login', //web title
            message: req.flash('signinMessage'), //currently only used when there's a login fail
            color: colors[Math.round(Math.random() * colors.length)] //random button color for fun
        });
    }
});

router.post('/login', function (req, res, next) {
    // User input sanitization
    req.body.email = req.sanitize(req.body.email);
    req.body.password = req.sanitize(req.body.password);
    next(); 
}, passport.authenticate('local-signin', {

    failureRedirect: '/login',
    failureFlash: true
}), function(req,res){
    if (req.body.remember) {
        req.session.cookie.maxAge = 21 * 24 * 60 * 60 * 1000; // Cookie expires after 21 days
    } else {
        req.session.cookie.expires = false; // Cookie expires at end of session
    }
    res.redirect('/');
}
);

/*
 *  Log out
 */
router.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

/*
 *  Register
 */
router.get('/register', function (req, res, next) {
    res.render('auth/register', {
        title: 'URKC Registration', //web title
        message: req.flash('signupMessage'), //currently only used when there's a login fail
        color: colors[Math.round(Math.random() * colors.length)]
    });
});


router.post('/register', function (req, res, next) {
    // User input sanitization
    req.body.terms = req.sanitize(req.body.terms);
    req.body.email = req.sanitize(req.body.email);
    req.body.password = req.sanitize(req.body.password);
    req.body.passwordc = req.sanitize(req.body.passwordc);
    req.body.name = req.sanitize(req.body.name);
    req.body.phone = req.sanitize(req.body.phone);
    req.body.classc = req.sanitize(req.body.classc);
    req.body.graduated = req.sanitize(req.body.graduated);
    req.body.major = req.sanitize(req.body.major);
    req.body.minor = req.sanitize(req.body.minor);
    req.body.linkedin = req.sanitize(req.body.linkedin);
    req.body.bio = req.sanitize(req.body.bio);
    next(); 
}, passport.authenticate('local-signup', {
    successRedirect: '/email',
    failureRedirect: '/register',
    failureFlash: true
}));

router.get('/email-verification/:URL', function(req,res){
    var nev = req.app.get('nev');
    var url = req.params.URL;
    nev.confirmTempUser(url,function(err,user){
        if(err)
        {
            console.log('error1');
            return err;
        }
        if(user)
        {
            nev.sendConfirmationEmail(user.email,function(err,info){
                if(err)
                {
                    console.log('error1');
                    return err;
                }
                res.redirect('/verified');
            })
        }
        else
            return err;
    })
})

router.get('/email', function (req, res, next) {
    res.render('email', {
        title: 'Email verification',
        user: req.user
    });
});
router.get('/verified', function (req, res, next) {
    res.render('verified', {
        title: 'Congratulation!',
        user: req.user
    });
});


//router.post('/register', function (req, res, next) {
//    console.log(req.url);
//    passport.authenticate('local-signup', function (err, user, info) {
//        console.log("register - in _begin");
//        console.log(err);
//        console.log(user);
//        console.log(info);
//        console.log(req.body);
//        res.send(JSON.stringify(info)).status(200)
//    })(req, res, next);
//});
module.exports = router;





//
//router.get('/registertest', function (req, res, next) {
//    res.render('auth/registertest', {
//        title: 'URKC Registration', //web title
//        message: req.flash('signupMessage'), //currently only used when there's a login fail
//        color: colors[Math.round(Math.random() * colors.length)]
//    });
//});
//
//router.post('/registertest', passport.authenticate('local-register', {
//    successRedirect: '/login',
//    failureRedirect: '/registertest',
//    failureFlash: true
//}));
//
