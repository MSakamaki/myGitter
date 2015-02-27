var request         = require('request');

module.exports = function(gitterHost){
  return {
    fetch: function(path, token, cb) {
      var options = {
       url: gitterHost + path,
       headers: {
         'Authorization': 'Bearer ' + token
       }
      };

      request(options, function (err, res, body) {
        if (err) return cb(err);

        if (res.statusCode === 200) {
          cb(null, JSON.parse(body));
        } else {
          cb('err' + res.statusCode);
        }
      });
    },

    fetchCurrentUser: function(token, cb) {
      this.fetch('/api/v1/user/', token, function(err, user) {
        cb(err, user[0]);
      });
    },

    fetchRooms: function(user, token, cb) {
      this.fetch('/api/v1/user/' + user.id + '/rooms', token, function(err, rooms) {
        cb(err, rooms);
      });
    },
    // /v1/rooms/:roomId/chatMessages?limit
    // /v1/rooms/:roomId/chatMessages?limit=50
    // https://api.gitter.im/v1/rooms/:roomId/chatMessage
    fetchRoomsMessage: function(roomid, token, cb) {
      //this.fetch('/v1/rooms/' + roomid + '/chatMessages?limit=100', token, function(err, messages) {
      this.fetch('/api/v1/rooms/' + roomid + '/chatMessages', token, function(err, messages) {
        cb(err, messages);
      });
    }
  };


};