let graph = {};
let main = function () {


    // let graph = {
    //     "nodes": [
    //         {"id": "1"},
    //         {"id": "2"},
    //         {"id": "3"},
    //         {"id": "4"},
    //         {"id": "5"},
    //         {"id": "6"},
    //         {"id": "7"},
    //     ],
    //     "links": [
    //         {
    //             "source": "1",
    //             "target": "2",
    //             "value": "saveSettings",
    //         },
    //         {
    //             "source": "1",
    //             "target": "3",
    //             "value": "the chronicles of a bionical lyric2",
    //         },
    //         {
    //             "source": "1",
    //             "target": "4",
    //             "value": "the chronicles of a bionical lyric3",
    //
    //         }, {
    //             "source": "3",
    //             "target": "5",
    //         },{
    //             "source": "5",
    //             "target": "6",
    //         },{
    //             "source": "5",
    //             "target": "7",
    //         },
    //         // {
    //         //     "source": "5",
    //         //     "target": "MltaskContextService",
    //         //     "value": "Lyrically splitting dismissing",
    //         // },
    //         // {
    //         //     "source": "MltaskComponent",
    //         //     "target": "MltaskContextService",
    //         //     "value": "I'm on a mission of just hitting",
    //         //     "reltype": "GENEALOGYNEXT"
    //         // },
    //         // {
    //         //     "source": "MltaskContextService",
    //         //     "target": "3",
    //         //     "value": "testtest",
    //         //     "reltype": "GENEALOGYNEXT"
    //         // }
    //     ]
    // };


    let getNodeLinks = function (node) {
        return graph.links.filter(l => (l.source === node.id || l.target === node.id)).length;

    };
    let node_link_cnt = {};
    for (let n of graph.nodes) {
        node_link_cnt[n.id] = getNodeLinks(n);

    }


    // Feel free to change or delete any of the code you see in this editor!

    let width = window.innerWidth,
        height = window.innerHeight;

    let svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);

    function arcPath(leftHand, d) {
        if (!d) {
            return;
        }
        let siblings = getSiblingLinks(d.source, d.target);
        let siblingCount = siblings.length;
        let currIdx = siblings.indexOf(d.value);

        var x1 = leftHand ? d.source.x : d.target.x,
            y1 = leftHand ? d.source.y : d.target.y,
            x2 = leftHand ? d.target.x : d.source.x,
            y2 = leftHand ? d.target.y : d.source.y,
            dx = x2 - x1,
            dy = y2 - y1,
            dr = Math.sqrt(dx * dx + dy * dy),
            drx = dr,
            dry = dr,
            xRotation = 0,
            largeArc = 0;
        // let leftHand = ;

        let sweep = currIdx % 2 === 0 ? (leftHand ? 1 : 0) : (leftHand ? 0 : 1);
        if (siblingCount > 1) {

            // drx = 40 * currIdx * (1 / siblingCount);
            // dry = 40 * currIdx * (1 / siblingCount);

            drx = drx / (1 + (1 / siblingCount) * currIdx);
            dry = dry / (1 + (1 / siblingCount) * currIdx);
        } else {
            drx = 0;
            dry = 0;
        }

        return `M${x1},${y1}A${drx}, ${dry} ${xRotation}, ${largeArc}, ${sweep} ${x2},${y2}`;
    }


    let getSiblingLinks = function (source, target) {
        let siblings = [];
        for (let i = 0; i < graph.links.length; ++i) {
            if ((graph.links[i].source.id === source.id && graph.links[i].target.id === target.id) || (graph.links[i].source.id === target.id && graph.links[i].target.id === source.id))
                siblings.push(graph.links[i].value);
        }
        return siblings;
    };


    let simulation = d3.forceSimulation()
        .nodes(graph.nodes);

    simulation
        .force("charge_force", d3.forceManyBody().strength(-200))
        .force("center_force", d3.forceCenter(width / 2, height / 2))
        .force("link", d3.forceLink(graph.links).id(d => d.id).distance(d => {
                // getSiblingLinks(d.source, d.target)
                // return Math.max(0.1, 20 / (node_link_cnt[d.source.id] + node_link_cnt[d.target.id]));
            return 50;
                // return Math.sqrt(graph.nodes.length) * 2;
            })
            // .strength(d => {
            //     // getSiblingLinks(d.source, d.target)
            //     // return Math.max(0.1, 20 / (node_link_cnt[d.source.id] + node_link_cnt[d.target.id]));
            //     return 0.1;
            // })
        )
        .force("collide", d3.forceCollide().radius(3));

    simulation
        .on("tick", ticked);

    //add encompassing group for the zoom
    let g = svg.append("g")
        .attr("class", "everything");

    //Create deffinition for the arrow markers showing relationship directions
    g.append("defs").append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 -4 10 10")
        .attr("refX", 16)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-3L7,0L0,3");


    // let path = svg.selectAll("path.link")
    //     .data(graph.links);
    //
    //     path.enter().append("svg:path")
    //         .attr("id", function (d) {
    //             return d.source.id + "-" + d.target.id;
    //         })
    //         .attr("class", "link")
    //         .attr('marker-end', 'url(#arrowhead)');
    //
    //     path.exit().remove();
    //

    //


    // let link = g.append("g")
    //     .attr("class", "links")
    //     .selectAll("line")
    //     .data(graph.links)
    //     .enter().append("line")
    //     .attr("stroke", function (d) {
    //         return d3.color("#000000");
    //     })
    //     .attr("marker-end", "url(#arrow)");


    //add zoom capabilities
    let zoom_handler = d3.zoom()
        .on("zoom", zoom_actions);


    //Drag functions
    //d is the node
    function drag_start(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    //make sure you can't drag the circle outside the box
    function drag_drag(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function drag_end(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    //Zoom functions
    function zoom_actions() {
        g.attr("transform", d3.event.transform)
    }


    //add drag capabilities
    let drag_handler = d3.drag()
        .on("start", drag_start)
        .on("drag", drag_drag)
        .on("end", drag_end);


    let path = g.append("g")
        .attr("class", "links")
        .selectAll("path.link")
        .data(graph.links)
        .enter().append("svg:path")
        .attr("id", d => `${d.source.id}-${d.target.id}-${d.value}`)
        .attr("class", "link")
        .attr("stroke", d => d3.color("#000000"))
        .attr("marker-end", "url(#arrow)");

    let pathInvis = g.append("g")
        .attr("class", "links-invis")
        .selectAll("path.invis")
        .data(graph.links)
        .enter().append("svg:path")
        .attr("id", d => `invis_${d.source.id}-${d.target.id}-${d.value}`)
        .attr("class", "invis");

    pathInvis.exit().remove();

    let pathLabel = g.selectAll(".pathLabel")
        .data(graph.links);

    pathLabel.enter().append("g").append("svg:text")
        .attr("class", "pathLabel")
        .append("svg:textPath")

        .attr("side", "right")
        .attr("startOffset", "50%")
        .attr("text-anchor", "middle")
        .attr("xlink:href", d => `#invis_${d.source.id}-${d.target.id}-${d.value}`)
        // .attr("xlink:href", d => `#${d.source.id}-${d.target.id}-${d.value}`)
        .style("fill", "#cccccc")
        .style("font-size", '0.2em')
        .text(d => d.value);

    let text = g.append("g").attr("class", "labels").selectAll("g")
        .data(graph.nodes)
        .enter().append("g")
        .append("text")
        .attr("x", 0)
        .attr("text-anchor", 'middle')
        // .attr("y", ".31em")
        .attr("y", "1.5em")
        .style("font-family", "sans-serif")
        .style("font-size", "0.2em")
        .text(d => d.id);


    let node = g.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(graph.nodes)
        .enter()
        .append("circle")
        .attr("r", 1)
        .attr("fill", d => {
            if (d.selected) return d3.color("#0000FF");

            return d3.color("#FFFF2F");
        })
        .style("stroke", d => {
            if (d.selected) {
                debugger
            }
            if (d.selected) return d3.color("#000080");

            return d3.color("#FF8D2F");
        });

    node.on("click", d => {
        d3.event.stopImmediatePropagation();
        d.selected = !d.selected;
    });

    node.append("title")
        .text(function (d) {
            return d.id;
        });

    zoom_handler(svg);
    drag_handler(node);


    //-----------------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------------
    //-----------------------------------------------------------------------------------------------------------------------------
    function ticked() {
        //update circle positions each tick of the simulation
        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);


        pathInvis.attr("d", d => arcPath(d.source.x < d.target.x, d));
        path.attr("d", d => arcPath(true, d));
        text
            .attr("transform", function (d) {
                return `translate(${d.x},${d.y})`;
            });

        //update link positions
        // link
        //     .attr("x1", function (d) {
        //         return d.source.x;
        //     })
        //     .attr("y1", function (d) {
        //         return d.source.y;
        //     })
        //     .attr("x2", function (d) {
        //         return d.target.x;
        //     })
        //     .attr("y2", function (d) {
        //         return d.target.y;
        //     });


    }


};

d3.json('nodes.json', e => {
    graph.nodes = e;
    d3.json('edges.json', e => {
        graph.links = e;
        main();
    });
});

