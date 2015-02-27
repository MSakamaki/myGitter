'use strict';

var express = require('express');
var session = require('express-session')
var app = express();
var bodyParser = require('body-parser')
var server = require('http').createServer(app);
var https = require('https');

var passport        = require('passport');
var OAuth2Strategy  = require('passport-oauth2');
var request         = require('request');

var gitterHost    = process.env.HOST || 'https://gitter.im';
var port          = process.env.PORT || 7000;

var io = require('socket.io')(server);
var socket;

var gitter = require('./gitter')(gitterHost);
var config = require('./config.json');

var WS_STATE ={
  CONNECTING : 0, // 接続はまだ確立されていない。
  OPEN       : 1, // WebSocket 接続が確立されていて, 通信が可能である。
  CLOSING    : 2, // 接続はハンドシェイクの切断中にあるか、または close() メソッドが呼び出されている。
  CLOSED     : 3  // 接続はすでに切断されているか, または 開けなかった。
};

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({extended: true, limit: '50mb' }));
app.use(express.static(__dirname + '/public'));
//app.use(express.json());
//app.use(express.methodOverride());
//app.use(express.cookieParser());
app.use(session({
  resave: false,
  saveUninitialized: true,
  //cookie: { secure: true },
  secret: 'keyboard cat'
}));
app.use(passport.initialize());
app.use(passport.session());


/*
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});*/

// Start server
server.listen(port,process.env.OPENSHIFT_NODEJS_IP || process.env.IP || undefined
  , function () {
  console.log('Express server listening on %d, in %s mode', port, app.get('env'));
});

/*********** passport **************/
passport.use(new OAuth2Strategy({
    authorizationURL:   gitterHost + '/login/oauth/authorize',
    tokenURL:           gitterHost + '/login/oauth/token',
    clientID:           config.GITTER_KEY,
    clientSecret:       config.GITTER_SECRET,
    callbackURL:        '/login/callback',
    passReqToCallback:  true
  },
  function(req, accessToken, refreshToken, profile, done) {
    //console.log('req.session:', req.session);
    req.session.token = accessToken;
    gitter.fetchCurrentUser(accessToken, function(err, user) {
      //console.log('user', user)
      req.session.user = user;
      req.session.save(function(){
        return (err ? done(err) : done(null, user));
      });
    });
    //return done();
  }
));

app.get('/login/callback', 
  passport.authenticate('oauth2', {
    successRedirect: '/',
    failureRedirect: '/'
  })
);

passport.serializeUser(function(user, done) {
  done(null, JSON.stringify(user));
});

passport.deserializeUser(function (user, done) {
  done(null, JSON.parse(user));
});


app.get('/login', 
  passport.authenticate('oauth2')
);

app.get('/logout', function(req,res) {
  req.session.destroy();
  res.redirect('/');
});

/** my api **/
// すべてのデータを取得
app.get('/api/hello', function (req, res) {
  res.json({"message": "HELLO"});
});

app.get('/api/rooms', function (req, res) {
  //console.log('room session:',req.user, req.session.token)
  gitter.fetchRooms(req.user, req.session.token, function(err, rooms) {
    if (err) return res.send(500);
    //console.log('room done:',rooms)
    var ret=[];
    rooms.forEach(function(data){
      ret.push({
        id : data.id,
        name : data.name
      });
    });
    res.json({"rooms": ret});
  });
});

app.get('/api/messages/:roomid', function (req, res) {
  console.log('roomid:',req.params.roomid);
  gitter.fetchRoomsMessage(req.params.roomid, req.session.token, function(err, messages){
    //console.log(messages);
    var msg;
    // messages.forEach(function(msgs){
    // //   rooms.push({
    // //     id : data.id,
    // //     name : data.name
    // //   });
    //   msg=msgs;
    // })
    roomstream(req.params.roomid, req.session.token);
    res.json({"msgs": messages});
  })
});

/* room stream(能動的な通知 websocketと組み合わせる。)  */
var roomstream = function(roomId, token){
  var heartbeat = " \n";

  var options = {
    hostname: 'stream.gitter.im',
    port:     443,
    path:     '/v1/rooms/' + roomId + '/chatMessages',
    method:   'GET',
    headers:  {'Authorization': 'Bearer ' + token}
  };

  var req = https.request(options, function(res) {
    res.on('data', function(chunk) {
      var msg = chunk.toString();
      if (msg !== heartbeat) console.log('Message: ' + msg);
    });
  });

  req.on('error', function(e) {
    console.log('Something went wrong: ' + e.message);
  });

  req.end();
}
/* WebSocket */

/*
io.on('connection', function(_socket){
  socket = _socket;

  console.log('a user connected');

  _socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});*/

exports = module.exports = app;
