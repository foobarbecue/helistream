Messages = new Meteor.Collection("ew_msgs");
var messageSub = Meteor.subscribe('messages');
var observeMsgs;

Template.messages.helpers({
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
    Deps.autorun(function(){
    if (messageSub.ready()) {
        plotMsgs(Messages.find({"chan": "BHZ"}).fetch());
    }})
};

getTraceData = function(msg){
    // tracebuf messages are really in signed Int32. We are storing them in mongo 
    // as a BinData field, which Meteor loads as a Uint8Array. The dtype field
    // says what the datatype is; might deal with other types in the future.
    msg = msg || this;
    if (msg.dtype == "i4"){
        traceDataView = new Int32Array(msg.trace.buffer);
        // Convert to normal array for display. Hopefully won't have to do this for plotting.
        traceDataArray = Array.prototype.slice.call(traceDataView);
        return traceDataArray;
        };
}

getTraceTransform = function(msg){
    pixelsPerMillisecond = ((xScale.range()[1] - xScale.range()[0]) / (xScale.domain()[1] - xScale.domain()[0]))
    return "translate(" + xScale(msg.starttime) + ") scale(" +  1000 * pixelsPerMillisecond / msg.samprate + ", 1)"
}

plotMsgs = function(msgs){
    var starttime = d3.min(msgs, function(d) { return d.starttime; });
    var endtime = d3.max(msgs, function(d) { return d.endtime; });
    var minCounts = d3.min(msgs, function(msg) {
        return d3.min(getTraceData(msg));
        });
    var maxCounts = d3.min(msgs, function(msg) {
        return d3.max(getTraceData(msg));
    });

    var margin = {top: 20, right: 20, bottom: 30, left: 50},
        width = 660 - margin.left - margin.right,
        height = 200 - margin.top - margin.bottom;

    var xScale = d3.time.scale()
        .domain([starttime, endtime])
        .range([0, width]);

    var xScaleNoOffset = xScale.copy().domain([0,endtime-starttime])

    var yScale = d3.scale.linear()
        .range([height, 0]);
        yScale.domain([minCounts, maxCounts]);

    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left");

        //return d3.svg.line()
        //    // d is the actual trace message
        //    .x(function (d, i) {
        //        return xScale(indToDateScale(i))
        //    })
        //    .y(function (d) {
        //        return yScale(d);
        //    });

    d3svg = d3.select("#plot")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

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
        .text("Counts");

    var trLinesGrp = d3svg.append("g")
        .attr("class", "trLines")
        .datum(msgs)
        .selectAll("g")
        .data(function(d){return(d)})
        .enter()
        .append("g")
        .attr("class", "trace line")
        .attr("transform",getTraceTransform)
        .append("path")
        .datum(function(msg){return getTraceData(msg);})

    trLinesGrp.attr("d",
            d3.svg.line()
                .x(function(d,i){return i;})
                .y(function(d){return yScale(d);})
            );
}


UI.registerHelper('getTraceData', getTraceData);

//TODO this should be in a .rendered
msg = Messages.findOne({"chan": "BHZ"});
if (!!msg){
    plotTraceData(msg);
}