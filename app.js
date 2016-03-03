// rewrite code functionally, using es6, with modularity, with error checking
// emphasis on error checking

'use strict';

var amazon = require('amazon-product-api');
var async = require('async');
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
    keywords: 'Harry Potter',
    responseGroup: 'ItemAttributes, OfferSummary'
  }).then(function(items){
    // res.send(items);
    parseItems([items[1]], function(err, results){
      res.status(err ? 400 : 200).send(err || results);
    });
  }).catch(function(err){
    res.send(err);
  });

  function parseItems(items, completionCallback) {
    async.map(items, parseItem, completionCallback);
  }

  // throw in a massive try catch and skip on errors/no data present
  // also could use better error checking
  function parseItem(item, completionCallback) {
    try {
      var itemObj = {
        info: {
          name: item['ItemAttributes'][0]['Title'],
          price: parseInt(item['OfferSummary'][0]['LowestNewPrice'][0]['Amount'])/100
        }
      };

      getReviewsByASIN(item.ASIN, function(err, reviews){
        itemObj.reviews = !err ? reviews : [];
        completionCallback(null, itemObj);
      });
    }
    catch (err) {
      completionCallback(null, null); // error case
    };
  }

  // variable global for the aggregate values
  var dictionary = {};

  //eventually needs callback and error checking
  function getReviewsByASIN(asinNum, completionCallback) {
    // intial values
    var nextPage = true;
    var pageCount = 1;
    var reviewsObj = [];

    // whilst(test, fn, callback)
    async.whilst(function() {return nextPage}, getPageOfReviews, completionCallback);

    function getPageOfReviews(callback) {
      var amazonUrl = `http://www.amazon.com/product-reviews/${asinNum}/ref=cm_cr_arp_d_viewopt_srt?ie=UTF8&showViewpoints=${pageCount}&sortBy=helpful&pageNumber=${pageCount}`;
      request(amazonUrl, (err, resp, body) => {
        if (err) callback(err, null); // Passing error up: Amazon API Request Error

        if (resp.statusCode === 200) {
          var $ = cheerio.load(body);
          var amazonReviews = $('.a-section.review');

          //nextPage will be false and terminate loop, when page doesnt not have anymore reviews to scrape
          // nextPage = amazonReviews.length;
          nextPage = (pageCount < 5);

          // needs massive error checking or try catch or both
          amazonReviews.each((index, element) => {
            reviewsObj.push({
              title: $(element).find(".review-title").text(),
              text: $(element).find(".review-text").text(),
              stars: ($(element).find(".a-icon.a-icon-star").attr('class')).match(/a-star-(\d)/)[1],
              helpful: $(element).find(".review-votes").text()
            });
          });

          pageCount++;
          callback(null, reviewsObj.concat(reviewsObj.length));
        }
      });
    }
  }

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
