data=null;
line=null;
d3svg=null;
xScale=null;
indToDateScale=null;
var observeMsgs;
msgPlot = null;
// TODO rename traces collection to messages because we can deal with other types 
// of messages too, and trace should be reserved for referring to the data in a
// tracebuf message.
Messages = new Meteor.Collection("ew_traces");
Meteor.subscribe('messages')
// counter starts at 0
Session.setDefault("counter", 0);

Template.messages.helpers({
counter: function () {
    return Session.get("counter")
},
messages: function () {
    return Messages.find()
}
});

observeMsgs = Messages.find().observe({
    added: function (document) {
//         msgPlot.series[0].data.push(document);
//         msgPlot.render();
    }
})
    
Template.msgPlot.destroyed = function(){
    if(observeMsgs) Observe.stop();
}

Template.msgPlot.rendered = function() {
    //TODO this is not working
    msg = Messages.findOne({"chan": "BHZ"});
    if (!!msg){
        plotTraceData(msg);
    }

};

getTraceData = function(message){
    // tracebuf messages are really in signed Int32. We are storing them in mongo 
    // as a BinData field, which Meteor loads as a Uint8Array. The dtype field
    // says what the datatype is; might deal with other types in the future.
    message = message || this;
    if (message.dtype == "i4"){
        traceDataView = new Int32Array(message.trace.buffer);
        // Convert to normal array for display. Hopefully won't have to do this for plotting.
        traceDataArray = Array.prototype.slice.call(traceDataView);
        return traceDataArray;
        };
}

plotTraceData = function(message){
    var messageData = getTraceData(message);
    var margin = {top: 20, right: 20, bottom: 30, left: 50},
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    xScale = d3.time.scale()
        .range([0, width]);

    indToDateScale = d3.time.scale().domain([0, message.nsamp]).range([message.starttime, message.endtime]);

    var yScale = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left");

    traceLineGenr = d3.svg.line()
        .x(function(d, i) { return xScale(indToDateScale(i))})
        .y(function(d) { return yScale(d); });

    d3svg = d3.select("#plot")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    xScale.domain([message.starttime, message.endtime]);
    yScale.domain(d3.extent(messageData));

    d3svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    d3svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Price ($)");

    d3svg.append("path")
        .datum(getTraceData(message))
        .attr("class", "line")
        .attr("d", traceLineGenr);
}

UI.registerHelper('getTraceData', getTraceData);

//TODO this should be in a .rendered
msg = Messages.findOne({"chan": "BHZ"});
if (!!msg){
    plotTraceData(msg);
}