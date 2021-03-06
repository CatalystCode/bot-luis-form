var express = require('express');
var builder = require('botbuilder');
var port = process.env.PORT || 3978;
var app = express();

console.log('starting dating bot service');

var dialogs = require('./dialogs');

var connector = new builder.ChatConnector();
var bot = new builder.UniversalBot(connector);

dialogs.bind(bot);
app.post('/api/messages', connector.listen());

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});

