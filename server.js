'use strict';

var express = require('express');
var mongoose  = require('mongoose');

var api = require('./routes/api');

var app = express();

// set up mongoose database for Heroku or local development
var mongoUrl = process.env.MONGOLAB_URI || 'mongodb://localhost/amazonReviewAPI';
mongoose.connect(mongoUrl, function(err) {
  if(err) {
    console.log("Mongo error: ", err);
  } else {
    console.log(`MongoDB connected to ${mongoUrl}`);
  }
});

app.use('/api', api);

// sentiment analysis below, will port to app backend
/*
    // var amazonUrl = `http://www.amazon.com/product-reviews/${asinNum}/ref=cm_cr_arp_d_viewopt_srt?ie=UTF8&showViewpoints=${page}&sortBy=helpful&pageNumber=${page}`;
    // request(amazonUrl, (err, resp, body) => {
    //     var comments = [];
    //
    //     if (err) {
    //       return res.send(err);
    //     }
    //
    //     if (resp.statusCode === 200) {
    //       var $ = cheerio.load(body);
    //
    //       $('.a-section.review').each((index, element) => {
    //         comments.push($(element).find(".a-size-base.review-text").text());
    //       });
    //
    //       var setimentedComments = comments.map(function(comment, index) {
    //         return getSentiment(comment, index);
    //       });
    //
    //       var sortedDict = [];
    //       for (var word in dictionary)
    //             sortedDict.push([word, dictionary[word]])
    //       sortedDict.sort(function(a, b) {return b[1] - a[1]});
    //
    //       res.send(setimentedComments.concat([sortedDict]));
    //     }
    //callback(null, comments);
    // });
*/

  // function getSentiment(text, index) {
  //   var searchStr = 'comfort';
  //   var searchMatchCounter = text.match(new RegExp(searchStr, "gi"));
  //   var textNoPuctuation = text.replace(/[.,'\/#!$%\^&\*;:{}=\-_`~()]/g," ");
  //   textNoPuctuation.split(' ').forEach(function(val){
  //     if (dictionary[val]) dictionary[val]++; // incremented instance
  //     else dictionary[val] = 1; // initial instance
  //   });
  //   return {commentNum:(`#${index+1}`), text:text,
  //           count: (searchMatchCounter ? searchMatchCounter.length : 0)};
  // }


app.listen(process.env.PORT || 3000, function () {
  console.log('Example app listening on port 3000!');
});
