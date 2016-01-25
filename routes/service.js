var express = require('express');
var router = express.Router();
var handler_efdi = require('../handlers/handler-efdi');

//explicitly called interface types
router.use('/efdi', handler_efdi);

module.exports = router;
