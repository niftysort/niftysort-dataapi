'use strict';

var bodyParser = require('body-parser');
var express = require('express');
var logger = require('morgan');
var mongoose  = require('mongoose');

var api = require('./routes/api');

var app = express();

// set up env variables for 'development mode'
require('dotenv').config();

// sets up mongoose database for Heroku or local development
var mongoUrl = process.env.MONGOLAB_URI || 'mongodb://localhost/amazonReviewsAPI';
// var mongoUrl = 'mongodb://localhost/amazonReviewsAPI';

// var mongoUrl = 'mongodb://localhost/amazonReviewsAPI';
mongoose.connect(mongoUrl, function (err) {
  if (err) {
    console.log('Mongo error: ', err);
  } else {
    console.log(`MongoDB connected to ${mongoUrl}`);
  }
});

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/api', api);

app.listen(process.env.PORT || 8000, function () {
  console.log(`DataApi listening on port ${process.env.PORT || 8000}!`);
});
