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

// GET /api/reviews/product/<by id>
router.get('/product/:id', (req, res, next) => {
  Product.findById(req.params.id, function (err, productFound) {
      res.status(err ? 400 : 200).send(err || productFound);
    });
});

// POST /api/reviews/getProductsTop100FromUrl/
router.post('/getProductsTop100FromUrl/', (req, res, next) => {
  makeProductsFromTop100HeadUrl(req.body.url, req.body.categoryName, function (err, newCategory) {
    if (err) return res.status(400).send(err);
    res.status(200).send(newCategory);
  });
});

function makeProductsFromTop100HeadUrl(url, categoryName, completionCallback) {
  findChildUrlsFromHeadUrl(url, function (err, childUrlLinks) {
    if (err) return completionCallback(err, null);

    async.map(childUrlLinks, get20ProductsSinglePage, (err, arrOfProductIds) => {
      var top100ProductsCards = _.flatten(arrOfProductIds);

      Category.create({
        name: categoryName,
        products: top100ProductsCards,
      }, function (err, newCategory) {
        if (err) return completionCallback(err, null);
        completionCallback(null, newCategory);
      });
    });
  });
}

function findChildUrlsFromHeadUrl(url, completionCallback) {
  request(url, (err, resp, body) => {
    if (err) completionCallback('Request Fail', null);

    if (resp.statusCode === 200) {
      var $ = cheerio.load(body);
      var headUrl = $('.zg_page.zg_selected a').attr('href');
      var baseUrl = headUrl.replace('pg=1', 'pg=');

      const numberOfProductsPerPage = 20;
      const numberOfProducts = 100;
      const numberOfPages = numberOfProducts / numberOfProductsPerPage;
      var pagesArray = _.range(1, numberOfPages + 1);
      var childUrlLinks = pagesArray.map(function (pageNumber) {
        return `${baseUrl}${pageNumber}`;
      });

      completionCallback(null, childUrlLinks);
    } else {
      completionCallback('Child Url Error', null);
    }
  });
}

function get20ProductsSinglePage(url, completionCallback) {
  request(url, (err, resp, body) => {
    if (err) completionCallback('Request Fail', null);

    if (resp.statusCode === 200) {
      var $ = cheerio.load(body);
      var productCardsData = parseProductsFromDom($, function (err, productsDataArr) {
        if (err) return completionCallback(err, null);
        console.log('product creation step');

        // Future error checking: check if it has price, feature etc. ie. final check
        // Before product creation in mongoose
        async.map(productsDataArr, productCreation, (err, productIds) => {
          if (err) return completionCallback(err, null);
          completionCallback(null, productIds);
        });
      });
    } else {
      completionCallback('Response Error', null);
    }
  });
}

function productCreation(product, completionCallback) {
  Product.create(product, function (err, newProduct) {
    if (err) return completionCallback(err, null);
    completionCallback(null, newProduct._id);
  });
}

function parseProductsFromDom($, completionCallback) {
  const ASINRegex = RegExp(/\/(\w{10})\//);
  const smallImgRegex = RegExp(/._.*_./);

  var $productCards = $('.zg_itemWrapper');
  var productsDataArr = $productCards.map((index, element) => {
    var $element = $(element);
    var amazonDetailsLink =  $element.find('.zg_title a').attr('href').trim();
    var ASIN = amazonDetailsLink.match(ASINRegex)[1];

    var priceString = $element.find('.zg_price .price').text();

    if (!priceString && $element.find('.zg_price .listprice').text()) {
      priceString = $element.find('.zg_price .listprice').text();
    } else if (!priceString && $element.find('.price').text()) {
      priceString = $element.find('.price').text();
    } else if (!priceString) {
      return `Price Error ${ASIN}`;
    }

    var price = Number(priceString.replace(/[^0-9\.]+/g, ''));

    var abbreviatedTitle = $element.find('.zg_title a').text();

    var smallImgLink = $element.find('.zg_itemImageImmersion a img').attr('src');
    var imageLink = smallImgLink.replace(smallImgRegex, '._SL1500_.');

    var starRatingStr = $element.find('.a-icon.a-icon-star .a-icon-alt').text();
    var starRatingNum = Number(starRatingStr.slice(0, 3));

    var $reviews = $element.find('.zg_reviews').find('.a-size-small .a-link-normal');
    var reviewsLink = $reviews.attr('href');
    var reviewCountStr = $reviews.text();
    var reviewCount = Number(reviewCountStr.replace(/[^0-9]+/g, ''));

    return {
      info: {
        amazonDetailsLink: amazonDetailsLink,
        ASIN: ASIN,
        priceString: priceString,
        price: price,
        abbreviatedTitle: abbreviatedTitle,
        imageLink: imageLink,
        starRatingStr: starRatingStr,
        starRatingNum: starRatingNum,
        reviewsLink: reviewsLink,
        reviewCount: reviewCount,
      },
      reviews: [],
    };
  }).get();

  async.each(productsDataArr, addAmazonApiData, (err) => {
    console.log('finished with amazon api');
    if (err) return completionCallback(err, null);
    completionCallback(null, productsDataArr);
  });
}

function addAmazonApiData(productData, completionCallback) {
  client.itemLookup({
    idType: 'ASIN',
    itemId: productData.info.ASIN,
    responseGroup: 'ItemAttributes,Images',
  }).then(function (productArr) {
    var item = productArr[0];
    productData.info.title = item.ItemAttributes[0].Title[0];
    productData.info.features = item.ItemAttributes[0].Feature;
    productData.info.imgHighRes = item.ImageSets[0].ImageSet[0].HiResImage ?
      item.ImageSets[0].ImageSet[0].HiResImage[0].URL[0] : '';
    completionCallback(null);
  }).catch(function (err) {
    // Amazon API throws way to many errors, future scape the whole thing
    completionCallback(null);
  });
}

module.exports = router;
