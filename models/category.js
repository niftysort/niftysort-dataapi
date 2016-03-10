'use strict';
// lastupdate: added productID, friday March 4th, 10:43pm

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

		callback(null, graphData); //return an D3 data obj for one category
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
			name: product.info.name,
			x: -product.info.price, // reversed x and y and format price negative
			y: adjustedPerProductScore,
			xR: product.info.price,
			size: 1, // Changed size from 2 to 1
			shape: 'circle'
		}
		return d3Values;
	}
}

Category = mongoose.model('Category', categorySchema);

module.exports = Category;
