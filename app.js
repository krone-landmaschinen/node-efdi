var express = require('express');
var path = require('path');
var service = require('./routes/service');

var app = express();

//client
app.use('/client', express.static('./public'));
app.use('/client/FMISExchange.proto', express.static('./handlers/FMISExchange.proto'));
app.use('/client/ISO_DIS_11783-10.proto', express.static('./handlers/ISO_DIS_11783-10.proto'));

//service
app.use('/', service);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
