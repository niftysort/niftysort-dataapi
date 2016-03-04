// need to be massively refactored into multiple files

'use strict';

var amazon = require('amazon-product-api');
var async = require('async');
var cheerio = require('cheerio');
var express = require('express');
var mongoose  = require('mongoose');
var request = require('request');

var Category = require('../../../models/category');
var Product = require('../../../models/product');
// eventually modularize the scrapper
// var reviews = require('../../../lib/scrapers/amazon/reviews');

// set up env variables for 'development mode'
require('dotenv').config();

var router = express.Router();

var client = amazon.createClient({
  awsId: process.env.awsIdENV,
  awsSecret: process.env.awsSecretENV,
  awsTag: process.env.awsTagENV
});

// POST /api/reviews
// any failure in subfunctions will result in skipping that review/comment/item
router.post('/', (req, res, next) => {
  var searchCategory = req.body.category;

  client.itemSearch({
    keywords: searchCategory,
    responseGroup: 'ItemAttributes, OfferSummary'
  }).then(function(items){
    parseItems(items, function(err, results){
      Category.create({
        name: searchCategory,
        products: results
      }, function(err, newCategory) {
        res.status(err ? 400 : 200).send(err || newCategory);
      });
    });
  }).catch(function(err){
    res.status(400).send(err);
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
          name: item['ItemAttributes'][0]['Title'][0],
          price: parseInt(item['OfferSummary'][0]['LowestNewPrice'][0]['Amount'])/100
        }
      };

      getReviewsByASIN(item.ASIN, function(err, reviews){
        itemObj.reviews = !err ? reviews : [];

        Product.create(itemObj, function(err, newProduct) {
          if (err) return completionCallback(null, null);
          completionCallback(null, newProduct._id);
        });
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
      console.log(amazonUrl);
      request(amazonUrl, (err, resp, body) => {
        if (err) callback(err, null); // Passing error up: Amazon API Request Error

        if (resp.statusCode === 200) {
          var $ = cheerio.load(body);
          var amazonReviews = $('.a-section.review');

          //nextPage will be false and terminate loop, when page doesnt not have anymore reviews to scrape
          // nextPage = amazonReviews.length;
          nextPage = (pageCount < 10);

          // needs massive error checking or try catch or both
          amazonReviews.each((index, element) => {
            reviewsObj.push({
              title: $(element).find(".review-title").text(),
              text: $(element).find(".review-text").text(),
              stars: parseInt(($(element).find(".a-icon.a-icon-star").attr('class')).match(/a-star-(\d)/)[1]),
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

// GET /api/reviews/
// FIXME: eventually make multiple attributes input acceptable
router.get('/:categoryId/:attributes', (req, res, next) => {
  var categoryId = req.params.categoryId;
  var attributes = req.params.attributes;

  Category.getD3DataByAttribute(categoryId, attributes, function(err, D3FormatedData) {
    res.status(err ? 400 : 200).send(err || D3FormatedData)
  });
})


module.exports = router;
