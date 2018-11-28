// ModelUser.js
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');
var passportLocalMongoose = require('passport-local-mongoose');
var userSchema = mongoose.Schema({
    email: String
    , password: String
    , name: String
    , classc: Number
    , graduated: Boolean
    , phone: String
    , major: [String]
    , minor: [String]
    , profile: String
    , posts: [String]
    , profile_image:
    {
    	data: Buffer,
    	contentType:String
    }
    , registration: {
        type: Date
        , default: Date.now
    }
    , comment: [String]
    , accepted_by: String
    , level: Number
    , bio: String
    , linkedin: String
});
userSchema.methods.generateHash = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};
userSchema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.password)
};
// userSchema.pre('save', function (next) {
//     this.password = bcrypt.hashSync(this.password, bcrypt.genSaltSync(8), null);
//    if (this.password.length <= 25) {
//        this.password = bcrypt.hashSync(this.password, bcrypt.genSaltSync(8), null);
//    } else {
//        this.password = this.password;
//    }
//     next()
// });

userSchema.pre('update', function () {
    this.update({}, {
        $set: {
            updatedAt: new Date()
        }
    });
});
module.exports = mongoose.model('User', userSchema);