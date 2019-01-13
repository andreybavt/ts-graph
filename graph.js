const fs = require("fs");
const express = require('express');
const app = express();
app.use(express.static('.'));

app.get('/nodes.json', function (req, res) {
    res.send(fs.readFileSync("dist/nodes_d3.json"))
});
app.get('/edges.json', function (req, res) {
    res.send(fs.readFileSync("dist/edges_d3.json"))
});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!')
});
