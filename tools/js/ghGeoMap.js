////////////////////
///
///
///   geomap.html
///     - ghGeomap.js
///    -- 
///
///

//var MapR = null;
var GMap = null;
//
var GH_LMAP_LAYER0 = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
});
var GH_LMAP_LAYER1 = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; <a href="https://www.arcgis.com/">Esri/ArcGIS</a> contributors'
});
var GH_LMAP_LAYER2 = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; <a href="https://www.arcgis.com/">Esri/ArcGIS</a> contributors'
});


var LineJSON = {};

var GeomData = [];
var GeomLayer = [];

var marker_option_station = {
    icon : 'train',
    iconShape: 'marker',
    borderColor: '#00ABDC',
    textColor: '#00ABDC'
}
var marker_option_pin = {
    icon: 'map-signs',
    iconShape: 'marker',
    borderColor: '#8D208B',
    textColor: '#8D208B',
    backgroundColor: 'transparent'
};
        
        
function ghInitMaterializeUI() {

    $('#gh_aboutmodal').modal();
    
}


function ghShowCoordinates (e) {
    alert(e.latlng);
}
function ghCenterMap (e) {
    GMap.panTo(e.latlng);
}
function ghZoomIn (e) {
    GMap.zoomIn();
}
function ghZoomOut (e) {
    GMap.zoomOut();
}
function ghZoomIn2 (e) {
    GMap.zoomIn();
    setTimeout(ghZoomIn,400);
}
function ghZoomOut2 (e) {
    GMap.zoomOut();
    setTimeout(ghZoomOut,400);
}

function ghInitMaps() {

    GMap = new L.Map('geom_map', {
	center: new L.LatLng(51.505, -0.04),
	zoom: 15,
	contextmenu: true,
	contextmenuWidth: 140,
	contextmenuItems: [{
	    text: 'Show coordinates',
	    callback: ghShowCoordinates
	}, {
	    text: 'Center map here',
	    callback: ghCenterMap
	}, '-', {
	    text: 'Zoom in',
	    icon: 'libs/img/zoom-in.png',
	    callback: ghZoomIn
	}, {
	    text: 'Zoom out',
	    icon: 'libs/img/zoom-out.png',
	    callback: ghZoomOut
	}, {
	    text: 'Zoom in x2',
	    icon: 'libs/img/zoom-in.png',
	    callback: ghZoomIn2
	}, {
	    text: 'Zoom out x2',
	    icon: 'libs/img/zoom-out.png',
	    callback: ghZoomOut2
	}]
    });
    GMap.addControl(new L.Control.Layers({
	'OSM':GH_LMAP_LAYER0,
	'Esri地図':GH_LMAP_LAYER1,
	'Esri写真':GH_LMAP_LAYER2
    }, {},{position:'topright'}));
    GH_LMAP_LAYER0.addTo(GMap);

}

function ghCreatePolylineLayers(idx) {
    var data = GeomData[idx].geo;
    var prop = GeomData[idx].property;
    var p =[];
    var wholep =[];
    var prevstyle = prop[0];
    var nextstyle = "default";

    var latlng = new L.latLng(data[0][0],data[0][1]);
    p.push(latlng);

    for (var i = 1; i < data.length ; i++) {
        latlng = new L.latLng(data[i][0],data[i][1]);
	p.push(latlng);
	wholep.push(latlng);
	prevstyle = prop[i-1];
	if ( i < data.length - 1 ) {
	    nextstyle = prop[i];
	} else {
	    nextstyle = prop[data.length-1];
	}
	
	if ( prevstyle != nextstyle || i == data.length - 1 ) {
	    var l = null;
	    var txt = GeomData[idx].name + " ";
            if ( prevstyle == "bridge") {
		txt += "bridge";
                l = new L.Polyline(p,{ weight: 6 , color: '#4169E1', opacity: 0.7}).bindPopup(txt).addTo(GMap);
            } else if ( prevstyle == "viaduct") {
		// brdige == viaduct nearly same object
		txt += "viaduct";
                l = new L.Polyline(p,{ weight: 6 , color: '#66CDAA', opacity: 0.7}).bindPopup(txt).addTo(GMap);
            } else if ( prevstyle == "tunnel") {
		txt += "tunnel";
                l = new L.Polyline(p,{ weight: 6 , color: '#DB7093', opacity: 0.7}).bindPopup(txt).addTo(GMap);
            } else if ( prevstyle == "N") {
                l = new L.Polyline(p,{ weight: 6 , color: '#000000'}).addTo(GMap);
            } else {
                // default
                l = new L.Polyline(p,{ weight: 6 , color: '#FFD700', opacity: 0.7}).bindPopup(txt).addTo(GMap);
            }
	    GeomLayer[idx].polyline.push ( l );
	    var plast = p[p.length-1];
	    p =[];
	    p.push(plast);
	}

    }

    GeomLayer[idx].wholepolyline = new L.Polyline(wholep,{ weight: 2 , color: '#000000', opacity: 0.1});
    bounds = GeomLayer[idx].wholepolyline.getBounds();
    GMap.fitBounds( bounds );
    
}

function ghCreateMarkerLayers(idx) {
    var data = GeomData[idx].stations;
    
    for (var i = 0; i < data.length; i++) {

	var latlng = new L.latLng(data[i][0],data[i][1]);
        
        // B , Bahnhof
        // V , Vorbeigehen
        if ( data[i][3] == "V" ) {
            var m = new L.marker(latlng,{
                icon: L.BeautifyIcon.icon(marker_option_pin),
                title:data[i][2],
                alt:data[i][2]
            }).addTo(GMap);
        } else {
            var m = new L.marker(latlng,{
                icon: L.BeautifyIcon.icon(marker_option_station),
                title:data[i][2],
                alt:data[i][2]
            }).addTo(GMap); 
        }
	GeomLayer[idx].marker.push ( m );
    }
}

//   if ( caray[0] == "bridge" && caray[1] == "yes"  ) {
//    if ( caray[0] == "tunnel" && caray[1] == "yes" ) {
//    if ( caray[0] == "gauge" ) {
//    if ( caray[0] == "maxspeed" ) {
//    if ( caray[0] == "highspeed" && caray[1] == "yes"  ) {
//    if ( caray[0] == "layer" ) {
//    if ( caray[0] == "embankment"  && caray[1] == "yes" ) {

function ghGetProperty(data) {
    var ary = data.split(":");
    for (var i = 0; i < ary.length; i++) {
        var status = ary[i];
	if ( status == "bg=y" ) {
	    return "bridge";
	} else if ( status == "tn=y" ) {
	    return "tunnel";
	} else {
	    // NOP
	}
    }
    return "default";
}


function ghParseGeomData(idx) {

    var csvarray = LineJSON.csv[idx];
    for (var i = 0; i < csvarray.length; i++) {
	var csv = csvarray[i].split(",");
	if ( csv[0] == "#T" ) {
	    GeomData[idx].datetime = csv[1];
	} else if ( csv[0] == "#P" ) {
	    var prop = ghGetProperty(csv[1]);
	    GeomData[idx].property.push( prop );
	} else {
	    if ( csv[0] != "" ) {
		GeomData[idx].geo.push ( [ parseFloat(csv[0]) ,parseFloat(csv[1]) ] );
		if ( csv[3] == "x" ) {
		    // NOP
		} else {
		    GeomData[idx].stations.push ( [ parseFloat(csv[0]) ,parseFloat(csv[1]) , csv[3] , csv[4] ] );
		}
	    } else {
		var t = "Wrong ID " + idx + " cnt " + i + "__" + csv[0] + "__" + csv[1] + "__";
		console.log(t);
		// SKIP
	    }
	}
    }
}
function ghFileSelectWayJSON( data ) {
    var file = data.files[0];
    var filename = escape(file.name);

    var reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function(e) {
	LineJSON = JSON.parse(e.target.result);
	GeomData = [];
	GeomLayer = [];
	for ( var i=0,ilen=LineJSON.csv.length; i < ilen; i++ ) {
	    GeomData.push({
		"name" : LineJSON.geometry[i],
		"datetime" : "",
		"property" : [],
		"stations" : [],
		"geo" : []
	    });
	    GeomLayer.push({
		"wholepolyline" : null,
		"polyline" : [],
		"marker" : []
	    });
	    ghParseGeomData(i);
	    ghCreatePolylineLayers(i);
	    ghCreateMarkerLayers(i);
	}
    }
}


/////////////////////////////
//
//  Broadcast Channel
//https://www.digitalocean.com/community/tutorials/js-broadcastchannel-api
//https://developers.google.com/web/updates/2016/09/broadcastchannel
//

function ghBroadcastPrimaryReceiveMessage(data) {
    if (data.type == 'INITCONNECTION') {
        ghBroadcastSendUniqueID();
    } else if (data.type == 'GETLINEDATA') {
	var oid = data.sender;
	if ( ghBroadcastCheckSender(oid) ) {

	    var st = {};
	    for ( var key in LineJSON.route ) {
		st[key] = [];
		var routearray = LineJSON.route[key];
		var starray = [];
		for (var i = 0; i < routearray.length ; i++) {
		    var a = GeomData[ routearray[i] ].stations;
		    if ( a.length > 0 ) starray.push( a ); 
		}
		st[key] = starray.flat();
	    }
    
	    var data = {
		"file" : LineJSON.file,
		"route" : LineJSON.route,
		"geometry" : LineJSON.geometry,
		"stations" : st
	    }
            ghBroadcastSendLineData(oid,data);
	}
    } else if (data.type == 'CLOSE') {
	var oid = data.sender;
	if ( ghBroadcastCheckSender(oid) ) {
	    for ( var i=0,ilen=GH_BROADCAST.others.length;i<ilen;i++ ) {
		if ( GH_BROADCAST.others[i] == oid ) GH_BROADCAST.others.splice(i,1);
	    }
	} else {
	    // NOP
	}
    } else {
        // Not Implemented
    }
};

if(window.BroadcastChannel){
    ghBroadcastSetup('primary',ghBroadcastPrimaryReceiveMessage);
} else {
    console.log("Broadcast Channel Not Supported. \nThis application does not work your browser.");
}

//
//  Broadcast Channel Function
//
/////////////////////////////

$(document).ready(function(){

    ghInitMaterializeUI();

    ghInitMaps();

    //ghAvoidOperation();

});
