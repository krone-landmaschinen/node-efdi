var pjson = require(__dirname + '/../package.json');
var ProtoBuf = require("protobufjs");
var ByteBuffer = ProtoBuf.ByteBuffer;
var builder = ProtoBuf.newBuilder();
var FMISExchange = null;

//init protobuf builder
var fs = require('fs');
fs.readFile(__dirname + '/ISO_DIS_11783-10.proto', 'utf8', function (err,data) {
	if (err) {
		return console.log('Protobuf builders could not be initialized. Please copy the ISO_DIS_11783-10.proto file to the "handlers" directory. ' + err);
	}
	ProtoBuf.loadProto(data, builder, __dirname + "/ISO_DIS_11783-10.proto");

});

fs.readFile(__dirname + '/FMISExchange.proto', 'utf8', function (err,data) {
	if (err) {
		return console.log('Protobuf builders could not be initialized. Please copy the FMISExchange.proto file to the "handlers" directory. ' + err);
	}
	ProtoBuf.loadProto(data, builder, __dirname + "/FMISExchange.proto");
	
	FMISExchange = builder.build("FMISExchange");
	console.log('protobuf builders initialized');
});


/**
 * creates an FMISMessage object with initial field values
 * 
 *  @return FMISMessage msg
 */
var createNewMessage = function () {
	var msg = new FMISExchange.FMISMessage();
	msg.set_unique_system_identifier(pjson.name + '-v' +  pjson.version);
	msg.set_system_agent_id(ByteBuffer.fromUTF8(pjson.name + '-v' +  pjson.version));
	return msg;
}


/**
 * generates the response message for the incoming msg.
 * 
 * @param FMISMessage msg
 * @param res
 */
var generateResponse = function(msg, res) {

	var responseMsg = null;
	switch (msg.packetType) {
		case FMISExchange.FMISMessageType.PING:
			responseMsg = createNewMessage();
			responseMsg.set_seq(msg.seq);
			responseMsg.packetType = msg.packetType;
			break;
		case FMISExchange.FMISMessageType.REQ_CAPABILITY:
			responseMsg = createNewMessage();
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
	
	
	//res.type('application/octet-stream');
	if (responseMsg != null) {
		console.log('response ' + responseMsg.encodeJSON());
		res.send(responseMsg.toBuffer());
	}
}


//parse request
var parseRequest = function(buffer, res) {

	try {
		var msg = new FMISExchange.FMISMessage.decode(buffer);
		console.log("request " + msg.encodeJSON());
	
	} catch (e) {
		console.log('Exception while decoding efdi request: ' + e);
		buffer.printDebug();
		
		res.status(500);
		res.send("exception " + e);
		return;
	}
	
	try {
		generateResponse(msg, res);
	} catch (e) {
		console.log('Exception while encoding efdi response: ' + e);
		console.log(msg);
		
		res.status(500);
		res.send("exception " + e);
		return;
	}
	
	res.end();
}


//handle messages
var handler = function (req, res, next) {
	
	//get the binary content
	var buffers = [];

    req.on('data', function(chunk) {
    	buffers.push(chunk);
    });
    req.on('end', function() {
    	var buffer = ByteBuffer.concat(buffers);
    	buffer.ensureCapacity(buffer.capacity() + 1);
    	
    	//console.log("headers=" + JSON.stringify(req.headers));
    	
        parseRequest(buffer, res);
        
        console.log(req.headers);
        //buffer.printDebug();
    });

}


module.exports = handler;