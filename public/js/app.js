"use strict";

var app = angular.module('mygitter', ['ngResource']);

// こんとろら
app.controller('myCtrl',function(roomService, messageService){
  var ctrl = this;
  ctrl.selectRoom = '';
  this.getroom = function(){
    roomService.list().then(function(req){
      console.log(req.data);
      ctrl.rooms = req.data.rooms;
    })
  }
  this.getmessage = function(room){
    ctrl.selectRoom = room.name;
    messageService.query(room.id)
      .then(function(data) {
      console.log(data.msgs);
    });
  }
});

// rooms
app.factory('roomService',function($http ){
  return{
    list: function(){
      return $http.get('/api/rooms');
    }
  }
});
// message
app.factory('messageService',function($resource){
  var res = $resource('/api/messages/:roomid',
      {userId:123, roomid:'@id'});
  return{
    query: function(roomid){
      return res.get({roomid: roomid}).$promise;
    }
  }
});
