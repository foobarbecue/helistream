Messages = new Meteor.Collection("ew_msgs");
Meteor.publish('ew_msgs', function (starttime) {

  return Messages.find({'starttime':{$gte:starttime}});
});
