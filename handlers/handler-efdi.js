'use strict';
var util = require('util');
var pjson = require(__dirname + '/../package.json');
var debug = require('debug')('node-efdi:handler-efdi');
var ProtoBuf = require("protobufjs");
var ByteBuffer = ProtoBuf.ByteBuffer;
var builder = ProtoBuf.newBuilder();
var FMISExchange = null;




//init protobuf builder
var fs = require('fs');
var data = fs.readFileSync(__dirname + '/ISO_DIS_11783-10.proto').toString();
ProtoBuf.loadProto(data, builder, __dirname + "/ISO_DIS_11783-10.proto");
data = fs.readFileSync(__dirname + '/google/protobuf/any.proto').toString();
ProtoBuf.loadProto(data, builder, __dirname + "/google/protobuf/any.proto");
data = fs.readFileSync(__dirname + '/FMISExchange.proto').toString();
ProtoBuf.loadProto(data, builder, __dirname + "/FMISExchange.proto");
FMISExchange = builder.build("FMISExchange");


//class HandlerEfdi
var EventEmitter = require('events');

//class HandlerEfdi extends EventEmitter {}

function HandlerEfdi() {
	/*
	 * TODO the message queue for response message; currently there is only one queue for the whole
	 * handler; this must be handled in context of each session.
	 */
	this.responseMessages = [];

}

util.inherits(HandlerEfdi, EventEmitter);

//HandlerEfdi.prototype.responseMessages = [];

/**
 * creates an FMISMessage object with initial field values
 * 
 *  @return {FMISMessage} msg
 */
HandlerEfdi.prototype.createNewMessage = function () {
	var msg = new FMISExchange.FMISMessage();
	msg.set_unique_system_identifier(pjson.name + '-v' +  pjson.version);
	msg.set_system_agent_id(ByteBuffer.fromUTF8(pjson.name + '-v' +  pjson.version));
	return msg;
}

/**
 * creates an FMISMessage object with initial field values
 * 
 *  @return {FMISMessageNew} msg
 */
HandlerEfdi.prototype.createNewMessageNew = function () {
	var msg = new FMISExchange.FMISMessageNew();
	return msg;
}

HandlerEfdi.prototype.messageReceiver = function(responseMsg)  {
	this.responseMessages.push(responseMsg);
	var self = this;
	self.emit('messageOut', responseMsg);
}

HandlerEfdi.prototype.handleMessage = function(msg) {
	var self = this;
	self.emit('message', msg, this.messageReceiver);
	self.emit('message.packetType.'+msg.packetType, msg, function(responseMsg) {
		self.messageReceiver(responseMsg);
	});
	

	//get the last response message - this concept has to be refactored. Currently only one message is possible with an HTTP response, but there could be more messages.
	var responseMsg = null;
	if (this.responseMessages.length == 0) {
		debug('no response message available - generating default response of packetType=' + msg.packetType);
		responseMsg = handlerEfdi.createNewMessage();
		responseMsg.set_seq(msg.seq);
		responseMsg.packetType = msg.packetType;
	}
	else {
		responseMsg = this.responseMessages.shift();

		//just for information
		if (this.responseMessages.length != 0) {
			debug('remaining responseMessages=' + this.responseMessages.length);
		}
	}

	return responseMsg;
	//return this.generateResponse(msg);
}

HandlerEfdi.prototype.handleMessageNew = function(msg) {
	debug('emitting event');
	this.emit('event', msg, this.messageReceiver);
	msg.event.forEach(function(eventMsg) {
		this.emit('event.' + eventMsg.eventName, eventMsg);
	});
	

	return this.generateResponseNew(msg);
}

/**
 * generates the response message for the incoming msg.
 * 
 * @param FMISMessage msg
 * @param res
 */
HandlerEfdi.prototype.generateResponse = function(msg) {
	debug('generateResponse');
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
		case FMISExchange.FMISMessageType.PUSH_LIVE:
			debug('TODO PUSH_LIVE');
			responseMsg = handlerEfdi.createNewMessage();
			responseMsg.seq = msg.seq;
			responseMsg.packetType = FMISExchange.FMISMessageType.RES_LIVE;
			//console.log(msg);
			break;
		case FMISExchange.FMISMessageType.REQ_DEVICE:
			debug('TODO REQ_DEVICE');
			responseMsg = handlerEfdi.createNewMessage();
			responseMsg.seq = msg.seq;
			responseMsg.packetType = FMISExchange.FMISMessageType.RES_DEVICE;
			break;

		default:
			debug('packetType ' + msg.packetType + ' not implemented');
			throw new Error('Packet type ' + msg.packetType + ' not implemented.');
			break;
	}
	
	
	return responseMsg;
}

/**
 * generates the response message for the incoming msg.
 * 
 * @param FMISMessage msg
 * @param res
 */
HandlerEfdi.prototype.generateResponseNew = function(msg) {

	var FMISExchange = handlerEfdi.FMISExchange;
	var responseMsg = null;
	debug('generateResponse');
	
	responseMsg = handlerEfdi.createNewMessageNew();
	return responseMsg;
}


var handlerEfdi = new HandlerEfdi();
handlerEfdi.FMISExchange = FMISExchange;
handlerEfdi.ByteBuffer = ByteBuffer;

debug('protobuf builders initialized');

module.exports = handlerEfdi;