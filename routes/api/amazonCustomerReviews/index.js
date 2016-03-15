// need to be massively refactored into multiple files

'use strict';

var amazon = require('amazon-product-api');
var async = require('async');
var cheerio = require('cheerio');
var express = require('express');
var _ = require('lodash');
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
  awsTag: process.env.awsTagENV,
});

// global variable to be refactored
var categoryToAdd;
var itemsAddedCount = 0;

// GET /api/reviews/department/:departmentName
router.get('/findDepartment/:departmentName', (req, res, next) => {
  client.itemSearch({
    keywords: req.params.departmentName,
    responseGroup: 'BrowseNodes',
  }).then(function (products) {
    var departmentsDictionary = {};

    var test = products.forEach(function (val) {
      var browseNodeHead = val.BrowseNodes[0].BrowseNode[0];
      recursiveParseDepartmentsNodelist(browseNodeHead, departmentsDictionary);
    });

    res.status(200).send(departmentsDictionary);
  }).catch(function (err) {
    res.status(400).send(err);
  });
});

// Possible refactoring to avoid double if statements
function recursiveParseDepartmentsNodelist(browseNodeObj, departmentsDictionary) {
  var browseNodeId = browseNodeObj.BrowseNodeId;
  var browseNodeName = browseNodeObj.Name;
  if (departmentsDictionary[browseNodeName]) {
    departmentsDictionary[browseNodeName].count++;
  } else {
    departmentsDictionary[browseNodeName] = {
      id: browseNodeId,
      count: 1,
    };
  }

  if (browseNodeObj.Ancestors) {
    var browseNodeHead = browseNodeObj.Ancestors[0].BrowseNode[0];
    recursiveParseDepartmentsNodelist(browseNodeHead, departmentsDictionary);
  }

  if (browseNodeObj.Children) {
    var browseNodeHead = browseNodeObj.Children[0].BrowseNode[0];
    recursiveParseDepartmentsNodelist(browseNodeHead, departmentsDictionary);
  }
}

// GET /api/reviews/top100ByDepartment/:browseNodeId
router.get('/top100ByDepartment/:browseNodeId', (req, res, next) => {
  client.browseNodeLookup({
    browseNodeId: req.params.browseNodeId,
    responseGroup: 'TopSellers',
  }).then(function (top10) {
    addTop100Products(top10, function (err, productsAdded) {
      res.status(200).send(productsAdded);
    });
  }).catch(function (err) {
    res.status(400).send(err);
  });
});

function addTop100Products(top10, completionCallback) {
  var bestProductUrl = top10[0].TopItemSet[0].TopItem[0].DetailPageURL[0];
  findTop100ASINS(bestProductUrl, function (err, top100ASINs) {
    if (err) {
      return completionCallback(err, null);
    } else {
      return completionCallback(null, top100ASINs);
    }
  });
}

function findTop100ASINS(bestProductUrl, completionCallback) {
  console.log('bestProductUrl: ', bestProductUrl);
  request(bestProductUrl, (err, resp, body) => {
    if (err) completionCallback('Request Fail', null);

    if (resp.statusCode === 200) {
      var $ = cheerio.load(body);
      var top100Href = $('.badge-link').attr('href');
      var top100Url = `http://www.amazon.com/${top100Href}`;

      completionCallback(null, top100Url);
    } else {
      completionCallback('Response Error', null);
    }
  });
}

// POST /api/reviews
// any failure in subfunctions will result in skipping that review/comment/item
router.post('/', (req, res, next) => {
  categoryToAdd = req.body.category;
  var numberOfPages = 1;
  parsePagesOfProducts(numberOfPages, function (err, allProducts) {
    if (err) return res.status(400).send(err);

    res.send(`Products added: ${itemsAddedCount}`);

    // var flattenedArrayOfProducts = _.flatten(allProducts);
    // var arrayOfProductsNullsRemoved = flattenedArrayOfProducts.filter(function (val) {
    //   return val;
    // });
    //
    // Category.create({
    //   name: categoryToAdd,
    //   products: arrayOfProductsNullsRemoved,
    // }, function (err, newCategory) {
    //   res.status(err ? 400 : 200).send(err || newCategory);
    // });
  });
});

function parsePagesOfProducts(pages, completionCallback) {
  var arrayOfPages = _.range(1, pages + 1);
  async.map(arrayOfPages, getPageOfProducts, completionCallback);
}

function getPageOfProducts(page, completionCallback) {
  client.itemSearch({
    keywords: categoryToAdd,
    responseGroup: 'ItemAttributes, OfferSummary, Images',
    ItemPage: page,
  }).then(function (items) {
    parseItems(items, function (err, allProductIds) {
      if (err) {
        return completionCallback(err, null);
      }

      // Removes nulls
      var productIds = allProductIds.filter(function (val) {
        return val;
      });

      completionCallback(null, allProductIds);
    });
  });
}

function parseItems(items, completionCallback) {
  async.map(items, parseItem, completionCallback);
}

// throw in a massive try catch and skip on errors/no data present
// also could use better error checking
function parseItem(item, completionCallback) {
  try {
    var itemObj = {
      info: {
        name: item.ItemAttributes[0].Title[0],
        price: item.OfferSummary[0].LowestNewPrice ?
              parseInt(item.OfferSummary[0].LowestNewPrice[0].Amount) / 100 :
              parseInt(item.OfferSummary[0].LowestUsedPrice[0].Amount) / 100,
        features: item.ItemAttributes[0].Feature,
        imgLarge: item.ImageSets[0].ImageSet[0].LargeImage ?
                  item.ImageSets[0].ImageSet[0].LargeImage[0].URL : '',
        imgHighRes: item.ImageSets[0].ImageSet[0].HiResImage ?
            item.ImageSets[0].ImageSet[0].HiResImage[0].URL : '',
      },
      categoryName: categoryToAdd,
    };
    getReviewsByASIN(item.ASIN, function (err, reviews) {
      if (err) {
        console.log(err);
        completionCallback(err, null);
      }

      itemObj.reviews = !err ? reviews : null;

      if (itemObj.reviews && itemObj.info.price) {
        Product.create(itemObj, function (err, newProduct) {
          if (err) return completionCallback(err, null);
          console.log('added product, itemsAddedCount: ' + (++itemsAddedCount));
          completionCallback(null, newProduct._id);
        });
      } else {
        completionCallback(null, null);
      }
    });
  }
  catch (err) {
    completionCallback(null, null); // parse error case
  };
}

//eventually needs callback and error checking
function getReviewsByASIN(asinNum, completionCallback) {
  // intial values
  var nextPage = true;
  var pageCount = 1;
  var reviewsObj = [];

  // whilst(test, fn, callback)
  async.whilst(function () {return nextPage;}, getPageOfReviews, completionCallback);

  function getPageOfReviews(callback) {
    var amazonUrl = `http://www.amazon.com/product-reviews/${asinNum}/` +
    `&sortBy=helpful/paging_btm_${pageCount}?pageNumber=${pageCount}`;

    console. log(amazonUrl);
    request(amazonUrl, (err, resp, body) => {
      if (err) callback('Request Fail', null); // Passing error up: Amazon API Request Error

      if (resp.statusCode === 200) {
        var $ = cheerio.load(body);
        var $amazonReviews = $('.a-section.review');

        //nextPage === false and terminate loop, when page doesnt not have anymore reviews to scrape
        // nextPage = $amazonReviews.length;
        if (pageCount >= 1) {
          console.log('pageCount ', pageCount);
          nextPage = false;
        }

        if (!nextPage) console.log('no next page: ', amazonUrl);

        // needs massive error checking or try catch or both
        var counter = 0;
        $amazonReviews.each((index, element) => {
          var starClass = $(element).find('.a-icon.a-icon-star').attr('class');
          reviewsObj.push({
            title: $(element).find('.review-title').text(),
            text: $(element).find('.review-text').text(),
            stars: parseInt((starClass).match(/a-star-(\d)/)[1]),
            helpful: $(element).find('.review-votes').text(),
          });
        });
        pageCount++;
        callback(null, reviewsObj);
      } else {
        console.log('parse reviews fail');
        callback('Review Parse Fail' + amazonUrl, null);
      }
    });
  }
};

// GET /api/reviews/product/<by id>
router.get('/product/:id', (req, res, next) => {
  Product.findById(req.params.id, function (err, productFound) {
    res.status(err ? 400 : 200).send(err || productFound);
  });
});

// GET /api/reviews/products/<by category name>
router.get('/products/:categoryName', (req, res, next) => {
  Product.getProductsByCategory(req.params.categoryName, null,  function (err, productsByCategory) {
    res.status(err ? 400 : 200).send(err || productsByCategory);
  });
});

module.exports = router;
