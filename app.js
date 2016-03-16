var express = require('express');
var debug = require('debug')('node-efdi:app');
var path = require('path');
var app = express();
var expressSession = require('express-session');
var cookieParser = require('cookie-parser');
var uuid = require('node-uuid');
var MemoryStore = expressSession.MemoryStore;
var store = new MemoryStore();


//websocket server setup
var server = require('http').createServer(app);
var expressWs = require('express-ws')(app, server);
app.server = server;//server is needed in bin/www script

//var service = require('./routes/service')(app);

//session setup
app.use(cookieParser());
app.use(expressSession({
	store: store,
	secret: 'sadiojwen',
	resave: false,
	saveUninitialized: true,
	genid: function(req) {
		var id = uuid.v4();
		debug('new sessionID created ' + id);
		return id;
	}
}));



var handlerEfdi = require('./handlers/handler-efdi');
var FMISExchange = handlerEfdi.FMISExchange;

//service for FMISMessage requests
app.use(
	'/service/efdi',

	//handle request
	function (req, res, next) {

		//get the binary content
		var buffers = [];

		req.on('data', function(chunk) {
			buffers.push(chunk);
		});
		req.on('end', function() {
			var buffer = handlerEfdi.ByteBuffer.concat(buffers);
			buffer.ensureCapacity(buffer.capacity() + 1);

			//parse buffer
			var msg = null;
			try {
				msg = new handlerEfdi.FMISExchange.FMISMessage.decode(buffer);
			} catch (e) {
				debug('Exception while decoding efdi request: ' + e);
			}
			
			req.efdiMsg = msg;
			next();
			
		});
	},

	//handle efdi message
	function(req, res, next) {
		var err = null;
		try {
			res.efdiMsg = handlerEfdi.handleMessage(req.efdiMsg);
		}
		catch (e) {
			next(e);
		}
		next();
	},

	//handle response
	function(req, res, next) {

		if (res.efdiMsg) {
			res.send(res.efdiMsg.toBuffer());
		}
		else {
			var err = new Error('response message could not be created');
			err.status = 500;
			next(err);
		}
	}
);



app.ws('/', 
function(ws, req) {

	var incomingMessageListener = function(buffer) {

		//decode message
		var msg = null;

		try {
			msg = new handlerEfdi.FMISExchange.FMISMessage.decode(buffer);
			handlerEfdi.handleMessage(msg);

		} catch (e) {
			debug('Exception while decoding efdi request: ' + e);
		}

	}

	
	var outgoingMessageListener = function(msg) {
		ws.send(msg.toBuffer());
	}

	ws.on('message', incomingMessageListener);

	handlerEfdi.on('messageOut', outgoingMessageListener);

	ws.on('close', function close() {
		handlerEfdi.removeListener('messageOut', outgoingMessageListener);
	});
});

app.ws('/service/log', 
function(ws, req) {

	debug('service/log opened');
	ws.on('message', function incoming(buffer) {
		//currently nothing to do here
	});


	var messageListener = function(msg) {
		debug('sending message to ws log');
		ws.send(JSON.stringify(msg));
	}


	ws.on('close', function close() {
		handlerEfdi.removeListener('message', messageListener);
	});


	handlerEfdi.on('message', messageListener);
});

//handle incoming messages
handlerEfdi.on('message', function(msg) {
	debug('message received');
});
handlerEfdi.on('message.packetType.'+handlerEfdi.FMISExchange.FMISMessageType.PING, function(msg, messageReceiver) {
	debug('new PING message');
	var responseMsg = handlerEfdi.createNewMessage();
	responseMsg.set_seq(msg.seq);
	responseMsg.packetType = msg.packetType;
	messageReceiver(responseMsg);
});

handlerEfdi.on('message.packetType.'+handlerEfdi.FMISExchange.FMISMessageType.REQ_CAPABILITY, function(msg, messageReceiver) {
	debug('new REQ_CAPABILITY message');
	var responseMsg = handlerEfdi.createNewMessage();
	responseMsg.seq = msg.seq;
	responseMsg.packetType = FMISExchange.FMISMessageType.RES_CAPABILITY;
	var capResponse = new FMISExchange.CAPResponse();
	capResponse.add('supportedCap', FMISExchange.FMISMessageType.PING);//just to show different ways to set a field value
	capResponse.supportedCap.push(FMISExchange.FMISMessageType.REQ_CAPABILITY);
	capResponse.supportedCap.push(FMISExchange.FMISMessageType.RES_CAPABILITY);
	capResponse.supportedCap.push(FMISExchange.FMISMessageType.RES_LIVE);
	capResponse.supportedCap.push(FMISExchange.FMISMessageType.REQ_LIVE);
	capResponse.supportedCap.push(FMISExchange.FMISMessageType.ACK_LIVE);
	capResponse.supportedCap.push(FMISExchange.FMISMessageType.PUSH_LIVE);
	responseMsg.set_capabilities_response(capResponse);

	messageReceiver(responseMsg);
});

handlerEfdi.on('message.packetType.'+handlerEfdi.FMISExchange.FMISMessageType.PUSH_LIVE, function(msg, messageReceiver) {
	debug('new PUSH_LIVE message');

	var responseMsg = handlerEfdi.createNewMessage();
	responseMsg.seq = msg.seq;
	responseMsg.packetType = FMISExchange.FMISMessageType.RES_LIVE;

	messageReceiver(responseMsg);
});

handlerEfdi.on('message.packetType.'+handlerEfdi.FMISExchange.FMISMessageType.REQ_DEVICE, function(msg, messageReceiver) {
	debug('new REQ_DEVICE message');

	var responseMsg = handlerEfdi.createNewMessage();
	responseMsg.seq = msg.seq;
	responseMsg.packetType = FMISExchange.FMISMessageType.RES_DEVICE;
	
	messageReceiver(responseMsg);
});


//test client
app.use('/gui', express.static('./public'));
app.use('/gui/FMISExchange.proto', express.static('./handlers/FMISExchange.proto'));
app.use('/gui/ISO_DIS_11783-10.proto', express.static('./handlers/ISO_DIS_11783-10.proto'));
app.use('/gui/google/protobuf/any.proto', express.static('./handlers/google/protobuf/any.proto'));


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
    res.send('error ' + err.message + err);
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.send('error ' + err.message);
});


module.exports = app;
