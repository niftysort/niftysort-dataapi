'use strict';

var mongoose  = require('mongoose');

var Product;

/* expands this to reflect model:
  info: {
    name: String
    price: Number
		features: Array of Strings
  },
  reviews: [
    {
      // review data
    }
  ]
*/
var productSchema = mongoose.Schema({
  categoryName: String,
  info: {},
  reviews: [],
});

productSchema.statics.getProductsByCategory = function (categoryName, attribute, callback) {
  Product.find({ categoryName: categoryName }, function (err, productsByCategory) {
    if (err) {
      return callback('Mongoose Find Error', null);
    }

    callback(null, productsByCategory);
  });
};

Product = mongoose.model('Product', productSchema);

module.exports = Product;
