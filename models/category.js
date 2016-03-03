'use strict';

var mongoose  = require('mongoose');

var Category;

var categorySchema = mongoose.Schema({
	name: String,
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  keywords: [String]
});

// FIXME: eventually make multiple attributes input acceptable
categorySchema.statics.getD3DataByAttribute = function(categoryId, attribute, callback) {
	Category.findById(categoryId, function(err, category) {
		if (err || !category) return callback(err || 'No Category Found', null); // error handling for Category not found

		var graphData = {
			key: category.name,
			values: category.products.map(getD3Values)
		};

		callback(null, [graphData]); // FIXME: D3 requires an ARRAY, refactor
	}).populate('products');

	function getD3Values(product) {
		var totalReviews = product.reviews.length;
		var aggregateAttributeScore = product.reviews.reduce(function(weightedAttributeCounter, review) {
			var attributeMatchCount = review.text.match(new RegExp(attribute, "gi"));
			var attributeWeightedScore = (attributeMatchCount ? attributeMatchCount.length : 0) * review.stars;
			return weightedAttributeCounter += attributeWeightedScore;
		},0);
		var adjustedPerProductScore = aggregateAttributeScore/totalReviews;

		var d3Values = {
			x: adjustedPerProductScore,
			y: product.info.price,
			size: 2,
			shape: 'circle'
		}
		return d3Values;
	}

  //   var searchMatchCounter = text.match(new RegExp(attributes, "gi"));
  //   var textNoPuctuation = text.replace(/[.,'\/#!$%\^&\*;:{}=\-_`~()]/g," ");
  //   textNoPuctuation.split(' ').forEach(function(val){
  //     if (dictionary[val]) dictionary[val]++; // incremented instance
  //     else dictionary[val] = 1; // initial instance
  //   });
  //   return {commentNum:(`#${index+1}`), text:text,
  //           count: (searchMatchCounter ? searchMatchCounter.length : 0)};
  // }
}

var Category = mongoose.model('Category', categorySchema);

module.exports = Category;
