var debug = require('debug')('service');
var express = require('express');
var handlerEfdi = require('../handlers/handler-efdi');
//var efdiHttpAdapter = require('../handlers/efdi-http-adapter')(handlerEfdi);
var handler_log = require('../handlers/handler-log');
var debug = require('debug')('node-efdi:service');


//router.use('/log', handler_log);

/**
 * generates the response message for the incoming msg.
 * 
 * @param FMISMessage msg
 * @param res
 */
var generateResponse = function(msg) {

	var FMISExchange = handlerEfdi.FMISExchange;
	var responseMsg = null;
	switch (msg.packetType) {
		case FMISExchange.FMISMessageType.PING:
			responseMsg = handlerEfdi.createNewMessage();
			responseMsg.set_seq(msg.seq);
			responseMsg.packetType = msg.packetType;
			break;
		case FMISExchange.FMISMessageType.REQ_CAPABILITY:
			responseMsg = handlerEfdi.createNewMessage();
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
			break;
		default:
			throw new Error('Packet type ' + msg.packetType + ' not implemented.');
			break;
	}
	
	
	return responseMsg;
}

//request response
var receiveMessage = function(msg) {
	debug('message receiver got msg: ' + msg);
	
	try {
		var responseMsg = generateResponse(msg);//, res);
	} catch (e) {
		debug('Exception while encoding efdi response: ' + e);
		debug(msg);
		
		//res.status(500);
		//res.send("exception " + e);
		//return;
	}
	
	//res.type('application/octet-stream');
	if (responseMsg != null) {
		debug('response ' + responseMsg.encodeJSON());
		
		//outputQueue.push(msg);
		return msg;
	}
	else {
		debug('no responseMsg given for messageQueue');
	}
	
	//res.end();
};

var handleMessageQueues = function(inputQueue, receiveHandler, outputQueue, sendHandler) {
	if (inputQueue instanceof Array) {
		while (item = inputQueue.shift()) {

			var msg = receiveHandler(item);
			if (msg !== null) {
				outputQueue.push(msg);
			}

		};
	}
	if (outputQueue instanceof Array) {
		while (item = outputQueue.shift()) {

			sendHandler(item);

		};
	}
	//debug('messageQueue items=' + outputQueue.length);
}



handleWebsocketService = function(ws, req) {
	/*
	//websocket service
	wss.on('connection', function connection(ws) {
	  var location = url.parse(ws.upgradeReq.url, true);
	  // you might use location.query.access_token to authenticate or share sessions 
	  // or ws.upgradeReq.headers.cookie (see http://stackoverflow.com/a/16395220/151312) 
*/
	console.log('service new ws');
	if (req.session === undefined) {
		console.log('service ws has no session');
	}
	else {
		console.log('service has session=', req.session);
	}
	ws.on('message', function incoming(buffer) {
		if (ws.session === undefined) {//TODO should be created by real session handling
			ws.session = {};
		}
		if (ws.session.outputQueue == undefined) {
			ws.session.outputQueue = new Array();
		}
		if (ws.session.inputQueue == undefined) {
			ws.session.inputQueue = new Array();
		}
		var message = new handlerEfdi.FMISExchange.FMISMessage.decode(buffer);
		console.log('service received: %s', message);
		ws.session.inputQueue.push(message);
		//receiveMessage(message, ws.session.outputQueue);
		//ws.send(message);
		handleMessageQueues(
			ws.session.inputQueue,
			function(msg) {
				var responseMsg = null;
				try {
					responseMsg = generateResponse(msg);//, res);
				} catch (e) {
					debug('Exception while encoding efdi response: ' + e);
					debug(msg);
				}
				return responseMsg;
			},
			ws.session.outputQueue,
			function(msg) {
				ws.send(msg.toBuffer());
			}
		);
	});

//	});

}


var service = {
	httpRouter: null,
	useWss: handleWebsocketService
}

/**
 * {express.Application} app
 */
module.exports = function(app) {
	
	var router = express.Router();
	
	//http request-response route
	//router.use( 
		//efdiHttpAdapter.handleHttpRequest(handleMessageQueues), 
		//efdiHttpAdapter.handleHttpResponse
	//);
	
	service.httpRouter = router;
	
	return service;
}
