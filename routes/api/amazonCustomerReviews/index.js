'use strict';

var amazon = require('amazon-product-api');
var async = require('async');
var cheerio = require('cheerio');
var request = require('request');

var express = require('express');

// eventually modularize the scrapper
// var reviews = require('../../../lib/scrapers/amazon/reviews');

var router = express.Router();

// set up env variables for 'development mode'
require('dotenv').config();

var client = amazon.createClient({
  awsId: process.env.awsIdENV,
  awsSecret: process.env.awsSecretENV,
  awsTag: process.env.awsTagENV
});

// GET /api/reviews
// any failure in subfunctions will result in skipping that review/comment/item
router.get('/', (req, res, next) => {
  client.itemSearch({
    keywords: 'headphones',
    responseGroup: 'ItemAttributes, OfferSummary'
  }).then(function(items){
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
      console.log('amazonUrl: ' + amazonUrl);
      request(amazonUrl, (err, resp, body) => {
        if (err) callback(err, null); // Passing error up: Amazon API Request Error

        if (resp.statusCode === 200) {
          var $ = cheerio.load(body);
          var amazonReviews = $('.a-section.review');

          //nextPage will be false and terminate loop, when page doesnt not have anymore reviews to scrape
          // nextPage = amazonReviews.length;
          nextPage = (pageCount < 1);

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
          callback(null, reviewsObj);
        }
      });
    }
  };
});

module.exports = router;
