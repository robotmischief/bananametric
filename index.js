//initial setup
const { request, response } = require('express');
const express = require('express');
const app = express();
const port = process.env.PORT  || 3000;
app.listen(port, () => console.log('listening to port ', port));

const apiTilesKey = process.env.API_TILE_KEY;
console.log(apiTilesKey);
//static content
app.use(express.static('public'));

