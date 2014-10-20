Messages = new Meteor.Collection("ew_traces");
Meteor.publish('messages', function () {
  return Messages.find();
});
