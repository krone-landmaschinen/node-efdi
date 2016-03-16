var ProtoBuf = dcodeIO.ProtoBuf;
var Long = dcodeIO.Long;
var ByteBuffer = ProtoBuf.ByteBuffer;
var builder = ProtoBuf.loadProtoFile("./FMISExchange.proto");
var FMISExchange = builder.build("FMISExchange");
var ISO11783 = builder.build("ISO11783");
var pb = builder.build('google.protobuf');
var seqNo = 0;
var connectionRoute = 'http';
var wsUri = 'ws://localhost:3000/';
var wsUriServerLog = 'ws://localhost:3000/service/log';
var output = null;
var websocket = null;


var createMsg = function() {
	
	msg = new FMISExchange.FMISMessage();
	msg.seq = seqNo++;
	msg.packetType = FMISExchange.FMISMessageType.PING;
	msg.unique_system_identifier = 'client-v0.0.1';
	msg.set_system_agent_id(ByteBuffer.fromUTF8('client-v0.0.1'));
	
	/*
	var msg = new FMISExchange.FMISMessageNew();
	var evt = new FMISExchange.FMISEvent();
	evt.eventNo = seqNo++;
	evt.eventName = 'TeamSetChanged';
	var evtData = new ISO11783.Device();
	var uid = new ISO11783.UID();
	uid.idRefHead = ISO11783.UIDHead.DVC;
	uid.idRefNumber = new Long(0x1, 0x0, false);
	evtData.setDeviceId(uid);
	evtData.deviceDesignator = 'My Machine';
	evtData.deviceSoftwareVersion = '12345678a';
	evtData.setWorkingSetMasterNAME(ByteBuffer.fromUTF8('aaaaaaaa')); // uint64
	evtData.deviceSerialNumber = '0000123456';
	evtData.setDeviceStructureLabel(ByteBuffer.fromUTF8('bbbbbbbb'));
	evtData.setDeviceLocalizationLabel(ByteBuffer.fromUTF8('cccccccc'));
	
	var any = new pb.Any();
	any.type_url = 'ISO11783.Device';
	any.setValue(evtData.toArrayBuffer());
	evt.add('eventData', any);
	msg.add('event', evt);
	*/
	/*
	var evtResponse = new FMISExchange.FMISEventResponse();
	evtResponse.eventNo = 0;
	msg.add('eventResponse', evtResponse);
	*/
	return msg;
}

/**
 * {FMISMessage} msg
 */
var sendMsg = function(msg) {

	if (connectionRoute == 'http') {
		var data = msg.toArrayBuffer();
		$.ajax({
			type: "POST",
			url: '/service/efdi',
			data: data,
			contentType: 'application/octet-stream',
			processData: false,
			success: function(data) {screenLog('<textarea>' + JSON.stringify(msg) + '</textarea><strong>sent successfully</strong>'); receiveMsg(ByteBuffer.fromUTF8(data));},
			error: function(err) {screenLog('<textarea>' + JSON.stringify(msg) + '</textarea><strong>error</strong>')}
		});

	} else if (connectionRoute == 'ws') {
		if (websocket === null || websocket.readyState != WebSocket.OPEN) {
			screenLog('websocket route selected but not available');
		} else {
			screenLog('<textarea>' + JSON.stringify(msg) + '</textarea><strong>sent to websocket</strong>');
			websocket.send(msg.toArrayBuffer());
		}
	}
}

/**
 * {string} data a binary string
 */
var receiveMsg = function(buf) {
	try {
		//var buf = ByteBuffer.fromUTF8(data);
		//buf.printDebug();
		//var msg = new FMISExchange.FMISMessageNew.decode(buf);
		var msg = new FMISExchange.FMISMessage.decode(buf);
		screenLog('<textarea>' + JSON.stringify(msg) + '</textarea><strong>received successfully</strong>');
	} catch (e) {
		screenLog('exception while decoding message ' + buf.toString());
		console.log(e);
	}
}



function toggleWebSocket()
{
	
	if (websocket !== null && websocket.readyState == WebSocket.OPEN) {
		screenLog("CLOSING");
		websocket.close();
		connectionRoute = 'http';
	}
	
	if (websocket === null || websocket.readyState == WebSocket.CLOSED) {
		screenLog("CONNECTING");
		websocket = new WebSocket(wsUri);
		websocket.binaryType = 'arraybuffer';
		websocket.onopen = function(evt) { onOpen(evt) };
		websocket.onclose = function(evt) { onClose(evt) };
		websocket.onmessage = function(evt) { onMessage(evt) };
		websocket.onerror = function(evt) { onError(evt) };
		connectionRoute = 'ws';
	}

}

function closeWebSocket() {
	
}

function onOpen(evt)
{
screenLog("CONNECTED");
//doSend("WebSocket rocks");
}

function onClose(evt)
{
screenLog("DISCONNECTED");
}

function onMessage(evt)
{
receiveMsg(evt.data);
}

function onError(evt)
{
screenLog('<span style="color: red;">ERROR:</span> ' + evt.data);
}

function doSend(message)
{
screenLog("SENT: " + message);
websocket.send(message);
}

function screenLog(message)
{
	output.prepend(new Date().toString() + '<div>' + message + '</div>');
}

function serverLog(message) {
	//$('#serverLog').prepend(message);
	$('#serverLog').prepend(new Date().toString() + '<div>' + message + '</div>');
}

function openServerLog() {
	var websocketLog = new WebSocket(wsUriServerLog);
	//websocket.binaryType = 'arraybuffer';
	websocketLog.onopen = function(evt) {
		serverLog('log opened');
	};
	websocketLog.onclose = function(evt) {
		serverLog('log closed');
		openServerLog();
	};
	websocketLog.onmessage = function(evt) {
		serverLog('<textarea>' + evt.data + '</textarea>');
		//serverLog( prettyPrint(JSON.parse(evt.data), {expanded: false}) );
	};
	websocketLog.onerror = function(evt) {
		serverLog('<span style="color: red;">ERROR:</span> ' + evt.data);
	};
}

$(document).ready(function() {
	output = $('#log');
	
	$('#sendMsg').click(function() {
		sendMsg(createMsg());
	});
	$('#wsTest').click(function() {
		toggleWebSocket();
	});
	
	openServerLog();
});
