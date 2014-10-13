if (Meteor.isClient) {
  // TODO rename traces collection to messages because we can deal with other types 
  // of messages too, and trace should be reserved for referring to the data in a
  // tracebuf message.
  Messages = new Meteor.Collection("ew_traces");
  Meteor.subscribe('messages')
  // counter starts at 0
  Session.setDefault("counter", 0);

  Template.messages.helpers({
    counter: function () {
      return Session.get("counter");
    },
    messages: function () {
        return Messages.find()
    }
  });

  UI.registerHelper('getTraceData', function(){
      // tracebuf messages are really in signed Int32. We are storing them in mongo 
      // as a BinData field, which Meteor loads as a Uint8Array. The dtype field
      // says what the datatype is; might deal with other types in the future.
      if (this.dtype == "i4"){
        traceDataView = new Int32Array(this.trace.buffer);
        // Convert to normal array for display. Hopefully won't have to do this for plotting.
        traceDataArray = Array.prototype.slice.call(traceDataView);
        return traceDataArray;
      };
  });
  
  Template.hello.events({
    'click button': function () {
      // increment the counter when button is clicked
      Session.set("counter", Session.get("counter") + 1);
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
