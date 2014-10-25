Messages = new Meteor.Collection("ew_msgs");
Meteor.publish('messages', function () {
  return Messages.find();
});
