/////////////////////////////
//
//  Broadcast Channel
//https://www.digitalocean.com/community/tutorials/js-broadcastchannel-api
//https://developers.google.com/web/updates/2016/09/broadcastchannel
//https://www.mitsue.co.jp/knowledge/blog/frontend/202012/07_0900.html
//
//  
//  (P)  ghBroadcastSetup('primary',ghBroadcastPrimaryReceiveMessage);
//
//  (S)  ghBroadcastSetup('secondary',ghBroadcastSecondaryReceiveMessage);
//       ghBroadcastSendInitConnection();  INITCONNECTION
//  (P)  ghBroadcastSendUniqueID(); INITCONNECTION_ACK'
//  (S)  ghBroadcastGetLineData();  GETLINEDATA
//  (P)  ghBroadcastSendLineData(oid); GETLINEDATA_ACK'
//  (S)  ghSetupTabSheets
//
//

var GH_BROADCAST = {
    name: 'geoglyph_geomap_timetable_v5',
    channel : null,
    selfID : 0,
    others : []
}
function ghBroadcastGetUniqueID(myStrong) {
    var strong = 1000;
    if (myStrong) strong = myStrong;
    return new Date().getTime().toString(16)  + Math.floor(strong*Math.random()).toString(16)
}
function ghBroadcastSetup(initmode,callback){
    //
    //  initmode =  primary or secondary
    //  primary = 0;
    //  secondary = -1;
    //
    var initid = -1;
    if ( initmode == "primary" ) initid = 0;
    
    if(window.BroadcastChannel){
        GH_BROADCAST.channel = new BroadcastChannel(GH_BROADCAST.name);
	GH_BROADCAST.selfID = initid;
        GH_BROADCAST.channel.onmessage = function(evt) {
            if ( evt.data.receiver < 0 || evt.data.receiver == GH_BROADCAST.selfID ) {
		callback(evt.data);
		//ghBroadcastReceiveMessage(evt.data)
            }
        }
    } else {
        GH_BROADCAST.channel = null;
	console.log('Not support Broadcast Cahnnel');	
    }
}

function ghBroadcastClose() {
    if ( GH_BROADCAST.channel != null ) {
        GH_BROADCAST.channel.close();
	GH_BROADCAST.channel = null;
    }
}
function ghBroadcastCheckSender(id) {
    for ( var i=0,ilen=GH_BROADCAST.others.length;i<ilen;i++ ) {
	if ( GH_BROADCAST.others[i] == id ) return true;
    }
    return false;
}
function ghBroadcastSendUniqueID() {
    var uid = ghBroadcastGetUniqueID();
    var data = { yourid: uid }; 
    GH_BROADCAST.channel.postMessage({
        type: 'INITCONNECTION_ACK',
        sender: GH_BROADCAST.selfID,
        receiver: -1,
        value: data
    }); 
    GH_BROADCAST.others.push(uid);
}

function ghBroadcastSendLineData(oid,data) {
    GH_BROADCAST.channel.postMessage({
        type: 'GETLINEDATA_ACK',
        sender: GH_BROADCAST.selfID,
        receiver: oid,
        value: data
    });    

}
function ghBroadcastSendInitConnection() {
    if ( GH_BROADCAST.channel != null && GH_BROADCAST.selfID < 0 ) {
        var data = { status : 0 }; 
        GH_BROADCAST.channel.postMessage({
            type: 'INITCONNECTION',
            sender: GH_BROADCAST.selfID,
            receiver: -1,
            value: data
        });
    }    
}
function ghBroadcastGetLineData() {
    if ( GH_BROADCAST.channel != null ) {
        var data = { status : 0 }; 
        GH_BROADCAST.channel.postMessage({
            type: 'GETLINEDATA',
            sender: GH_BROADCAST.selfID,
            receiver: -1,
            value: data
        });
    }
}
