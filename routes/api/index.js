'use strict';

var express = require('express');

var reviews = require('./amazonCustomerReviews');

var router = express.Router();

router.use('/reviews', reviews);

module.exports = router;
