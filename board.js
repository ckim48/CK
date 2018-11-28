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
var Post = require('../db/ModelPost');
var User = require('../db/ModelUser');
var Counter = require('../db/ModelCounter');
var LocalStrategy = require('passport-local').Strategy;
var isAuthenticated = require('../check_auth');
//Set board names
let board_name_en_to_kr_map = new Map();
board_name_en_to_kr_map.set('free', '자유게시판');
board_name_en_to_kr_map.set('hello', '가입인사');
board_name_en_to_kr_map.set('market', '장터');
board_name_en_to_kr_map.set('question', '질문게시판');
board_name_en_to_kr_map.set('announcement', '공지사항');
board_name_en_to_kr_map.set('schoollife', '학교생활');
board_name_en_to_kr_map.set('majorinfo', '전공 정보');
board_name_en_to_kr_map.set('courseinfo', '수업 정보');
board_name_en_to_kr_map.set('bugs', '버그제보');
board_name_en_to_kr_map.set('suggest', '건의사항');
board_name_en_to_kr_map.set('news', '새소식');
let board_name_kr_to_en_map = new Map();
board_name_kr_to_en_map.set('자유게시판', 'free');
board_name_kr_to_en_map.set('새소식', 'news');
board_name_kr_to_en_map.set('장터', 'market');
board_name_kr_to_en_map.set('공지사항', 'announcement');
board_name_kr_to_en_map.set('질문게시판', 'question');
board_name_kr_to_en_map.set('학교생활', 'schoollife');
board_name_kr_to_en_map.set('전공 정보', 'majorinfo');
board_name_kr_to_en_map.set('수업 정보', 'courseinfo');
board_name_kr_to_en_map.set('버그제보', 'bugs');
board_name_kr_to_en_map.set('건의사항', 'suggest');
board_name_kr_to_en_map.set('가입인사', 'hello');
/* For AWS S3 image upload */

var uuid = require("uuid");
var aws = require('aws-sdk');

aws.config.loadFromPath('../aws-config.json');


var s3 = new aws.S3();



router.post('/uploadimage', isAuthenticated, function (req, res, next) {
    req.body.image_content = req.sanitize(req.body.image_content);
    next();
}, function (req, res, next) {

});

var uploadToS3 = function (folder, name, body, type) {

    var uid = uuid.v4();
    var params = {
        Bucket: 'urkc-image-server',
        Key: folder + '/' + uid + '_' + name,
        Body: body,
        ContentEncoding: 'base64',
        ContentType: 'image/' + type
    }
    s3.putObject(params, function (err, data) {
        if (err) {
            console.log(err);
            console.log('Error uploading data: ', data);
            //            return 'error.png';
        } else {
            console.log('succesfully uploaded the image!' + JSON.stringify(data));
            //            return uid + '_' + name;
        }
    });
    return folder + '/' + uid + '_' + name;
}

router.post('/uploadpost', isAuthenticated, function (req, res, next) {
        req.body.board_name = req.sanitize(req.body.board_name);
        req.body.post_title = req.sanitize(req.body.post_title);
        req.body.post_content = req.sanitize(req.body.post_content);
        req.body.notice = req.sanitize(req.body.notice);
        next();
    }, function (req, res, next) {

        var content = req.body.post_content;
        var imgregex = /!\[([^\[]+)\]\((data\:image[^\)]+)\)/g;
        var images = content.match(imgregex);
        if (images) {
            console.log("Found " + images.length + " images");
            var promises = [];
            var imageinfo = [];
            for (var i = 0; i < images.length; i++) {
                var raw = images[i];

                var name = raw.substring(raw.indexOf('![') + 2, raw.indexOf(']'));
                console.log("name : " + name);
                name = name.split(' ').join("%20");

                var base64 = raw.substring(raw.indexOf('(') + 1, raw.indexOf(')'));
                //                console.log("base64: " + base64);

                imageinfo.push({
                    name: name
                });

                var img = new Buffer(base64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
                //        console.log("img : " + img);

                var type = base64.split(';')[0].split('/')[1];
                console.log("type: " + type);
                promises.push(uploadToS3('post-images', name, img, type));
            }
            Promise.all(promises).then(function (results) {
                console.log("Promsied");
                for (var i = 0; i < results.length; i++) {
                    var raw = images[i];
                    //                    var image = results[i].split(' ').join('+');
                    var image = results[i];
                    var info = imageinfo[i];
                    console.log("Image name: /" + image);
                    req.body.post_content = req.body.post_content.replace(raw, '![이미지 로드 실패 원본: ' + info.name + '](' + encodeURI('https://urkc.org/image-server/' + image) + ')');
                    //                    req.body.post_content = req.body.post_content.replace(raw, '![이미지 로드 실패 원본: ' + info.name + '](' + ('https://urkc.org/image-server/' + image) + ')');
                }
                next();
            });
        } else {
            next();
        }

    },
    function (req, res, next) {
        Counter.findOne({
            name: 'posts'
        }, function (err, counter) {
            console.log("Post creation with: " + req.body.post_content);
            var notice = req.body.notice;
            if (notice == 'false') {

                var count = counter.totalCount;
                counter.totalCount++;
                counter.save();
            } else if (notice == 'true') {

                var count = -1;
            } else {
                var count = counter.totalCount;
                counter.totalCount++;
                counter.save();
            }

            console.log("Post creation with: " + req.body.post_content);
            Post.create({
                author: req.user._id,
                numId: count,
                board_name: req.body.board_name,
                title: req.body.post_title,
                content: req.body.post_content,
                name: req.user.name,
                read_access_level: 1,
                views: 0
            }, function (err, post) {
                if (err) {
                    res.send("err");
                }
                res.send("success");
            });
        });
    });


//router.post('/uploadpost2', isAuthenticated, function(req, res, next) {
//    req.body.board_name = req.sanitize(req.body.board_name);
//    req.body.post_title = req.sanitize(req.body.post_title);
//    req.body.post_content = req.sanitize(req.body.post_content);
//    next();
//}, function(req, res, next) {
//    Post.create({
//        author: req.user._id,
//        board_name: req.body.board_name,
//        title: req.body.post_title,
//        content: req.body.post_content,
//        name: req.user.name,
//        read_access_level: 1,
//        views: 0
//    }, function(err, post) {
//        if (err) {
//            res.send("err");
//        }
//        res.send("success");
//    });
//});

//done aws s3

// For functions in /routes/utils.js
var utils = require('../utils');

const board_name_obj = {
    'free': '자유게시판',
    'hello': '가입인사',
    'announcement': '공지사항',
    'market': '장터',
    'question': '질문게시판',
    'schoollife': '학교생활',
    'majorinfo': '전공 정보',
    'courseinfo': '수업 정보',
    'suggest': '건의사항',
    'bugs': '버그제보',
    'news': '새소식'
}


router.get('/write', isAuthenticated, function (req, res, next) {
        if (req.query.board){
            req.query.board = req.sanitize(req.query.board);
        }
    
        res.render('board/write', {
        title: 'Write a new post',
        user: req.user,
        boards: board_name_obj,
        boardname: req.query.board
    });
});
router.post('/editpost', isAuthenticated, function (req, res, next) {
    console.log("called editpost");
    req.body.postid = req.sanitize(req.body.postid);
    next();
}, function (req, res, next) {
    res.send('success');
});

router.post('/getcommentauthor', isAuthenticated, function (req, res, next) {
    req.body.postid = req.sanitize(req.body.postid);
    req.body.commentindex = req.sanitize(req.body.commentindex);
    next();
}, function (req, res, next) {
    Post.findOne({
        _id: req.body.postid
    }, function (err, post) {
        if (err) {
            console.log(err);
            res.send(404); //not post found
        } else if (req.body.commentindex >= post.comments.length) {
            console.log(err);
            res.send(404); //not post found
        } else {
            User.findOne({
                _id: post.comments[req.body.commentindex].author
            }, function (err, author) {
                if (err) {
                    console.log(err);
                    res.send(404); //not post found
                } else {
                    res.json({
                        name: author.name,
                        classc: author.classc,
                        major: author.major
                    });
                }
            });
        }
    });
});

router.post('/uploadcomment', isAuthenticated, function (req, res, next) {
    req.body.postid = req.sanitize(req.body.postid);
    req.body.comment = req.sanitize(req.body.comment);
    next();
}, function (req, res, next) {
    var content = req.body.comment;
    var imgregex = /!\[([^\[]+)\]\((data\:image[^\)]+)\)/g;
    var images = content.match(imgregex);
    if (images) {
        console.log("Found " + images.length + " images");
        var promises = [];
        var imageinfo = [];
        for (var i = 0; i < images.length; i++) {
            var raw = images[i];

            var name = raw.substring(raw.indexOf('![') + 2, raw.indexOf(']'));
            console.log("name : " + name);

            var base64 = raw.substring(raw.indexOf('(') + 1, raw.indexOf(')'));
            //                console.log("base64: " + base64);

            imageinfo.push({
                name: name
            });

            var img = new Buffer(base64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
            //        console.log("img : " + img);

            var type = base64.split(';')[0].split('/')[1];
            console.log("type: " + type);
            promises.push(uploadToS3('comment-images', name, img, type));
        }
        Promise.all(promises).then(function (results) {
            console.log("Promsied");
            for (var i = 0; i < results.length; i++) {
                var raw = images[i];
                var image = results[i].split(' ').join('+');
                var info = imageinfo[i];
                console.log("Image name: /" + image);
                req.body.comment = req.body.comment.replace(raw, '![이미지 로드 실패 원본: ' + info.name + '](' + encodeURI('https://s3.us-east-2.amazonaws.com/urkc-image-server/' + image) + ')');
            }
            next();
        });
    } else {
        next();
    }

}, function (req, res, next) {
    Post.findOne({
        _id: req.params.postid
    }, function (err, post) {
        if (err) {
            console.log(err);
            res.send(404); //not post found
        } else {
            let comment = {
                author: req.user._id,
                memo: req.body.comment,
                createAt: Date.now(),
                updatedAt: Date.now()
            };

            Post.findOneAndUpdate({
                _id: req.body.postid
            }, {
                $push: {
                    comments: comment
                }
            }, function (error, success) {
                if (error) {
                    console.log(error);
                    res.send("error");
                } else {
                    console.log(success);
                    res.send("success");
                }
            });
        }
    });
});
//This is an old method that only accepts plain text and no images
//router.post('/uploadpost', isAuthenticated, function (req, res, next) {
//    req.body.board_name = req.sanitize(req.body.board_name);
//    req.body.post_title = req.sanitize(req.body.post_title);
//    req.body.post_content = req.sanitize(req.body.post_content);
//    next();
//}, function (req, res, next) {
//    Post.create({
//        author: req.user._id,
//        board_name: req.body.board_name,
//        title: req.body.post_title,
//        content: req.body.post_content,
//        name: req.user.name,
//        read_access_level: 1,
//        views: 0
//    }, function (err, post) {
//        if (err) {
//            res.send("err");
//        }
//        res.send("success");
//    });
//});

//working on showing comments
router.get('/post/:postid', isAuthenticated, function (req, res, next) {
    req.params.postid = req.sanitize(req.params.postid);
    Post.findOne({
        _id: req.params.postid
    }, function (err, post) {
        if (err) {
            console.log(err);
            res.send(404); //not post found
        } else {
            post.views++;
            post.save(); // is it possible to move this after sending user the web page details? it might increase performance

            User.findOne({
                _id: post.author
            }, function (err, author) {
                if (err) {
                    console.log(err);
                    res.send(404); //not post found
                } else {
                    let escpd_content = post.content.split('`').join('@BACKTICK@');
                    console.log(escpd_content);
                    console.log(author._id + "==" + req.user._id);
                    // check if post author is same with log-in user
                    if (author._id.equals(req.user._id) || req.user.level >= 90) {
                        var isAuthor = true;
                        //console.log(isAuthor);
                    } else {
                        var isAuthor = false;
                        //console.log(isAuthor);
                    }
                    res.render('board/post', {
                        title: post.title,
                        post: post,
                        escaped_content: escpd_content,
                        author: {
                            name: author.name,
                            classc: author.classc,
                            major: author.major,
                            bio: author.bio
                        },
                        user: req.user,
                        isAuthor: isAuthor,
                        comments: post.comments
                    });
                }
            });
        }
    });
});


const entries_per_page = 30;
// route of /:free*? makes /board/free optional
router.get('/:boardname', isAuthenticated, function (req, res, next) {
    var page = req.sanitize(req.query.page);
    req.params.boardname = req.sanitize(req.params.boardname);
    Post.find({
        board_name: req.params.boardname,
        numId: {
            $ne: -1
        }
    }, function (err, posts) {
        Post.find({
            board_name: req.params.boardname,
            numId: -1
        }, function (err, noti) {
            if (err) {
                console.log(err);
            } else {
                var entry_start = 0,
                    entry_end = entries_per_page;
                if (typeof page != 'undefiend' && page) {
                    entry_start = page * entries_per_page;
                    //watch out for array max
                    //console.log(entry_start + "@");
                    if (entry_start >= posts.length) {
                        entry_start = 0;
                        //console.log(entry_start);
                    } else {
                        if (entry_start + entries_per_page < posts.length) {
                            entry_end = entry_start + entries_per_page
                        } else {
                            entry_end = posts.length;
                        }
                    }
                }
                if (posts.length == 0) {
                    req.flash('errorMessage', 'No posts were found.')
                }
                //console.log(entry_start + " " + entry_end);
                var numOfPages = Math.ceil(posts.length / entries_per_page) - 1;
                var currentPage = Math.floor((entry_end - 1) / entries_per_page);
                var numTotalPost = posts.length;
                //console.log(entry_start + " " + entry_end + " " + " " + users.length + " " +  (entry_end/users.length));
                posts = posts.slice(entry_start, entry_end);
                console.log(currentPage + "/" + numOfPages);

                for (var i = 0; i < posts.length; i++) {
                    posts[i].title = utils.shortenString(posts[i].title);
                }

                res.render('board/board', {
                    title: board_name_en_to_kr_map.get(req.params.boardname), //web title
                    message: req.flash('errorMessage'), //currently only used when there's a login fail
                    posts: posts,
                    noti: noti,
                    numOfPages: numOfPages,
                    currentPage: currentPage,
                    numTotalPost: numTotalPost,
                    boardname: req.params.boardname,
                    post: req.post,
                    user: req.user
                });
            }
        })
    }).sort({
        updatedAt: -1
    });
});



router.get('/admin/:useremail', isAuthenticated, function (req, res, next) {
    var page = req.sanitize(req.query.page);
    req.params.useremail = req.sanitize(req.params.useremail);
    req.params.userId = req.sanitize(req.params.userid);
    var user = req.params.useremail;
    console.log(req.params.userId);
    User.findOne({
        email: req.params.useremail
    }, function (err, suser) {
        Post.find({
            author: suser._id
        }, function (err, posts) {
            if (err) {
                console.log(err);
            } else {
                console.log(posts);
                var entry_start = 0,
                    entry_end = entries_per_page;
                if (typeof page != 'undefiend' && page) {
                    entry_start = page * entries_per_page;
                    //watch out for array max
                    //console.log(entry_start + "@");
                    if (entry_start >= posts.length) {
                        entry_start = 0;
                        //console.log(entry_start);
                    } else {
                        if (entry_start + entries_per_page < posts.length) {
                            entry_end = entry_start + entries_per_page
                        } else {
                            entry_end = posts.length;
                        }
                    }
                }
                if (posts.length == 0) {
                    req.flash('errorMessage', 'No posts were found.')
                }
                //console.log(entry_start + " " + entry_end);
                var numOfPages = Math.ceil(posts.length / entries_per_page) - 1;
                var currentPage = Math.floor((entry_end - 1) / entries_per_page);
                var numTotalPost = posts.length;
                //console.log(entry_start + " " + entry_end + " " + " " + users.length + " " +  (entry_end/users.length));
                posts = posts.slice(entry_start, entry_end);
                console.log(currentPage + "/" + numOfPages);
                res.render('board/board', {
                    title: suser.name + '(' + suser.email + ')' + '\'s posts', //web title
                    message: req.flash('errorMessage'), //currently only used when there's a login fail
                    posts: posts,
                    numOfPages: numOfPages,
                    currentPage: currentPage,
                    numTotalPost: numTotalPost,
                    post: req.post,
                    user: req.user
                });
            }
        }).sort({
            updatedAt: -1
        });
    });
});

router.get('/admin/comments/:useremail', isAuthenticated, function (req, res, next) {
    var page = req.sanitize(req.query.page);
    req.params.useremail = req.sanitize(req.params.useremail);
    console.log("email:" + req.params.useremail);
    req.params.userId = req.sanitize(req.params.userid);
    var user = req.params.useremail;
    console.log("COMMENTs");
    User.findOne({
        email: req.params.useremail
    }, function (err, suser) {
        Post.find({
            comments: {
                "$elemMatch": {
                    'author': suser._id
                }
            }
        }, function (err, posts) {
            if (err) {
                console.log(err);
            } else {
                console.log(posts);
                var entry_start = 0,
                    entry_end = entries_per_page;
                if (typeof page != 'undefiend' && page) {
                    entry_start = page * entries_per_page;
                    //watch out for array max
                    //console.log(entry_start + "@");
                    if (entry_start >= posts.length) {
                        entry_start = 0;
                        //console.log(entry_start);
                    } else {
                        if (entry_start + entries_per_page < posts.length) {
                            entry_end = entry_start + entries_per_page
                        } else {
                            entry_end = posts.length;
                        }
                    }
                }
                if (posts.length == 0) {
                    req.flash('errorMessage', 'No posts were found.')
                }
                //console.log(entry_start + " " + entry_end);
                var numOfPages = Math.ceil(posts.length / entries_per_page) - 1;
                var currentPage = Math.floor((entry_end - 1) / entries_per_page);
                var numTotalPost = posts.length;
                //console.log(entry_start + " " + entry_end + " " + " " + users.length + " " +  (entry_end/users.length));
                posts = posts.slice(entry_start, entry_end);
                console.log(currentPage + "/" + numOfPages);
                res.render('board/board_admin', {
                    title: 'Posts where ' + suser.name + '(' + suser.email + ')' + ' has commented', //web title
                    message: req.flash('errorMessage'), //currently only used when there's a login fail
                    posts: posts,
                    numOfPages: numOfPages,
                    currentPage: currentPage,
                    numTotalPost: numTotalPost,
                    post: req.post,
                    user: req.user
                });
            }
        }).sort({
            updatedAt: -1
        });
    });
});
//add post
//router.post('/write',function (req, res) {
//router.post('/write', isAuthenticated, function (req, res, next) {
//    Post.create({
//        author: req.user._id
//        , board_name: req.body.board_name
//        , title: req.body.post_title
//        , content: req.body.post_content
//        , name: req.user.name
//        , read_access_level: 1
//        , views: 0
//    }, function (err, post) {
//        if (err) return res.json({
//            success: false
//            , message: err
//        });
//        //     success: true,
//        //     data: posts//        // res.json({

//        // });
//        res.redirect('/board');
//    });
//});
// delete post
//TODO INSTEAD OF PUTTING THIS AS DELETE REQUEST, MAKE A POST REQUEST AND SEPARATE ROUTING ADDR TO TREAT POST DELETION.
router.post('/deletepost', isAuthenticated, function (req, res, next) {

    req.body.postid = req.sanitize(req.body.postid);
    next();
}, function (req, res, next) {
    //res.redirect('/');
    Post.findOneAndRemove({
        _id: req.body.postid
    }, function (err, post) {
        if (err) {
            res.send("err");
        }
        if (!post) {
            res.send("err");
        }
        res.send('success');
    });
});

//edit post
router.get('/edit/:postid', isAuthenticated, function (req, res, next) {
    req.params.postid = req.sanitize(req.params.postid);
    Post.findOne({
        _id: req.params.postid
    }, function (err, post) {
        if (err) {
            console.log(err);
            res.send(404); //not post found
        } else {
            User.findOne({
                _id: post.author
            }, function (err, author) {
                if (err) {
                    console.log(err);
                    res.send(404); //not post found
                } else {
                    let escpd_content = post.content.split('`').join('@BACKTICK@');
                    // check if post author is same with log-in user

                    var isAuthor = author._id.equals(req.user._id);
                    //console.log(isAuthor);

                    res.render('board/edit', {
                        title: post.title,
                        post: post,
                        escaped_content: escpd_content,
                        author: {
                            name: author.name,
                            classc: author.classc,
                            major: author.major,
                            bio: author.bio
                        },
                        user: req.user,
                        isAuthor: isAuthor,
                        boardname: post.board_name,
                        boards: board_name_obj
                    });
                }
            });
        }
    });
});
router.post('/edited', isAuthenticated, function (req, res, next) {
    req.body.board_name = req.sanitize(req.body.board_name);
    req.body.post_title = req.sanitize(req.body.post_title);
    req.body.post_content = req.sanitize(req.body.post_content);
    req.body.notice = req.sanitize(req.body.notice);
    req.body.postid = req.sanitize(req.body.postid);
    next();
}, function (req, res, next) {

    var content = req.body.post_content;
    var imgregex = /!\[([^\[]+)\]\((data\:image[^\)]+)\)/g;
    var images = content.match(imgregex);
    if (images) {
        console.log("Found " + images.length + " images");
        var promises = [];
        var imageinfo = [];
        for (var i = 0; i < images.length; i++) {
            var raw = images[i];

            var name = raw.substring(raw.indexOf('![') + 2, raw.indexOf(']'));
            console.log("name : " + name);
            name = name.split(' ').join("%20");

            var base64 = raw.substring(raw.indexOf('(') + 1, raw.indexOf(')'));
            //                console.log("base64: " + base64);

            imageinfo.push({
                name: name
            });

            var img = new Buffer(base64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
            //        console.log("img : " + img);

            var type = base64.split(';')[0].split('/')[1];
            console.log("type: " + type);
            promises.push(uploadToS3('post-images', name, img, type));
        }
        Promise.all(promises).then(function (results) {
            console.log("Promsied");
            for (var i = 0; i < results.length; i++) {
                var raw = images[i];
                //                    var image = results[i].split(' ').join('+');
                var image = results[i];
                var info = imageinfo[i];
                console.log("Image name: /" + image);
                req.body.post_content = req.body.post_content.replace(raw, '![이미지 로드 실패 원본: ' + info.name + '](' + encodeURI('https://urkc.org/image-server/' + image) + ')');
                //                    req.body.post_content = req.body.post_content.replace(raw, '![이미지 로드 실패 원본: ' + info.name + '](' + ('https://urkc.org/image-server/' + image) + ')');
            }
            next();
        });
    } else {
        next();
    }

}, function (req, res, next) {
    Post.findOneAndUpdate({
        _id: req.body.postid
    }, {
        $set: {
            board_name: req.body.board_name,
            title: req.body.post_title,
            content: req.body.post_content,
            read_access_level: 1

        }
    }, function (err, post) {
        if (err) {
            res.send("err");
        }

        res.send("success");
    });
});
//TODO INSTEAD OF PUTTING THIS AS PUT REQUEST, MAKE A POST REQUEST AND SEPARATE ROUTING ADDR TO TREAT POST DELETION.
// router.put('/', isAuthenticated, function(req, res) {
//     req.body.post.updatedAt = Date.now();
//     Post.findById(req.params.id, function(err, post) {
//         if (err) return res.json({
//             success: false,
//             message: err
//         });
//         if (!req.user._id.equals(post.author)) return res.json({
//             success: false,
//             message: "Wrong attempt"
//         });
//         Post.findByIdAndUpdate(req.params.id, req.body.post, function(err, post) {
//             if (err) return res.json({
//                 success: false,
//                 message: err
//             });
//         })
//         res.redirect('/'); // + req.params.id -> returnning to post page.
//     });
// });
module.exports = router;

//router.get('/post/:postid', isAuthenticated, function(req, res, next) {
//    req.params.postid = req.sanitize(req.params.postid);
//    Post.findOne({
//        _id: req.params.postid
//    }, function(err, post) {
//        if (err) {
//            console.log(err);
//            res.send(404); //not post found
//        } else {
//            User.findOne({
//                _id: post.author
//            }, function(err, author) {
//                if (err) {
//                    console.log(err);
//                    res.send(404); //not post found
//                } else {
//                    //prepare package to send
//                    let comments = [];
//                    for (var i = 0; i < post.comments.length; i++) {
//                        let comment = post.comments[i];
//                        console.log("ind " + i + " " + comment);
//                        User.findOne({
//                            _id: comment.author
//                        }, function(err, user) {
//                            if (err) {
//                                console.log(err);
//                                res.send(404); //not post found
//                            } else {
//                                console.log("pushing " + i + " " + comment);
//                                comments.push({
//                                    author_name: user.name,
//                                    author_class: user.classc,
//                                    author_major: user.major[0],
//                                    memo: comment.memo,
//                                    createdAt: comment.createdAt,
//                                    updatedAt: comment.updatedAt
//                                });
//                            }
//                        });
//                    }
//                    let escpd_content = post.content.split('`').join('@BACKTICK@');
//                    console.log(escpd_content);
//                    console.log(comments);
//                    res.render('board/post', {
//                        title: post.title,
//                        post: post,
//                        escaped_content: escpd_content,
//                        author: author,
//                        user: req.user,
//                        comments: comments
//                    });
//                }
//            });
//        }
//    });
//});
