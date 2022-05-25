const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const app = express();
const expressWs =  require('express-ws')(app);

const indexRouter = require('./routes/index');
const wsRouter = require('./routes/ws');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/ws', wsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

if (process.env.PORT && !process.env.TEM_PORT) {
	console.log("WARNING: Setting env-var PORT is deprecated. Use TEM_PORT instead.")
}
const listenPort = process.env.TEM_PORT || process.env.PORT || '3000';
var server = app.listen(listenPort, process.env.TEM_BIND_ADDRESS, function(err) {
	if (err) {
		console.log("Error starting server: " + err)
	} else {
		console.log("Server listening on ", server.address());
		console.log("Change the listening port and/or bind address with the TEM_PORT and TEM_BIND_ADDRESS env-vars.");
	}
})

module.exports.getWsClientCount = function() {
  return expressWs.getWss().clients.size;
};

module.exports.getWsClients = function() {
  return expressWs.getWss().clients;
};
