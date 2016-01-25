var ProtoBuf = dcodeIO.ProtoBuf;
var ByteBuffer = ProtoBuf.ByteBuffer;
var builder = ProtoBuf.loadProtoFile("./FMISExchange.proto");
var FMISExchange = builder.build("FMISExchange");
var seqNo = 0;
var logNo = 1;

var sendMsg = function() {

	msg = new FMISExchange.FMISMessage();
	msg.seq = seqNo++;
	msg.packetType = FMISExchange.FMISMessageType.PING;
	msg.unique_system_identifier = 'client-v0.0.1';
	msg.set_system_agent_id(ByteBuffer.fromUTF8('client-v0.0.1'));
	//{'Content-Type' : 'application/octet-stream'}
	
	var newEntry = $('<div>Entry ' + logNo++ + ':<textarea>' + JSON.stringify(msg) + '</textarea></div>');
	$('#log').prepend(newEntry);
	
	$.ajax({
		type: "POST",
		url: '/',
		data: msg.toArrayBuffer(),
		contentType: 'application/octet-stream',
		processData: false,
		success: function(data) {newEntry.append('<strong>sent successfully</strong>'); receiveMsg(data);},
		error: function(err) {newEntry.append('<strong>error</strong>')}
	});
	
}


var receiveMsg = function(data) {
	try {
		var buf = ByteBuffer.fromUTF8(data);
		//buf.printDebug();
		var msg = new FMISExchange.FMISMessage.decode(buf);
		var newEntry = $('<div>Entry ' + logNo++ + ': <textarea>' + JSON.stringify(msg) + '</textarea><strong>received successfully</strong></div>');
		$('#log').prepend(newEntry);
	} catch (e) {
		console.log(e);
	}
}


$(document).ready(function() {
	$('#sendMsg').click(function() {
		sendMsg();
	});
});
