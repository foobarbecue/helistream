Session.set('duration',100000)
var overall_starttime = new Date(new Date() - Session.get('duration'))
Messages = new Meteor.Collection("ew_msgs");
var messageSub = Meteor.subscribe('ew_msgs', overall_starttime);
var observeMsgs;
var plotInitialized = false;
var xOffset = 0;

Template.messages.helpers({
messages: function () {
    return Messages.find()
}
});

/*observeMsgs = Messages.find().observe({
    added: function (document) {
        d3.selectAll("g .trLines").data()
         msgPlot.series[0].data.push(document);
//         msgPlot.render();
    }
})*/
    
Template.msgPlot.destroyed = function(){
    if(observeMsgs) Observe.stop();
}

// variables and supporting functions for plotting
var now = new Date().getTime();
var margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = 660 - margin.left - margin.right,
    height = 200 - margin.top - margin.bottom;
var plotQuery = function(){
    return{'chan': 'BHZ', 'sta': 'CON', 'msgmod': /SCREAM2EW.*/}
};
var xScale = d3.time.scale()
    .domain([new Date() - Session.get('duration'), new Date()])
    .range([0, width]);

var xScaleNoOffset = xScale.copy().domain([0,now - Session.get('duration'), now])

var scaleToSlopeIntercept = function(scale){
        slope = (scale.range()[1] - scale.range()[0]) / (scale.domain()[1] - scale.domain()[0]);
        intercept = scale.range()[0] - slope*scale.domain()[0]
        return {'slope': slope, 'intercept': intercept}
    }

var getTraceTransform = function(msg){
    xScaleParams = scaleToSlopeIntercept(xScale);
    yScaleParams = scaleToSlopeIntercept(yScale);
    pixelsPerMillisecond = xScaleParams['slope'];
    var sampRateXscale = 1000 * pixelsPerMillisecond / msg.samprate;
    // TODO this is ugly, find an elegant way.
    return "translate("
        + xScale(msg.starttime)
        + "," + yScaleParams['intercept']
        + ") scale("
        + sampRateXscale
        + "," + yScaleParams['slope']
        + ")";
}

var yScale = d3.scale.linear()
    .domain([-100000, 100000])
    .range([height, 0]);

var xAxis = d3.svg.axis()
    .scale(xScale)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(yScale)
    .orient("left");

var getTraceData = function(msg){
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

getDataExtents = function(msgs){
    var starttime = d3.min(msgs, function(d) { return d.starttime; });
    var endtime = d3.max(msgs, function(d) { return d.endtime; });
    var minCounts = d3.min(msgs, function(msg) {
        return d3.min(getTraceData(msg));
    });
    var maxCounts = d3.max(msgs, function(msg) {
        return d3.max(getTraceData(msg));
    });
    return {xMin:starttime, xMax:endtime, yMin:minCounts, yMax:maxCounts}
}

setAxesBounds = function(bounds){
    // bounds should be like {xMin:1, xMax:2, yMin:3, yMax: 4}
    // TODO resolve relationship between this and plotUpdate
    xScale.domain([bounds['xMin'], bounds['xMax']]);
    yScale.domain([bounds['yMin'], bounds['yMax']]);
    d3.select(".x.axis").call(xAxis);
    d3.select(".y.axis").call(yAxis);
}

plotUpdate = function(subPlot, msgs){
    if (!!msgs) {
        var newExtents = getDataExtents(msgs);
    } else{
        //TODO fix this it's bad
        var newExtents = {xMin:xScale.domain()[0], xMax:xScale.domain()[1], yMin:yScale.domain()[0], yMax:yScale.domain()[1]}
    }

    newExtents['xMin'] = new Date().getTime() - Session.get('duration');
    setAxesBounds(newExtents);

    // Bind the new data and build child elements
    if (!!msgs) {
        subPlot.datum(msgs)
            .selectAll("g")
            .data(function (d) {
                return (d)
            }, function (d) {
                return (d._id)
            })
            .enter()
            .append("g")
            .attr("class", "trace msg line")
            .append("path")
            .datum(
            function (msg) {
                return getTraceData(msg)
            },
            function (msg) {
                return msg._id
            });
    }
    subPlot.selectAll("g")
        .attr("transform",getTraceTransform);

    // Draw the lines
    subPlot.selectAll("path")
        .attr("d",
        d3.svg.line()
            .x(function(d,i){return i;})
            .y(function(d){return d;})
    );

    // Update the x axis
    /*xScale.domain([now - duration, now]);
    d3.select(".x.axis").call(xAxis);
    d3.select(".y.axis").call(yAxis);*/


}


Deps.autorun(function(){
    if (!!messageSub.ready()) {
        if (!plotInitialized) {

            var plotContainer = d3.select("#plot")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(50,20)")
                .attr("class", "plotContainer");

            // Put a white rectangle in the background so that plotContainer mouse events aren't triggered just on the data
            plotContainer.append("rect")
                .attr('width', width)
                .attr('height', height)
                .attr('fill', 'white');

            plotContainer.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis);

            plotContainer.append("g")
                .attr("class", "y axis")
                .call(yAxis)
                .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text("Counts");

            var zoom = function() {
                console.log(d3.event.scale)
                Session.set('duration',Session.get('duration')*d3.event.scale)

                //xOffset = d3.event.scale
                //// Pass null for the messages parameter to avoid new query
                //plotUpdate(subPlot, null, xOffset)
            };

            plotContainer
                .call(d3.behavior.zoom().x(xScale).on("zoom", zoom))
                .append("g")
                .attr("class", "subplot");

            var subPlot = d3.select("#plot .plotContainer .subplot")
            subPlot.append("defs").append("svg:clipPath")
                .attr("id","clip")
                .append("rect")
                .attr("width", 400)
                .attr("height", 200);

            plotInitialized = true;
        }


        var subPlot = d3.select("#plot .plotContainer .subplot")
        plotUpdate(subPlot, Messages.find(plotQuery()).fetch())
    }
});




UI.registerHelper('getTraceData', getTraceData);

////TODO this should be in a .rendered
//msgs = Messages.find({"chan": "BHZ"}).fetch();
//if (!!msgs){
//    plotUpdate(msgs);
//}