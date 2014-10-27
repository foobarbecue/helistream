var n = 120;
var nSensors = 4;
var duration = 1000;

var now = new Date(Date.now() - duration);
// 1 x nSensors array of zeros
var count = d3.range(nSensors).map(function () {
    return 0;
});
// nSensors x n array of zeros
var data = count.map(function () {
    return d3.range(n).map(function () {
        return 0;
    });
});

var margin = { top: 20, right: 10, bottom: 20, left: 20 };
var width = 800 - margin.right - margin.left;
var height = 300 - margin.top - margin.bottom;

var x = d3.time.scale()
    .domain([now - (n - 2) * duration, now - duration])
    .range([0, width]);

var y = d3.scale.linear()
    .domain([0, 100])
    .range([height, 0]);

var line = d3.svg.line()
    .interpolate("basis")
    .x(function (d, i) { return x(now - (n - 1 - i) * duration); })
    .y(function (d, i) { return y(d); });

var color = d3.scale.category10();

var svg = d3.select("body").append("svg")
    .attr("class", "lineChart")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

svg.append("defs").append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("width", width)
    .attr("height", height);

var yAxis = d3.svg.axis()
    .scale(y)
    .tickSize(width)
    .orient("right")

var gy = svg.append("g")
    .attr("class", "y axis")
    .call(yAxis)

gy.selectAll("text")
    .attr("text-anchor", "end")
    .attr("x", 4)
    .attr("dy", -4)

var xAxis = svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(x.axis = d3.svg.axis().scale(x).orient("bottom"));

var clipPath = svg.append("g")
    .attr("clip-path", "url(#clip)");

var paths = clipPath.append("g")

for (var series in data) {
    paths.append("path")
        .attr("class", "line")
        .data([data[series]])
        .style("stroke", color(series))
}

// Live bar graph
var barW = 300 - margin.left - margin.right;
var barH = 190 - margin.top - margin.bottom;
var rectH = 28;

var barX = d3.scale.linear()
    .domain([0, 100])
    .range([0, barW]);

var barSvg = d3.select("body").append("svg")
    .attr("class", "barChart")
    .attr("width", barW + margin.right + margin.left)
    .attr("height", barH + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

barSvg.selectAll("rect")
    .data(count)
    .enter().append("rect")
    .attr("y", function (d, i) { return i * 38; })
    .attr("width", barX)
    .style("fill", function (d, i) { return color(i); })
    .attr("height", rectH);

barSvg.selectAll("text")
    .data(count)
    .enter().append("text")
    .attr("x", 50)
    .attr("y", function (d, i) { return (i * 38) + 14 })
    .attr("dy", "0.35em")
    .attr("text-anchor", "end")
    .text(function (d) { return d + " psi" })

barSvg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + barH + ")")
    .call(d3.svg.axis().scale(barX).orient("bottom"))

// Live data
//var socket = io.connect('');

//socket.on('news', function (pressure) {
//    oldCount = count;
//    count = pressure.values;
//})

setInterval(function () {
    for (var series in count) {
        count[series] += (Math.random() - 0.5) * 5;
        count[series] = Math.min(Math.max(count[series], 0), 100);
    }
}, 900);


// Animate
tick();

function tick() {

    // update the domains
    now = new Date();
    x.domain([now - (n - 2) * duration, now - duration]);

    for (var series in data) {
        data[series].push(count[series]);
    }

    // slide the x-axis left
    xAxis.transition()
        .duration(duration)
        .ease("linear")
        .call(x.axis);

    // redraw the line
    svg.selectAll(".line")
        .attr("d", line)

    // slide the line left
    paths.attr("transform", null)
        .transition()
        .duration(duration)
        .ease("linear")
        .attr("transform", "translate(" + x(now - (n - 1) * duration) + ")")
        .each("end", tick);

    // pop the old data point off the front
    for (var series in data) {
        data[series].shift();
    }

    // bar animation
    barSvg.selectAll("rect")
        .data(count)
        .transition()
        .duration(duration)
        .attr("width", barX);

    barSvg.selectAll("text")
        .data(count)
        .text(function (d) { return Math.floor(d) + " psi" })
}
/**
 * Created by aaron on 10/27/14.
 */
