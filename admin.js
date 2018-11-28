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
var User = require('./db/ModelUser');
require('./db/passport')(passport);
var isAuthenticated = require('./check_auth');
/*
 *  Admin Console
 */
var entries_per_page = 50;
router.get('/users', isAuthenticated, function (req, res, next) {
    var page = req.sanitize(req.query.page);
    var level = req.user.level;
    if (level < 90) {
        res.redirect('/');
    }
    User.find({}, function (err, users) {
        if (err) {
            console.log(err);
        }
        // level<2 can't access admin page.
        // else if(level<2)
        // {
        //     res.send(404);
        // }
        else {
            var entry_start = 0,
                entry_end = entries_per_page;
            if (typeof page != 'undefiend' && page) {
                entry_start = page * entries_per_page;
                //watch out for array max
                //console.log(entry_start + "@");
                if (entry_start >= users.length) {
                    entry_start = 0;
                    //console.log(entry_start);
                } else {
                    if (entry_start + entries_per_page < users.length) {
                        entry_end = entry_start + entries_per_page
                    } else {
                        entry_end = users.length;
                    }
                }
            }
            //console.log(entry_start + " " + entry_end);
            var numOfPages = Math.ceil(users.length / entries_per_page) - 1;
            var currentPage = Math.floor((entry_end - 1) / entries_per_page);
            var numTotalUser = users.length;
            //console.log(entry_start + " " + entry_end + " " + " " + users.length + " " +  (entry_end/users.length));
            users = users.slice(entry_start, entry_end);
            console.log(currentPage + "/" + numOfPages);
            res.render('admin/users', {
                title: 'URKC Admin', //web title
                message: req.flash('errorMessage'), //currently only used when there's a login fail
                users: users,
                numOfPages: numOfPages,
                currentPage: currentPage,
                numTotalUser: numTotalUser,
                user: req.user
            });
        }
    }).sort({
        registration: -1
    });
});
router.post('/promote', isAuthenticated, function (req, res, next) {
    if (req.user.level < 90) {
        res.redirect('/');
    }
    var id = req.sanitize(req.body.userid);
    console.log('PROMOTEDSSS')
    var newLevel = 91;
    next();
}, function (req, res, next) {
    User.findOneAndUpdate({
        _id: id
    }, {
        $set: {
            level: newLevel
        }
    }, function (err, user) {
        if (err) {
            res.send("err");
        }
        res.send("success");
    });

});


// router.get('/users', function (req, res, next) {
//This is for sample users
// for (var i = 0; i < 5; i++) {
// const newUser = new User();
// User.find({}, 'name', function(err, users){
//       if(err){
//         console.log(err);
//       } else{
//           res.render('user-list', users);
//           console.log('retrieved list of names', users.length, users[0].name);
//       }
//   })
//listUser = User.find();
// newUser.email = Math.random().toString(36).substring(7);
// newUser.password = Math.random().toString(36).substring(7);
// newUser.name = Math.random().toString(36).substring(7);
// newUser.phone = Math.random().toString(36).substring(7);
// newUser.classc = Math.round(Math.random() * 10) + 2014;
// newUser.graduated = Math.random().toString(36).substring(7);
// newUser.major = Math.random().toString(36).substring(7);
// newUser.minor = Math.random().toString(36).substring(7);
// newUser.linkedin = Math.random().toString(36).substring(7);
// newUser.bio = Math.random().toString(36).substring(7);
// newUser.level = Math.round(Math.random() * 4);
// }
//     res.render('admin/users', {
//         title: 'URKC Admin', //web title
//         message: req.flash('errorMessage'), //currently only used when there's a login fail
//         users: users
//     });
// });
module.exports = router;
