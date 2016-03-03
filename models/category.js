'use strict';

var mongoose  = require('mongoose');

var Category;

var categorySchema = mongoose.Schema({
	name: String,
  items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  keywords: [String]
});

var Category = mongoose.model('Category', categorySchema);

module.exports = Category;
