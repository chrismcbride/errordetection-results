const errorPromise = d3.csv('data/errors.csv')

function updateChart(selectedGroup) {
    Promise.all([errorPromise, d3.csv(`data/${selectedGroup}.csv`)]).then( results => {
        const errTimeParser = d3.timeParse("%H:%M:%S")
        const errors = results[0].filter(r => r.error_code == selectedGroup);
        const errorTimes = errors.map(function(e) {
            return {
               start: errTimeParser(e.start),
               end: errTimeParser(e.end)
            };
        });

        const data = results[1];
	    var keys = data.columns.slice(1);

	    var parseTime = d3.timeParse("%H:%M"),
            formatDate = d3.timeFormat("%H:%M"),
        	bisectDate = d3.bisector(d => d.time).left;

	    data.forEach(function(d) {
		    d.time = parseTime(d.time);
		    return d;
	    });

	    var svg = d3.select("#chart"),
		    margin = {top: 15, right: 35, bottom: 15, left: 35},
		    width = +svg.attr("width") - margin.left - margin.right,
		    height = +svg.attr("height") - margin.top - margin.bottom;

	    var x = d3.scaleTime()
		    .rangeRound([margin.left, width - margin.right])
		    .domain(d3.extent(data, d => d.time))

	    var y = d3.scaleLinear()
		    .rangeRound([height - margin.bottom, margin.top]);

	    var z = d3.scaleOrdinal(d3.schemeCategory10);

	    var line = d3.line()
		    .curve(d3.curveCardinal)
		    .x(d => x(d.time))
		    .y(d => y(d.errors));

	    svg.append("g")
		    .attr("class","x-axis")
		    .attr("transform", "translate(0," + (height - margin.bottom) + ")")
		    .call(d3.axisBottom(x).tickFormat(formatDate));

	    svg.append("g")
		    .attr("class", "y-axis")
		    .attr("transform", "translate(" + margin.left + ",0)");

        svg.selectAll(".alertBand").remove();

        errorTimes.forEach(function(e) {
            svg.append("rect")
               .attr("class", "alertBand")
               .attr("x", x(e.start))
               .attr("y", 10)
               .attr("width", x(e.end) - x(e.start))
               .attr("height", height - 25)
               .style('opacity', 0.3)
               .style('fill', '#F08080');
         });

	    var focus = svg.append("g")
		    .attr("class", "focus")
		    .style("display", "none");

	    focus.append("line").attr("class", "lineHover")
		    .style("stroke", "#999")
		    .attr("stroke-width", 1)
		    .style("shape-rendering", "crispEdges")
		    .style("opacity", 0.5)
		    .attr("y1", -height)
		    .attr("y2",0);

	    focus.append("text").attr("class", "lineHoverDate")
		    .attr("text-anchor", "middle")
		    .attr("font-size", 12);

	    var overlay = svg.append("rect")
		    .attr("class", "overlay")
		    .attr("x", margin.left)
		    .attr("width", width - margin.right - margin.left)
		    .attr("height", height);

		var buildVersions = keys.map(function(id) {
		    return {
                id: id,
            	values: data.map(d => {return {time: d.time, errors: +d[id]}})
            };
		});

		y.domain([
    		d3.min(buildVersions, d => d3.min(d.values, c => c.errors)),
    		d3.max(buildVersions, d => d3.max(d.values, c => c.errors))
    	]).nice();

    	svg.selectAll(".y-axis").transition()
           .duration(750)
           .call(d3.axisLeft(y).tickSize(-width + margin.right + margin.left));

        var buildVersion = svg.selectAll(".buildVersions")
            		.data(buildVersions);

        buildVersion.exit().remove();

        buildVersion.enter().insert("g", ".focus").append("path")
        			.attr("class", "line buildVersions")
        			.style("stroke", d => z(d.id))
        			.merge(buildVersion)
        		.transition().duration(750)
        			.attr("d", d => line(d.values))

        function tooltip(copy) {

    	    var labels = focus.selectAll(".lineHoverText")
    		    .data(copy)

            labels.enter().append("text")
                .attr("class", "lineHoverText")
                .style("fill", d => z(d))
                .attr("text-anchor", "start")
                .attr("font-size",12)
                .attr("dy", (_, i) => 1 + i * 2 + "em")
                .merge(labels);

            var circles = focus.selectAll(".hoverCircle")
                .data(copy)

            circles.enter().append("circle")
                .attr("class", "hoverCircle")
                .style("fill", d => z(d))
                .attr("r", 2.5)
                .merge(circles);

            svg.selectAll(".overlay")
                .on("mouseover", function() { focus.style("display", null); })
                .on("mouseout", function() { focus.style("display", "none"); })
                .on("mousemove", mousemove);

            function mousemove() {

                var x0 = x.invert(d3.mouse(this)[0]),
                    i = bisectDate(data, x0, 1),
                    d0 = data[i - 1],
                    d1 = data[i],
                    d = x0 - d0.time > d1.time - x0 ? d1 : d0;

                focus.select(".lineHover")
                    .attr("transform", "translate(" + x(d.time) + "," + height + ")");

                focus.select(".lineHoverDate")
                    .attr("transform",
                        "translate(" + x(d.time) + "," + (height + margin.bottom) + ")")
                    .text(formatDate(d.time));

                focus.selectAll(".hoverCircle")
                    .attr("cy", e => y(d[e]))
                    .attr("cx", x(d.time));

                focus.selectAll(".lineHoverText")
                    .attr("transform",
                        "translate(" + (x(d.time)) + "," + height / 2.5 + ")")
                    .text(e => e + " " + d[e]);

                x(d.date) > (width - width / 4)
                    ? focus.selectAll("text.lineHoverText")
                        .attr("text-anchor", "end")
                        .attr("dx", -10)
                    : focus.selectAll("text.lineHoverText")
                        .attr("text-anchor", "start")
                        .attr("dx", 10)
            }
        }

        tooltip(keys)
    });
}

d3.csv('all_codes.csv').then(errorCodes => {
    // add the options to the button
    d3.select("#selectButton")
        .selectAll('myOptions')
            .data(errorCodes.map(e => e.code))
        .enter()
            .append('option')
        .text(function (d) { return d; }) // text showed in the menu
        .attr("value", function (d) { return d; }) // corresponding value returned by the button

    // When the button is changed, run the updateChart function
    d3.select("#selectButton").on("change", function(d) {
        // recover the option that has been chosen
        var selectedOption = d3.select(this).property("value")
            // run the updateChart function with this selected option
            updateChart(selectedOption)
        });

    updateChart(d3.select("#selectButton").property("value"));
});