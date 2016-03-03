'use strict';

var mongoose  = require('mongoose');

var Product;

/* expands this to reflect model:
  info: {
    name:
    price
  },
  reviews: [
    {
      // review data
    }
  ]
*/
var productSchema = mongoose.Schema({
	info: {},
  reviews: []
});

var Product = mongoose.model('Product', productSchema);

module.exports = Product;
