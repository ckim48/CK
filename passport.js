//passport.js
var LocalStrategy = require('passport-local').Strategy;
var User = require('./ModelUser');
module.exports = function (passport, nev) {
   
    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });
    passport.deserializeUsr(function (id, done) {
        User.findById(id, function (err, user) {
            done(err, user);
        })
    });
    passport.use('local-signup', new LocalStrategy({
        usernameField: 'email', //dummy string
        passwordField: 'password', //dummy string
        passReqToCallback: true
    }, function (req, email, password, done) {
        

        var email = req.body.email;
        var password = req.body.password;
        var name = req.body.name;
        var phone = req.body.phone;
        var name = req.body.name;
        var phone = req.body.phone;
        var classc = req.body.classc;
        if (req.body.classc == 'Choose Class') {
            return done(null, false, req.flash('signupMessage', 'choose your class'));
        }
        var graduated = req.body.graduated;
        var major = req.body.major;
        var minor = req.body.minor;
        var linkedin = req.body.linkedin;
        var bio = req.body.bio;
        var level = 0;
      

        var newUser = new User();

        newUser.email = email;
        newUser.password = newUser.generateHash(password);
        newUser.name = name;
        newUser.phone = phone;
        newUser.classc = classc;     

        if (typeof graduated == 'undefined') {
            graduated = false;
        }
        else if (typeof graduated == 'string') {
            graduated = true;
        }


        newUser.graduated = graduated;
        newUser.major = major;
        newUser.minor = minor;
        newUser.level = level;
        newUser.linkedin = linkedin;
        newUser.bio = bio;

        var debugMsg = "email: " + newUser.email + "\n" + "password: " + newUser.password + "\n" + "name: " + newUser.name + "\n" + "phone: " + newUser.phone + "\n" + "classc: " + newUser.classc + "\n" + "graduated: " + newUser.graduated + "\n" + "major: " + newUser.major + "\n" + "minor: " + newUser.minor + "\n" + "linkedin: " + newUser.linkedin + "\n" + "bio: " + newUser.bio;
        console.log(debugMsg);
    
        nev.createTempUser(newUser, function( err, existingPersistentUser, newTempUser){
            if(err) console.error(err);

            if(existingPersistentUser){
                console.log('E-mail already exists');
                return done(null, false, req.flash('signupMessage', 'E-mail already exists'));
            }
            if(newTempUser){
                var URL = newTempUser[nev.options.URLFieldName];

                nev.sendVerificationEmail(email, URL, function(err, info){
            
                if(err) console.error(err);
                    console.log('An email has been sent to you. Please check it to verify your account.');
                    return done(null, true);
                    })
                } else{
                    console.log('You have already signed up. Please check your email to verify your account.');
                    return done(null);
                }
            })
    }));
    // login 
    passport.use('local-signin', new LocalStrategy({
        usernameField: 'email', //post request field for email
        passwordField: 'password', //post request field for password
        passReqToCallback: true
    }, function (req, email, password, done) {
        console.log('local-signin called');
        //Find user based on email
        User.findOne({
            'email': email
        }, function (err, user) {
            //if error
            if (err) {
                
                return done(null, false, req.flash('signinMessage', 'Incorrect Credentials'));
//                return done(err); <- this causes the whole web server to stop
            }
            //user does not exist
            if (!user) {
                return done(null, false, req.flash('signinMessage', 'Incorrect Credentials'));
            }
            //incorrect password
            if (!user.validPassword(password)) {
                return done(null, false, req.flash('signinMessage', 'Incorrect Password'));
                //maybe we should have ths signinMessage for wrong email and wrong password be the same because it can be used to identify which users are registered on the site.
            }
            //password
            return done(null, user);
        });
    }));
}