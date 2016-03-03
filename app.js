// rewrite code functionally, using es6, with modularity, with error checking

'use strict';

var amazon = require('amazon-product-api');
var cheerio = require('cheerio');
var express = require('express');
var request = require('request');

// set up env variables for 'development mode'
require('dotenv').config();

var app = express();

var client = amazon.createClient({
  awsId: process.env.awsIdENV,
  awsSecret: process.env.awsSecretENV,
  awsTag: process.env.awsTagENV
});

// any failure in subfunctions will result in skipping that review/comment/item
app.get('/', function (req, res) {
  client.itemSearch({
    keywords: 'headphones',
    responseGroup: 'ItemIds'
  }).then(function(results){
    var parsedData = parseItems(results);
    //res.send(parsedData);
  }).catch(function(err){
    res.send(err);
  });

  // would iterate through each item
  function parseItems(data) {
    var parsedItems = parseItem(data[1]); //would be a map for each item, not just one
    //return parsedItems;
  }

  // would also check for has comments first
  // needs async to wait for all comments to load
  function parseItem(item) {
    var parsedComments = getComments(item.ASIN, 1);
    //return parsedComments;
  }

// variable global for the aggregate values
  var dictionary = {};

  //eventually needs callback and error checking
  function getComments(asinNum, page) {
    var amazonUrl = `http://www.amazon.com/product-reviews/${asinNum}/ref=cm_cr_arp_d_viewopt_srt?ie=UTF8&showViewpoints=${page}&sortBy=helpful&pageNumber=${page}`;
    request(amazonUrl, (err, resp, body) => {
        var comments = [];

        if (err) {
          return res.send(err);
        }

        if (resp.statusCode === 200) {
          var $ = cheerio.load(body);

          $('.a-section.review').each((index, element) => {
            comments.push($(element).find(".a-size-base.review-text").text());
          });

          var setimentedComments = comments.map(function(comment, index) {
            return getSentiment(comment, index);
          });

          var sortedDict = [];
          for (var word in dictionary)
                sortedDict.push([word, dictionary[word]])
          sortedDict.sort(function(a, b) {return b[1] - a[1]});

          res.send(setimentedComments.concat([sortedDict]));
        }

        //callback(null, comments);
      });
  }

  function getSentiment(text, index) {
    var searchStr = 'comfort';
    var searchMatchCounter = text.match(new RegExp(searchStr, "gi"));
    var textNoPuctuation = text.replace(/[.,'\/#!$%\^&\*;:{}=\-_`~()]/g," ");
    textNoPuctuation.split(' ').forEach(function(val){
      if (dictionary[val]) dictionary[val]++; // incremented instance
      else dictionary[val] = 1; // initial instance
    });
    return {commentNum:(`#${index+1}`), text:text,
            count: (searchMatchCounter ? searchMatchCounter.length : 0)};
  }

});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
