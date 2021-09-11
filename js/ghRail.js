//
//
//
//   Geogplyph Rail 
//     Material design and time editor
//
//   rail3m.html
//     |- ghLang.js
//     |- ghUncode.js
//     |- ghSpeedoMeter.js
//     |- turfRail.min.js
//     |- ghRail.js
//     |- ghRailWeather.js
//     |- ghRailBroadcast.js  ( Communicate for ghRailTime.js )
//     |- ghRailGeocodeWorker.js (thread)
//     |- ghRailUnitWorker.js ( thread )
//     |- ghRail3DTile.js
//          |- ghRail3DTileWorker.js ( thread )
//                 |- pbf.min.js
//                 |- vectortile.min.js
//                 |- Queue.min.js
//                 |- turf3DtileWorker.min.js
//
//
//
//
var GH_REV = 'Revision 5.23';

// Your access token can be found at: https://cesium.com/ion/tokens.
Cesium.Ion.defaultAccessToken = '___CESIUM_TOKEN___';

// https://github.com/CesiumGS/cesium/issues/8959
Cesium.ModelOutlineLoader.hasExtension = function() { return false; }

//
// IMPORTANT
//
// Ad-Hook 
// Cesium internal clock ( Julian UTC )  -> add offset ghOnloadRoute, Browser Country timezone ( Julian Local )  -> User Browser Display ( Gregorian Local )
//
// Correct
//
// At first ,  Set Cesium internal clock set to Browser Local Julian
// Cesium internal clock ( Julian UTC )  -> add offset Browser Country timezone ( Julian Browser Local )
//
// At Second , When Display clock
// 
// Cesium Browser Country timezone ( Julian Browser Local )  -> add offset Target Camera Geometry time offset ( Julian Geometry Local )
// Target route country time offset ( Julian Route Local ) -> User Browser Display ( Gregorian Route Local )
//
//var GH_TIMEZONE_OFFSET = -1 * parseInt( (new Date()).getTimezoneOffset() ,10); // minutes

var GH_TRAIN_TIMEZONE_OFFSET = 0; // minutes ex) in Japan +540
var GH_GEOMETRY_OFFSET = 0; // minutes

function ghSetTimezoneOffset(str) {
    //"timezone": "+01:00",
    if ( str == "Z" ) {
	GH_TRAIN_TIMEZONE_OFFSET = 0;
    } else  {
	tzone = str.split(":");
	GH_TRAIN_TIMEZONE_OFFSET = 60 * parseInt(tzone[0],10) + parseInt(tzone[1],10);
    }
}
//function ghSetTrainTimeOffset(str) {
//    tzone = str.split(":");
//    GH_TRAIN_TIMEZONE_OFFSET = 60 * parseInt(tzone[0],10) + parseInt(tzone[1],10);
//}
function ghSetGeometryTimeOffset(lng) {
    GH_GEOMETRY_OFFSET = -1 * ( 1440 / 360 ) * lng;
}
function ghCesiumJulianTimeToUserGregorianTime(dat) {
    ////var d = Cesium.JulianDate.addMinutes(date, -1 * GH_TIMEZONE_OFFSET, new Cesium.JulianDate());
    var d = Cesium.JulianDate.addMinutes(dat,GH_TRAIN_TIMEZONE_OFFSET, new Cesium.JulianDate());
    return Cesium.JulianDate.toGregorianDate(d);
}
function ghUserDateTimeToCesiumJulianTime(timestr) {
    //  timestr = 03:32
    // ISO8601
    //2014-10-10T13:50:40+09:00  Timezone
    //2014-10-10T13:50:40Z     UTC

    var d = new Date();

    var year = d.getFullYear();
    var month = d.getMonth() + 1;
    if ( month < 10 ) {
	month = "0" + month;
    }
    var ddd = d.getDate();
    if ( ddd < 10 ) {
	ddd = "0" + ddd;
    }
    
    var datetime = year + "-" + month + "-" + ddd + "T" + timestr + ":00.000" + GH_FIELD.timezone;
    return Cesium.JulianDate.fromIso8601(datetime, new Cesium.JulianDate());
}

function ghUserDateTimeToCesiumJulianTimeErr(timestr) {
    //  timestr = 03:32
    //var prefix = "2100-05-01T";// CZML FIX
    var ct = GH_V.clock.currentTime.toString();
    var ctstr = ct.split("T");
    var datetime = ctstr[0] + "T" + timestr + ":00Z";
    var c = Cesium.JulianDate.fromIso8601(datetime, new Cesium.JulianDate());
    return Cesium.JulianDate.addMinutes(c, -1 * GH_TRAIN_TIMEZONE_OFFSET, new Cesium.JulianDate());
}

//
////
// CZML -> 2100-05-01T06:55:00+08/2100-05-01T21:01:00+08
// Load CZML in Cesium then
// GH_V.clock -> "2100-04-30T22:55:00Z" / "2100-05-01T13:01:00Z"
// //
/////////////////////////////////////

var GH_SPEED_METER = null;
var GH_SPEED_METER_PROP = {
    value : 0,
    prevpos : new Cesium.Cartesian3(0,0,0),
    prevtime : new Cesium.JulianDate()
};  //   value = [ Meter / sec]
var GH_SPEED_CALC_PARAM = ( 60 * 60 * 0.84  ) /  1000;
//  speedometer unit [m/s] -> [Km/h] ,, 0.84 is adjust paramtter

var GH_TPV = [];   // Terrain Provider Array
var GH_PICK = {
    "from" : "cesium",
    "type" : "",
    "id" : "",
    "name" : "",
    "entity" : null,
    "marker" : null
};
var GH_CHANGE_MODEL = {
    id : "ALL",
    name : "default",
    locomotive : null
}

var GH_UPDATE_UNIT = null;

//  POV constant param
var GH_POV = {
    "Entity" : null,
    "Prestatus" : 0,
    "Height" : 3,
    "Deg90Radian" : Cesium.Math.toRadians(90.0),
    "Deg180Radian" : Cesium.Math.toRadians(180.0),
    "Deg270Radian" : Cesium.Math.toRadians(270.0),
    "SmoothRadian" : Cesium.Math.toRadians(0.1),
    "SmoothRadianMax" : Cesium.Math.toRadians(90.0),
    "PitchOffset" : Cesium.Math.toRadians(0.5)
}

var GH_TRACKING = {
    "default_heading" : Cesium.Math.toRadians(50.0),
    "default_pitch" : Cesium.Math.toRadians(-12.0),
    "range" : 1000.0,
    "minheight" : 10.0,
    "pitch_coeff" : 0.000000153,
    "pitch_offset" : -0.000001
}
//////////////////////////////////////////////////////////


var GH_V = null;  // Cesium Container Object
var GH_C = null;  // Cesium Container Clock model
var GH_A = null;  // Cesium Container Animation model
var GH_M = null;  // Leaflet Container Object

var GH_FIELDINDEX = {
    file: 'fieldindex.json',
    uncodelist : null,
    fieldlist : null
}
var GH_URILIST = [];
function ghGetResourceUri(file) {
    var idx = Math.floor(Math.random() * GH_URILIST.length);
    var u = GH_URILIST[idx] + file;
    return u
}


// Main Root Data Object
var GH_FIELD = null;
var GH_FIELD_PROP = {
    "id" : null,
    "customfile" : null,
    "isok" : false,
    "useczmlalt" : true,
    "clock" : {
        "start" : null,
        "stop" : null
    },
    "timetable" : {
        "lineid" : ""
    }
}

// Unit station data type
// unused in this file
var GH_TYPE_ARRIVAL = 2;
var GH_TYPE_DEPATURE = 4;
var GH_TYPE_THROUGH = 7;


//  "useczmlalt" : true, => tunnel bridge altitude 
//   altitude parameter -> GH_CZML_GEOM.threshold GH_CZML_GEOM.altitude
//

var GH_UNIT_PROP = {
    "scale" : 1.0,
    "minscale" : 1.0,
    "maxscale" : 10.0,
    "distance" : 2000.0
}

//  For Cesium 3D model entity
var GH_ENTITY = {
    "tile3d" : null,
    "rain" : null,
    "line" : [],
    "unit" : {},
    "unitczml" : [],
    "stationlabel" : [],
    "station" : []
}
//
// key = 10ES_9013
// GH_ENTITY.unit[key] = {
//	    "status" : GH_UNIT_STATUS_INIT,
//	    "linestring" : null,
//	    "entity" : []
//}
//
//
//
// for GH_ENTITY.unit Object list status
var GH_UNIT_STATUS_INIT =-1; // = 0
var GH_UNIT_STATUS_CZML = 1;
var GH_UNIT_STATUS_GLTF_READY = 2;
var GH_UNIT_STATUS_GLTF = 4;
var GH_UNIT_STATUS_SKIP = 64;
var GH_UNIT_GLTF_DELIMITER = '_c_';

//  For Leafet 2D marker layer
var GH_LAYER = {
    base : [],
    polyline : {},  // encoded polyline
    tmarker : {},    // train marker
    smarker : {},    // station marker
    cmarker : {}    // camera marker
};

var GH_UNIT_WORKER = {
    worker: null,
    uri : '../js/ghRailUnitWorker.js',
    loaded : 0
};

///////////////////

var GH_MARKER_SIZE = { 'none' : 0 , 'small' : 12, 'medium' : 24 , 'large' : 48 }; // height
var GH_POLYLINE_PROP = {
    color : [ '#800000', '#ff0000', '#800080', '#ff00ff','#008000', '#00ff00', '#808000', '#ffff00','#000080', '#0000ff', '#008080', '#00ffff' ],
    size : ( GH_MARKER_SIZE['medium'] / 4 ) |0,
    width : 6,
    opacity : 0.7
}

var GH_MARKER_PROP = {
    station : {
	url : '../images/lstationmarker.png',
	shadow : '../images/lstationmarkershadow.png',
	size : GH_MARKER_SIZE['medium']
    },
    train : {
	url : '../images/2dtrain.gif',
	shadow : '../images/2dtrain.gif',
	size : GH_MARKER_SIZE['medium']
    },
    camera : {
	url : '../images/3dcamera_icon.png',
	shadow : '../images/3dcamera_icon.png',
	size : GH_MARKER_SIZE['medium']
    }
}

var GH_TRAIN_LABEL_Y_OFFSET = 20.0; // adjust tunnel underground;
var GH_TRAIN_TIME_STEP = 0.2; // 1 sec step for model calculate heading pitch roll
var GH_IS_3DTERRAIN  = true;


var GH_CZML_GEOM = {
    "threshold" : 3.0,
    "altitude" : 10
}
var GH_MARQUEE = {
    uri: "../js/ghRailGeocodeWorker.js",
    worker : null,
    data : null,
    type : 'init',
    interval : 60000, //  1 min = 60 sec = 60000 msec
    duration : 400, // for HTML ticker speed
    timer : null
}

var GH_CURRENT_AUDIO = null;

var GH_IS_RECIPROCAL = false; // Speed slower The reciprocal of 5 is 1/5
var GH_IS_CAMERA_HORIZONTAL = true;


//
// Viewpoint  definition
//
var GH_VIEWPOINT_DRIVERS = 10;
var GH_VIEWPOINT_RIGHT = 12;
var GH_VIEWPOINT_LEFT = 13;
var GH_VIEWPOINT_TRACKING = 20;
var GH_VIEWPOINT_FRONT = 22;
var GH_VIEWPOINT_BEHIND = 23;
var GH_VIEWPOINT_RIGHT_SIDE = 24;
var GH_VIEWPOINT_LEFT_SIDE = 25;
var GH_VIEWPOINT_FREE = 30;


var GH_IS_CAMERA_AUTOMODE  = false;
var GH_CAMERA_AUTOMODE = {
    "timer" : null,
    "interval" : 120000,
    "trackingdistance" : [ 100, 1000 ],
    "currentpatternidx" : 0,
    "patternidx" : 2,
    "pattern" : [
        [GH_VIEWPOINT_DRIVERS,GH_VIEWPOINT_RIGHT,GH_VIEWPOINT_LEFT],
        [GH_VIEWPOINT_FRONT,GH_VIEWPOINT_RIGHT_SIDE,GH_VIEWPOINT_BEHIND,GH_VIEWPOINT_LEFT_SIDE],
        [GH_VIEWPOINT_DRIVERS,GH_VIEWPOINT_BEHIND,GH_VIEWPOINT_RIGHT,GH_VIEWPOINT_RIGHT_SIDE,GH_VIEWPOINT_LEFT,GH_VIEWPOINT_LEFT_SIDE,GH_VIEWPOINT_FRONT]
    ]
}


/////////////////////////////////////////////////////
/////////////////////////////////////////////////////

//
//   Status variables
//
var GH_IS_PLAYING = false;
var GH_SHOW_TILEQUEUE = false;
var GH_SHOW_SPEEDOMETER = false;

var GH_SHOW_3DTILE = false;
var GH_USE_OSMBUILDING = false;
var GH_USE_3DTILE_TEXTURE = false;


var GH_VIEWPOINT = GH_VIEWPOINT_FREE;
var GH_VIEWPOINT_ICON = [];
GH_VIEWPOINT_ICON[10] = "../images/eye-front-w.png";
GH_VIEWPOINT_ICON[12] = "../images/eye-right-w.png";
GH_VIEWPOINT_ICON[13] = "../images/eye-left-w.png";
GH_VIEWPOINT_ICON[20] = "../images/tracking-w.png";
GH_VIEWPOINT_ICON[22] = "../images/track-front-w.png";
GH_VIEWPOINT_ICON[23] = "../images/track-back-w.png";
GH_VIEWPOINT_ICON[24] = "../images/track-right-w.png";
GH_VIEWPOINT_ICON[25] = "../images/track-left-w.png";
GH_VIEWPOINT_ICON[30] = "../images/free_view-w.png";



//
// 3D tile param  defined at ghVectorTile.js
//
// var GH_3DTILE = used in ghVectortile.js
//
var GH_3DTILE_OSMBUILDING = null;  // OSM Building primitive
var GH_3DTILE_PROP = {
    presec : 20,
    interval : 4,
    prevupdate : 4
};

////////////////////////////////////////
//
//   Rain function
//
var GH_IS_RAIN = false;
var GH_RAIN_POINTS = 100;

function ghRainPlayAudio(flag) {
    var audio = document.getElementById('audiorain');
    var check = $( '#gh_rainsoundcheckbox').is(':checked');
    if ( flag && check ) {
	if ( audio.paused ) {
	    audio.play();
	}
    } else {
	if ( ! audio.paused ) {
	    audio.pause();
	}
    }
}


////////////////////////////////////////
//
//   Marquee function
//

function ghMarqueeText(txt) {
    $('#gh_marquee_data').html(txt);
    $('.marquee').jConveyorTicker({anim_duration: GH_MARQUEE.duration});
}
function ghMarqueeWorkerResponse(event) {
    //var ret = { 'cmd': "update", 'type' : type, 'result' : result };
    var ret = event.data;
    ghMarqueeText(ret.result);
    ret = null;
}
function ghMarqueeSetupWorker(){
    
    if (window.Worker){
        if ( GH_MARQUEE.worker == null ) {
            var worker = new Worker(GH_MARQUEE.uri);
            worker.addEventListener('message', ghMarqueeWorkerResponse );
            worker.addEventListener('error', function(err) {
                console.error(err);
            });
            GH_MARQUEE.worker = worker;
            GH_MARQUEE.timer = setTimeout(ghMarqueeWorkerUpdate,GH_MARQUEE.interval);
	}
    } else {
	GH_MARQUEE.worker = null;
	console.log('Not support Web Workers');	
    }
    return;
}

function ghMarqueeFreeWorker(){
    
    if ( GH_MARQUEE.worker != null ) {
        GH_MARQUEE.worker.terminate();
        GH_MARQUEE.worker = null;
    }
    if ( GH_MARQUEE.timer != null ) {
        clearTimeout(GH_MARQUEE.timer);
        GH_MARQUEE.timer = null;
    }
    return null;
}
function ghMarqueeWorkerUpdate(event) {

    if ( ( typeof event ) == 'undefined' ) {
        GH_MARQUEE.timer = setTimeout(ghMarqueeWorkerUpdate,GH_MARQUEE.interval);
    } 

    if ( GH_PICK.entity == null ) return;
    var pos = new Cesium.Cartesian3();
    GH_PICK.entity.position.getValue(GH_V.clock.currentTime,pos);

    var d = Cesium.JulianDate.addMinutes(GH_V.clock.currentTime, GH_TRAIN_TIMEZONE_OFFSET, new Cesium.JulianDate());
    
    if ( GH_MARQUEE.worker != null ) {
        GH_MARQUEE.worker.postMessage({
            "cmd":"update",
            "position": pos,
            "type": GH_MARQUEE.type,
            "time": Cesium.JulianDate.toIso8601(d),
            "value": GH_MARQUEE.data
        });
	//"time": Cesium.JulianDate.toIso8601(GH_V.clock.currentTime)
    }
}
ghMarqueeSetupWorker();

///////////////////////////////////////
//
//
//  Unit Worker
//

function ghUnitWorkerResponseDebug(event) {
    console.log("==");
    console.log(event.data);
}
function ghUnitWorkerResponse(event) {
    // Let me just generate some array buffer for the simulation
    var array_buffer = new Uint8Array(event.data).buffer;
    // Now to the decoding
    var decoder = new TextDecoder("utf-8");
    var view = new DataView(array_buffer, 0, array_buffer.byteLength);

    var czmlobj = JSON.parse(decoder.decode(view));
    if ( czmlobj.length == 2 ) {
	// Correct CZML data
	ghParseStartStopClockTime(czmlobj);
	ghSetUnitObjectStatus(czmlobj[0].name , GH_UNIT_STATUS_INIT);
	ghCreateUnitLineString(czmlobj[0].name,czmlobj[1].position.cartographicDegrees);
	////////////console.log(czmlobj);///////////
        
	GH_UNIT_WORKER.loaded ++;
	Cesium.CzmlDataSource.load(czmlobj).then( ghCzmlTrainFinished ) ;
	
	if ( GH_ENTITY.unitczml.length == 1 ) {
	    ghSetTimezoneOffset(GH_FIELD.timezone);
	    ghMarqueeText("Loading....");
	} else {
	    GH_V.clock.multiplier = 1.0; // All time need call
	    $( '#gh_modelspeed' ).val(1); // Force value set
	}

    } else {
	console.log("Wrong czml data");
	console.log(czmlobj);
    }
}
function ghUnitWorkerSetup() {

    if (window.Worker){
        if ( GH_UNIT_WORKER.worker == null ) {
            GH_UNIT_WORKER.worker = new Worker(GH_UNIT_WORKER.uri);
            GH_UNIT_WORKER.worker.addEventListener('message', ghUnitWorkerResponse );
            GH_UNIT_WORKER.worker.addEventListener('error', function(err) {
                console.error(err);
            });
	}
    } else {
	GH_UNIT_WORKER.worker = null;
	console.log('Not support Web Workers');	
    }
    return;
}
function ghUnitWorkerFree(){
    if ( GH_UNIT_WORKER.worker != null ) {
        GH_UNIT_WORKER.worker.terminate();
        GH_UNIT_WORKER.worker = null;
    }
    GH_UNIT_WORKER.units = [];
    return null;
}
function ghUnitWorkerCommand(cmd,data){
    if ( GH_UNIT_WORKER.worker != null ) {
        GH_UNIT_WORKER.worker.postMessage({
            "cmd":cmd,
	    "value":data
        });
    }
}
function ghUnitWorkerLoadUnitArray(array){
    GH_UNIT_WORKER.loaded = 0;
    ghUnitWorkerCommand('unitarray',array);
}
function ghUnitWorkerLoadFieldJson(json){
    GH_UNIT_WORKER.loaded = 0;
    ghUnitWorkerCommand('fieldjson',json);
}
function ghUnitWorkerLoadField(file){
    GH_UNIT_WORKER.loaded = 0;
    var f = ghGetResourceUri(file);
    ghUnitWorkerCommand('fielduri',f);
}
function ghUnitWorkerSetUrilist(list){
    ghUnitWorkerCommand('urilist',list);
}
ghUnitWorkerSetup();


////////////////////////////////////////
function ghCreateUnitLineString(id,array) {
    var points = [];
    for(var i = 0,len = array.length; i < len; i=i+4) {
        points.push([ array[i+1], array[i+2] ]);
    }
    GH_ENTITY.unit[ id ].linestring = turf.helpers.lineString(points);

    if ( GH_ENTITY.unit[ id ].linestring == null ) {
	var t = "Linestring wrong " + id + " " ;
	console.log(t);

    }
}
function ghSetUnitObjectStatus(id,status) {
    // id = "10ES_9014"
    if ( ( typeof GH_ENTITY.unit[ id ] ) == 'undefined' ) {
	GH_ENTITY.unit[ id ] = {
	    "status" : status,
	    "linestring" : null,
	    "entity" : []
	};
    } else {
	GH_ENTITY.unit[ id ].status = status;
    }
}
function ghGetUnitIndexFromField(id) {
    var u = GH_FIELD.units;
    for ( var i=0,ilen=u.length; i < ilen; i++ ) {
	var uid = GH_FIELD.id + "_" + u[i].trainid;
	if ( uid == id ) {
	    return i;
	} else if ( u[i].trainid == id ) {
	    return i;
	} else {
	    // NOP
	}
    }
    // See __ghCreateUnitCzml() in ghRailUnitWorker.js
    // var entityname = GH_FIELD.id + "_" + GH_FIELD.units[id].trainid;

    return -1;
}
function ghGetUnitIndexfromEntity(id) {
    // unit model ID -> GH_ENTITY.unitczml[i].name
    var u = GH_ENTITY.unitczml;
    for ( var i=0,ilen=u.length; i < ilen; i++ ) {
	if ( u[i].name == id ) return i;
    }
    return -1;
}


////////////////////////////////////////










///////////////////////////////////////////////

function ghEnablePlayButton(flag) {
    if ( flag ) {
    	$('#gh_playbutton').removeClass('disabled');
    } else {
    	$('#gh_playbutton').addClass('disabled');
    }

}
function ghEnablePauseButton(flag) {
    if ( flag ) {
    	$('#gh_pausebutton').removeClass('disabled');
    } else {
    	$('#gh_pausebutton').addClass('disabled');
    }
}

function ghSetTitleLineinfo(t) {
    //$('#gh_lineinformation').html(t);
    document.title = "Geoglyph " + t;
}
function ghShowLoader(flag) {

    if ( flag ) {
    	$('#gh_loader').addClass('active');
    } else {
    	$('#gh_loader').removeClass('active');
    }

}

function ghMapLeafletMarker(id,pos) {
    
    var p = new L.LatLng(Cesium.Math.toDegrees(pos.latitude),Cesium.Math.toDegrees(pos.longitude));
    if ( ( typeof GH_LAYER.tmarker[id] ) == 'undefined' ) {
	// create icon
	var mi = ghCreateLeafletIcon("train",id);
	if ( mi == null ) {
	    // NOP
	    return null;
	} else{
	    var marker = L.marker(p, {icon: mi});
	    GH_LAYER.tmarker[id] = marker;
	    // ex) id = 12ES_9113
	    marker._myId = id; // Work around TRICK
	    GH_LAYER.tmarker[id].on('click', function(e) {
		ghPickLeafletData(this,'train',e);
		ghOnclickLeafletMarker(e.target._myId,"train");
	    });
	    GH_LAYER.tmarker[id].addTo(GH_M);
	}
    } else {
	GH_LAYER.tmarker[id].setLatLng(p)
    }
}
function ghUnMapLeafletMarker(id){
    if ( ( typeof GH_LAYER.tmarker[id] ) == 'undefined' ) {
	// NOP
    } else {
	if ( GH_M.hasLayer(GH_LAYER.tmarker[id]) ) {
	    GH_M.removeLayer(GH_LAYER.tmarker[id]);
	}
	delete GH_LAYER.tmarker[id];
    }
}

function ghInitLeafletMap() {

    if ( ( typeof L ) === 'undefined' ) return;
	
    GH_M = L.map('gh_leafletmap');
    GH_M.setView([51.505, -0.09], 2);
    GH_LAYER.base[0] = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    });
    GH_LAYER.base[1] = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
	attribution: '&copy; <a href="https://www.arcgis.com/">Esri/ArcGIS</a> contributors'
    });
    GH_LAYER.base[2] = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	attribution: '&copy; <a href="https://www.arcgis.com/">Esri/ArcGIS</a> contributors'
    });
    var baseMaps = {
	'OpenStreetMap': GH_LAYER.base[0],
	'EsriStreetMap':GH_LAYER.base[1],
	'EsriImageryMap':GH_LAYER.base[2]
    }
    GH_LAYER.base[0].addTo(GH_M);
    L.control.layers(baseMaps, {},{position:'bottomleft'}).addTo(GH_M);

    GH_M.createPane('encodedpolyline');
    GH_M.getPane('encodedpolyline').style.zIndex = 450;

}

function ghResizeLeafletDialog(sz) {
    //var w = parseInt(sz.width,10);
    //var h = parseInt(sz.height,10);
    var titlebarmargin = 42;
    var w = parseInt( $('#gh_2Ddialog').dialog("option","width"),10);
    var h = parseInt( $('#gh_2Ddialog').dialog("option","height"),10);
    $('#gh_2Ddialog.ui-dialog-content').height(h-titlebarmargin);
    $('#gh_2Ddialog.ui-dialog-content').width(w);
    $('#gh_leafletmap').height(h-titlebarmargin);
    $('#gh_leafletmap').width(w);
    GH_M.invalidateSize(true);
}
function ghOnclick2DdialogButton(mode) {
    if ( mode < 0 ) {
	// toggle mode
	if ( $('#gh_2Ddialog').dialog('isOpen') ) {
            $('#gh_2Ddialog').dialog('close');
	} else {
            $('#gh_2Ddialog').dialog('open');
	}
    } else if ( mode > 9 ) {
	// Open mode
	if ( $('#gh_2Ddialog').dialog('isOpen') ) {
            // NOP
	} else {
            $('#gh_2Ddialog').dialog('open');
	}
    } else {
	// Close mode
	if ( $('#gh_2Ddialog').dialog('isOpen') ) {
            $('#gh_2Ddialog').dialog('close');
	} else {
            // NOP
	}
    }
}

function ghTabSelect(id) {
    $('.sidenav').sidenav('open');
    var tabid = "side_tab" + id;
    $('.tabs').tabs('select', tabid);    
}

function ghOnclickPlayButton() {
    $('.tooltipped').tooltip('close');
    if ( GH_IS_PLAYING ) return;
    GH_IS_PLAYING = true;
    GH_A.playForwardViewModel.command();
    GH_V.scene.preRender.addEventListener(ghUpdateCesiumScene);

    ghEnablePlayButton(false);
    ghEnablePauseButton(true);

    ghPlayTrainAudio(true);
    if ( GH_IS_RAIN ) {
	ghRainPlayAudio(true);
    }
}
function ghOnclickPauseButton() {
    if ( ! GH_IS_PLAYING ) return;
    GH_IS_PLAYING = false;
    if ( GH_C.canAnimate && GH_C.shouldAnimate ) {
	// pause command twice -> play start
	// work around
	GH_A.pauseViewModel.command();
    }
    GH_V.scene.preRender.removeEventListener(ghUpdateCesiumScene);

    ghEnablePauseButton(false);
    ghEnablePlayButton(true);

    ghPlayTrainAudio(false);
    if ( GH_IS_RAIN ) {
	ghRainPlayAudio(false);
    }
}

function ghOnclickInfoboxCamera() {
    var t = GH_VIEWPOINT_DRIVERS;
    if ( GH_V.infoBox.viewModel.isCameraTracking ) {
	// infobox click on camera tracked OFF
	// Free view
	GH_POV.Entity = null; //undefined;
	t = GH_VIEWPOINT_FREE;
    } else {
	// infobox click on camera tracked
	// Tracked view
	t = GH_VIEWPOINT_TRACKING;
    }
    ghChangeViewpoint(t);
}

//
//  Rail Variables
//
//
function ghSetupCountrySelect() {
    var clist = GH_FIELDINDEX.uncodelist;
    for(var key in clist){
	var content = '<option value="' + key + '" data-icon="' + __uncode2flaggif(key) + '" class="left">' + __uncode2country(key,"") + '</option>';
	$('#gh_country_list').append(content);
    }
    $( '#gh_country_list').formSelect();
    $('#gh_country_list').change( function() {
	var val = $(this).val();
	$('select#gh_tcode_list option').remove();
	var tlist = GH_FIELDINDEX.uncodelist[val];
	var tcode = GH_FIELDINDEX.fieldlist;
	for(var key in tlist){
	    var code = tlist[key];
	    var content = tcode[code].name;
	    $('#gh_tcode_list').append( $("<option>").val( code ).html( content ) );
	}
	$( '#gh_tcode_list').formSelect();
    });
}

function ghInitFieldIndex() {

    // Auto Open Modal Dialog
    $.ajax({
	method: "GET",
	url: GH_FIELDINDEX.file,
	dataType: 'json'
    }).done(function(res){
	//
        GH_URILIST = res.urilist;
	//
	GH_FIELDINDEX.uncodelist = res.uncodelist;
	GH_FIELDINDEX.fieldlist = res.fieldlist;
	ghSetupCountrySelect();
    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
	var msg = "Field index data cannot load ";
	msg += " Load Errpr XMLHttpRequest " + XMLHttpRequest.status ;
	msg += " textStatus " + textStatus ;
	console.log( msg );
	alert(GH_ERROR_MSG['fielddatacannotload']);
    });

}
function ghOpenTimePicker() {
    ghOnclickPauseButton(); // Stop time

    var dp = $('#gh_currenttime').html();
    var tt = $( '#gh_currenttime_input' ).val(); // for test
    var x = dp.split(":");
    var dt = x[0] + ":" + x[1];
    $( '#gh_currenttime_input' ).val(dt);
    
    $('.timepicker').timepicker('open');
}

function ghCheckTimeRange( val ) {
    // val = 12:59

    var v = ghUserDateTimeToCesiumJulianTime(val);// CeciumJulian Object
    var s = GH_V.clock.startTime.clone(); // .toString().split("T");
    var e = GH_V.clock.stopTime.clone(); // .toString().split("T");
    var d0 = Cesium.JulianDate.compare(s,v);
    var d1 = Cesium.JulianDate.compare(v,e);
    //A negative value if left is less than right, a positive value if left is greater than right, or zero if left and right are equal. 

    if ( d0 < 0 && d1 < 0 ) {
	//  within start stop range
	return v;
    }  else {
	//  without start stop range
        var sdiff = Math.abs(Cesium.JulianDate.secondsDifference(s,v));
        var ediff = Math.abs(Cesium.JulianDate.secondsDifference(e,v));

	if ( sdiff < ediff ) {
	    return s;
	} else {
	    return e;
	}
    }
    return v;
}

////////////////////////////////////////////////
//  Call from TimePicker Widget [OK] button
function ghSetTimePicker( val , isautoplay ) {
    GH_V.clock.currentTime = ghCheckTimeRange( val ); // return Cesium.JulianDate
    GH_C.synchronize();
    GH_V.timeline.updateFromClock();
    //GH_V.timeline.resize();
    
    if ( isautoplay ) ghOnclickPlayButton();
};
function ghSetSpecifiedTime(d) {
    // Date Object
    var h = d.getHours();
    if ( h < 10 ) h = "0" + h;
    var str = h + ":";
    var m = d.getMinutes();
    if ( m < 10 ) m = "0" + m;
    str += m;
    ghSetTimePicker( str , false );
}


function ghInitMaterializeUI() {

    var d0 = $(".dropdown-trigger-v").dropdown();
    var d1 = $(".dropdown-trigger-s").dropdown();    
    var s = $(".sidenav").sidenav();
    var t = $(".tabs").tabs();

    $('.timepicker').timepicker({twelveHour:false});
    $( '#gh_currenttime_input' ).change( function () {
	ghSetTimePicker( $(this).val() , true );
    } );

    $('.fixed-action-btn').floatingActionButton({hoverEnabled:false});

    $( '#gh_openleafletbtn' ).click(function() {
	ghOnclick2DdialogButton(-1);
    });

    $( "#gh_2Ddialog" ).dialog({
	title: GH_DIALOG_TITLE,
	width: 400,
	height: 400,
	minWidth: 200,
	minHeight: 200,
	position : { my: "left center", at : "left center" , of : window },
	resizeStop: function ( event,ui ) { ghResizeLeafletDialog(ui.size) }	     
    });
    //$('#2Ddialog').dialog('close');

    $('#gh_startmodal').modal({
	onOpenStart : function () {
	    $('.tooltipped').tooltip('close');
	    ghOnclick2DdialogButton(1);// 3d map dialog close
            ghOnclickPauseButton(); // clock pause button ( play stop )
	}
    });
    //$('#startmodal').modal('open');

    $('#gh_timemodal').modal({
	onOpenStart : function () {
	    //ghOnclick2DdialogButton(1);// 3d map dialog close
            //ghOnclickPauseButton(); // clock pause button ( play stop )
	},
	onCloseStart : function () {
	    //  Execute Broadband
	    ghCloseTimeModal();
	}
    });

    $('#gh_updatemodal').modal({
	onOpenStart : function () {
	    $('.tooltipped').tooltip('close');
	    ghOnclick2DdialogButton(1);// 3d map dialog close
            ghOnclickPauseButton(); // clock pause button ( play stop )
	}
    });
    $('#gh_savemodal').modal({
	onOpenStart : function () {
	    $('.tooltipped').tooltip('close');
	    ghOnclick2DdialogButton(1);// 3d map dialog close
            ghOnclickPauseButton(); // clock pause button ( play stop )
	}
    });
    
    $('#gh_footer-modal-0').modal();
    $('#gh_footer-modal-1').modal();
    
    $('#gh_aboutmodal').modal();
	
    $( '#gh_playbutton' ).click(function() {
	ghOnclickPlayButton();
    });
    $( '#gh_pausebutton' ).click(function() {
	ghOnclickPauseButton();
    });

    $( 'input[name="cesiumspeed"]' ).change( function () {
	var id = $(this).prop('id');
	ghSetCesiumAnimationMultiplier( $(this).val() );
    } );
    $( 'input[name="cesiumquality"]' ).change( function () {
	var id = $(this).prop('id');
	ghSetCesiumQuality( $(this).val() );
    } );
    $( 'input[name="cesiumtilecachesize"]' ).change( function () {
	var id = $(this).prop('id');
	ghSetCesiumCacheSize( $(this).val() );
    } );
    $( 'input[name="cesiummodelscale"]' ).change( function () {
	var id = $(this).prop('id');
	ghSetCesiumModelScale( $(this).val() );
    } );
    $( 'input[name="stationlabelscale"]' ).change( function () {
	var id = $(this).prop('id');
	ghSetCesiumStationLabelScale( $(this).val() );
    } );

    $( '#gh_frameratecheckbox').change(function(){
	ghShowCesiumFPS( $(this).is(':checked') );
    });
    $( '#gh_speedmetercheckbox').change(function(){
	ghShowCesiumSpeedoMeter( $(this).is(':checked') );
    });
    $( '#gh_lightingcheckbox').change(function(){
	ghEnableCesiumSunEffect( $(this).is(':checked') );
    });
    $( '#gh_watercheckbox').change(function(){
	ghEnableCesiumWaterEffect( $(this).is(':checked') );
    });
    $( '#gh_fogcheckbox').change(function(){
	ghEnableCesiumFogEffect( $(this).is(':checked') );
    });
    $( '#gh_3dterraincheckbox').change(function(){
	ghEnableCesium3DTerrain( $(this).is(':checked') );
    });
    $( '#gh_speedvaluereciprocal').change(function(){
	ghEnableCesiumSpeedReciprocal( $(this).is(':checked') );
    });
    $( '#gh_tunnelcheckbox').change(function(){
	ghEnableCesiumTunnel( $(this).is(':checked') );
    });

    
    $( '#gh_3dtilecheckbox').change(function(){
	var flag = $(this).is(':checked');
	var radio = $("input[name='3dtile_type']:checked").val();
	ghEnableCesium3Dtile( flag, radio );
    });
    $('input[name="3dtile_type"]').change(function() {
        var text = $(this).val();
	var flag = $('#gh_3dtilecheckbox').is(':checked');
    	ghEnableCesium3Dtile( flag, text );
    });

    $('input[name="trainaudio"]:radio').change(function(){
        ghChangeTrainAudio( $(this).val() );
    });

    $('input[name="trainiconsize"]:radio').change(function(){
        ghChangeLeafletTrainIconSize( $(this).val() );
    });
    $('input[name="trackpolylinesize"]:radio').change(function(){
        ghChangeLeafletPolylineSize( $(this).val() );
    });
    $( '#gh_polyline_distance_marker_checkbox').change(function(){
	ghChangeLeafletPolylineMarker( $(this).is(':checked') );
    });
    $('input[name="bahnhoficonsize"]:radio').change(function(){
        ghChangeLeafletBahnhofIconSize( $(this).val() );
    });
    $('input[name="cameraiconsize"]:radio').change(function(){
        ghChangeLeafletCameraIconSize( $(this).val() );
    });

    ////////////////////
    // Weather
    $('input[name="gh_weather"]:radio').change(function(){
	var radio = $(this).val();
	var check = $( '#gh_rainsoundcheckbox').is(':checked');
	var slider = $( '#gh_rainslider').val();
	ghChangeCesiumWeather( radio, check, slider );
    });
    $( '#gh_rainsoundcheckbox').change(function(){
	var radio = "non";    
	$('input[name="gh_weather"]').each(function(i){
            if ( $(this).is(':checked') ) {
		radio = $(this).attr('value');
            }
	});
        var slider = $( '#gh_rainslider').val();
        ghEnableCesiumRainAudio( radio, $(this).is(':checked') ,slider );
    });
    $( 'input[name="raindensity"]' ).change( function () {
	var radio = "non";    
	$('input[name="gh_weather"]').each(function(i){
            if ( $(this).is(':checked') ) {
		radio = $(this).attr('value');
            }
	});
	var id = $(this).prop('id');
	var check = $( '#gh_rainsoundcheckbox').is(':checked');
	ghSetCesiumRainDensity( radio, check, $(this).val() );
    } );
    // Weather
    ////////////////////
    
    $( '#gh_modellabelcheckbox').change(function(){
	ghChangeCesiumModelLabel( $(this).is(':checked') );
    });

    $( '#gh_stationlabelcheckbox').change(function(){
	ghChangeCesiumStationLabel( $(this).is(':checked') );
    });

    $('input[name="stationlabelcolor"]:radio').change(function(){
        ghChangeCesiumStationLabelColor( $(this).val() );
    });

    $( 'input[name="eyeoffsetheight"]' ).change( function () {
	var id = $(this).prop('id');
	ghSetCesiumPovOffset( $(this).val() );
    } );
    $( 'input[name="trackingdistance"]' ).change( function () {
	var id = $(this).prop('id');
	ghSetCesiumTrackingRange( $(this).val() );
    } );

    $( '#gh_enableautocameracheckbox').change(function(){
	ghEnableAutoCamera( $(this).is(':checked') );
    });
    $( 'input[name="autocameraminutes"]' ).change( function () {
	var id = $(this).prop('id');
	ghSetAutocameraInterval( $(this).val() );
    } );

    $( '#gh_camerahorizontalcheckbox').change(function(){
	ghEnableCameraHorizontal( $(this).is(':checked') );
    });

    $('.tooltipped').tooltip({
	position:"top",
	html:"<h5><i class=\"material-icons\">highlight</i>Click</h5><i class=\"medium material-icons\">keyboard_arrow_down</i>"
    });


    $('.marquee').jConveyorTicker({anim_duration: GH_MARQUEE.duration});

    // show thums
    //  https://github.com/Dogfalo/materialize/issues/6036
    var array_of_dom_elements = document.querySelectorAll("input[type=range]");
    M.Range.init(array_of_dom_elements);

    //  inital input text
    //M.updateTextFields();
    //$( 'select').formSelect(); move to InitTrainindex

    $('#fieldsavebutton').on('click', function() {
	//ghOnclickPauseButton();
	ghSaveFieldData();
    });

    
}


//////////////////////////
///   Test mode
/////
function ghSaveFieldData() {

    $('#gh_save_loader').addClass('active');
    
    // Copy JSON data
    var str = JSON.stringify(GH_FIELD);
    var ret = JSON.parse(str);

    //  Re-construct
    ret.gltf = null;
    delete ret.linejson;
    var u = ret.units;
    for ( var i=0,len=u.length; i < len; i++ ) {
	ret.units[i].gltf = null;
    }

    var t = $('#gh_currenttime').html();
    ret.currenttime = "0T" + t;

    if ( ret.camera == null || ret.camera == "" ) {
	ret.camera = {
	    "position" : [ 0, 0, 0 ],
	    "heading" : 0.0,
	    "pitch" : 0.0,
	    "roll" : 0.0
	};
    }
    ret.camera.heading = Cesium.Math.toDegrees(GH_V.camera.heading);
    ret.camera.pitch = Cesium.Math.toDegrees(GH_V.camera.pitch);
    ret.camera.roll = Cesium.Math.toDegrees(GH_V.camera.roll);
    var pos= GH_V.camera.positionCartographic; 
    ret.camera.position[0] = Cesium.Math.toDegrees(pos.longitude);
    ret.camera.position[1] = Cesium.Math.toDegrees(pos.latitude);
    ret.camera.position[2] = pos.height;

    if ( ( typeof ret.custom ) == 'undefined' ) {        
        ret.custom = [];
    } else {
        //        
    }
    var dat = {
        "saveid" : ghBroadcastGetUniqueID(),
        "agent" :  window.navigator.userAgent,
        "plathome" : navigator.platform
    }
    ret.custom.push(dat);

    $.ajax({
        type: "POST",
        url: "//earth.geoglyph.info/cgi/savefield.php",
        contentType: "Content-Type: application/json; charset=UTF-8",
        dataType: "json",   
        data: JSON.stringify(ret)
    }).done(function(data) {
        var saveid = data.id;
        var url = location.href + "?fd=" + saveid;
        $("#gh_save_field_message").html(url.replace('#!', ''));
        $("#gh_save_field_button").html("save OK. above Load file URL link");
        $('#gh_save_loader').removeClass('active');
    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
        var msg = "Cannot save data error ";
        msg += " XMLHttpRequest " + XMLHttpRequest.status ;
        msg += " textStatus " + textStatus ;
	console.log( msg );
	alert(GH_ERROR_MSG['fielddatacannotsave']);
    });
    
//    var outfilename = ghGetUniqueID() + ".json";
//    var download = document.getElementById('jsondownload');
//    download.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent( JSON.stringify(ret) ));
//    download.setAttribute('download', outfilename);

}
function ghInitSpeedoMeter() {
    
    GH_SPEED_METER = $("#gh_speedometer").ghSpeedoMeter({
        divFact:10,
        dangerLevel : 180,
        maxVal : 260,
        edgeRadius  : 64,
        indicatorRadius : 48,
        speedoNobeW          : 48,
        speedoNobeH          : 3,
        indicatorNumbRadius : 32,
        speedPositionTxtWH  : 32,
        nobH : 2,
        nobW : 16,
        numbH  : 14,
        midNobH  : 1,
        midNobW : 8
    });
    $("#gh_speedometer_position").hide();
}

function ghPickChangeHeader() {
    //
    //  Change state
    //
    if ( GH_PICK.type == "train" ) {
	var idx = GH_PICK.id;
	if ( GH_PICK.from == "leaflet" ) {
	    //ghSetHeaderDatainfo(GH_PICK.name);
	    idx = GH_PICK.id;
	} else {
	    var nn = GH_PICK.name.split(" ");
	    //ghSetHeaderDatainfo(nn[0]);
	    if ( GH_FIELD_PROP.id == 'custom' ) {
		idx = nn[0];
	    } else {
		idx = GH_FIELD_PROP.id + "_" + nn[0];
	    }
	}
	GH_MARQUEE.type = 'train';
        GH_MARQUEE.data = GH_FIELD.units[ghGetUnitIndexFromField(idx)].timetable;
    } else {
        //ghSetHeaderDatainfo(GH_PICK.name);
        GH_MARQUEE.data = GH_PICK.name;
	GH_MARQUEE.type = 'station';
    }
    ghMarqueeWorkerUpdate(null);
}
function ghPickCesiumData(ent,ev){
    //
    // Station
    //  ent.id = 045cf0d1-09d8-4470-9553-d346c725df2c
    //  ent.name = Haute Picardie

    // Train
    //  ent.id = 10ES_9019_c_0
    //  ent.name = 9019 car 0
    //
    GH_PICK.from = "cesium";
    var s = ent.id.split(GH_UNIT_GLTF_DELIMITER);
    if ( s.length > 1 ) {
	GH_PICK.type = "train"
	GH_PICK.name = ent.name;
	// Force car 0 Model
	GH_PICK.id = s[0] + GH_UNIT_GLTF_DELIMITER + "0";
	GH_PICK.entity = GH_ENTITY.unit[ s[0] ].entity[0];
	ghBroadcastSendPickData('train',s[0]);
    } else {
	GH_PICK.type = "station"
	GH_PICK.name = ent.name;
	GH_PICK.id = ent.id;
	GH_PICK.entity = ent;
	ghBroadcastSendPickData('station',ent.name);
    };

    if ( GH_PICK.type == "train" ) {
	for(var key in GH_LAYER.tmarker ) {
	    if ( GH_LAYER.tmarker[key]._myId == GH_PICK.name ) {
		GH_PICK.marker = GH_LAYER.tmarker[key];
	    }
	}
    } else {
	for(var key in GH_LAYER.smarker ) {
	    var nn = GH_LAYER.smarker[key]._myId.split("_");
	    nn.pop();
	    if ( nn.join(" ") == GH_PICK.name ) {
		GH_PICK.marker = GH_LAYER.smarker[key];
	    }
	}
    }
    ghPickChangeHeader();
}
function ghPickLeafletData(ent,type,ev){
    //
    // Station
    //  ent._myId = Calais_Frethun_12
    //
    // Train
    //  ent._myId = 10ES_9015
    //
    GH_PICK.from = "leaflet";
    GH_PICK.marker = ent;
    GH_PICK.type = type;
    GH_PICK.id = ent._myId;
    var nn = ent._myId.split("_");
    GH_PICK.entity = null;
    if ( type == "station" ) {
	nn.pop();
	GH_PICK.name = nn.join(" ");
	for(var st in GH_ENTITY.stationlabel){
            if ( GH_ENTITY.stationlabel[st].name == GH_PICK.name ) {
		GH_PICK.entity = GH_ENTITY.stationlabel[st];
		break;
	    }
	}
	ghBroadcastSendPickData('station',GH_PICK.name);
    }
    if ( type == "train" ) {
	GH_PICK.name = nn[nn.length-1];
	if ( ( typeof GH_ENTITY.unit[GH_PICK.id] ) == 'object' ) {
	    // Force car 0 Model
	    GH_PICK.entity = GH_ENTITY.unit[GH_PICK.id].entity[0];
	}
	ghBroadcastSendPickData('train',GH_PICK.id);
    }
    ghPickChangeHeader();
}

function ghInitCesium() {

    GH_V = new Cesium.Viewer('gh_cesiumContainer',{
	animation : false,
	baseLayerPicker : true,
	fullscreenButton : false,
	geocoder : false,
	homeButton : false,
	infoBox : true,
	skyBox : false,
	sceneModePicker : false,
	selectionIndicator : true,
	timeline : true,
	navigationHelpButton : true,
	sceneMode : Cesium.SceneMode.SCENE3D,
	scene3DOnly : true,
	shadows : false,
	vrButton: false,
	terrainShadows : Cesium.ShadowMode.DISABLED,
	automaticallyTrackDataSourceClocks : true,
	contextOptions : {
            webgl : {
		powerPreference: 'high-performance'
            }
	}
    });
    GH_TPV[0] = new Cesium.createWorldTerrain({
	requestWaterMask: false,
	requestVertexNormals : true
    });
    GH_TPV[1] = new Cesium.createWorldTerrain({
	requestWaterMask: true,
	requestVertexNormals : true
    });
    GH_TPV[2] = new Cesium.EllipsoidTerrainProvider();

    GH_V.terrainProvider = GH_TPV[0];
    GH_V.scene.globe.depthTestAgainstTerrain = true;
    
    GH_C = new Cesium.ClockViewModel(GH_V.clock);
    GH_A = new Cesium.AnimationViewModel(GH_C);

    //GH_V.scene.debugShowFramesPerSecond = true;
    //GH_V.extend(Cesium.viewerCesiumInspectorMixin);

    GH_V.scene.preRender.addEventListener(ghUpdateCesiumScene);

    //
    // Camera Icon click in Infobox widget
    //
    GH_V.infoBox.viewModel.cameraClicked.addEventListener(function(){ghOnclickInfoboxCamera()});


    //
    //  Rendering Slow Message
    //
    GH_V.extend(Cesium.viewerPerformanceWatchdogMixin, {
	lowFrameRateMessage : GH_WARN_MSG['tooslow']
    }); 
    
    //
    // Show tile queue loading
    //
    //GH_V.scene.globe.tileLoadProgressEvent.addEventListener(ghTilequeueLoading);


    //
    // Cesium Event
    //
    //
    // Timeline observe	 Ad-Hook
    //
    Cesium.knockout.getObservable(GH_C, 'shouldAnimate').subscribe(function(value) {
	// false when the clock is paused.
	if ( !value ) {
	    // Playing and Click Timeline -> stop 
	    ghOnclickPauseButton();
	} else {
	    // Stopping -> Click Play button
	}
    });

    //
    // Cesium Screen Mouse Click
    //
    var act = new Cesium.ScreenSpaceEventHandler(GH_V.scene.canvas);
    act.setInputAction(
	function (evt) {
            var pick = GH_V.scene.pick(evt.position);
	    if ( Cesium.defined(pick) && Cesium.defined(pick.id) ) {
		if ( Cesium.defined(pick.id.position) && pick.id.name.indexOf('ghtree') < 0 ) {
		    ghPickCesiumData(pick.id,evt);
		    // pick.id is Entity Object , Not id text
		    // ^^^^^^^^^^^^^^^^^
		    //console.log( "PICK " + pick.id ); // Object
		    //console.log( "PICK " + pick.id.id );  10ES_S_9020_c_2 ...
		}
            }
	},
	Cesium.ScreenSpaceEventType.LEFT_CLICK
    );
}

function ghSetCesiumAnimationMultiplier(val) {
    if ( GH_V == null ) return;
    if ( isNaN(val) ) return;
    var v = 0;
    if ( GH_IS_RECIPROCAL ) {
	v = parseFloat(1/val);
    } else {
	v = parseFloat(val);
    }
    GH_V.clock.multiplier = v;
}
function ghSetCesiumQuality(val) {
    if ( GH_V == null ) return;
    GH_V.resolutionScale = Cesium.Math.clamp(val/100, 0.1, 1.0);
}

function ghSetCesiumPovOffset(val) {
    GH_POV.Height = val;
}
function ghSetCesiumTrackingRange(val) {
    GH_TRACKING.range = val;
}

function ghSetCesiumCacheSize(val) {
    if ( GH_V == null ) return;
    GH_V.scene.globe.tileCacheSize = parseInt(val,10);    
}
function ghSetCesiumModelScale(val) {

    GH_UNIT_PROP.scale = Cesium.Math.clamp(val, GH_UNIT_PROP.minscale, GH_UNIT_PROP.maxscale);
    if ( ! GH_FIELD_PROP.isok ) return ;

    for ( var key in GH_ENTITY.unit ) {
        if ( GH_ENTITY.unit[key].status == GH_UNIT_STATUS_GLTF ) {
	    var coach=GH_ENTITY.unit[key].entity;
	    for (var i=0,ilen=coach.length; i<ilen; i++) {
		coach[i].model.scale = GH_UNIT_PROP.scale;
                coach[i].model.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(0.0,  GH_UNIT_PROP.scale * GH_UNIT_PROP.distance);
	    }
	}
    }
}
function ghSetCesiumStationLabelScale(val) {
    var str = val + "px Arial";
    for ( var i in GH_ENTITY.stationlabel ) {
        GH_ENTITY.stationlabel[i].label.font = str;
    }     
}
function ghShowCesiumFPS(flag) {
    if ( GH_V == null ) return;
    GH_V.scene.debugShowFramesPerSecond = flag;
}

function ghShowCesiumSpeedoMeter(flag) {
    if ( GH_V == null ) return;
    if ( flag ) {
	GH_SHOW_SPEEDOMETER = true;
        $("#gh_speedometer_position").show(); 
    } else {
	GH_SHOW_SPEEDOMETER = false;
        $("#gh_speedometer_position").hide(); 
    }
}
function ghEnableCesiumSunEffect(flag) {
    if ( GH_V == null ) return;
    if ( flag ) {
	GH_V.scene.globe.enableLighting = true;
	GH_V.scene.sun = new Cesium.Sun();
        GH_V.shadows = true;
	GH_V.terrainShadows = Cesium.ShadowMode.RECEIVE_ONLY;
    } else {
	GH_V.scene.globe.enableLighting = false;
	GH_V.scene.sun = null; //undefined;
        GH_V.shadows = false;
	GH_V.terrainShadows = Cesium.ShadowMode.DISABLED;
    }
}
function ghEnableCesiumWaterEffect(flag) {
    if ( GH_V == null ) return;
    if ( flag ) {
	GH_V.scene.globe.enableLighting = true;
	GH_V.scene.sun = new Cesium.Sun();
        GH_V.shadows = true;
	GH_V.terrainShadows = Cesium.ShadowMode.RECEIVE_ONLY;
	GH_V.terrainProvider = GH_TPV[1];
    } else {
	GH_V.scene.globe.enableLighting = false;
	GH_V.scene.sun = null; //undefined;
        GH_V.shadows = false;
	GH_V.terrainShadows = Cesium.ShadowMode.DISABLED;
	GH_V.terrainProvider = GH_TPV[0];
    }
}
function ghEnableCesiumFogEffect(flag) {
    if ( GH_V == null ) return;
    if ( flag ) {
	GH_V.scene.fog.enabled = true;
    } else {
	GH_V.scene.fog.enabled = false;
    }
}
function ghEnableCesium3DTerrain(flag) {
    if ( GH_V == null ) return;
    if ( flag ) {
	GH_V.terrainProvider = GH_TPV[0];
        GH_IS_3DTERRAIN = true;
    } else {
        GH_V.terrainProvider = GH_TPV[2];
        GH_IS_3DTERRAIN = false;
    }
}
function ghEnableCesiumSpeedReciprocal(flag) {
    if ( GH_V == null ) return;
    if ( flag ) {
	GH_IS_RECIPROCAL = true;
    	$('#gh_speed_range-field').addClass('brown');
    } else {
	GH_IS_RECIPROCAL = false;
	$('#gh_speed_range-field').removeClass('brown');
    }
    ghSetCesiumAnimationMultiplier( $( '#gh_modelspeed' ).val() );

}
function ghEnableCesiumTunnel(flag) {
    if ( GH_V == null ) return;
    if ( flag ) {
	GH_FIELD_PROP.useczmlalt = true;
    } else {
	GH_FIELD_PROP.useczmlalt = false;
    }
}
function ghEnableAutoCamera(flag) {
    if ( flag ) {
	GH_IS_CAMERA_AUTOMODE  = true;
        GH_CAMERA_AUTOMODE.timer = setTimeout(ghCameraAutomodeTimer,GH_CAMERA_AUTOMODE.interval);
    } else {
	GH_IS_CAMERA_AUTOMODE = false;
        clearTimeout(GH_CAMERA_AUTOMODE.timer);
        GH_CAMERA_AUTOMODE.timer = null;
    }
}
function ghSetAutocameraInterval(val) {
    GH_CAMERA_AUTOMODE.interval = parseFloat(val) * 60000; // mili-second
}
function ghEnableCameraHorizontal( flag ) {
    if ( flag ) {
	GH_IS_CAMERA_HORIZONTAL = true;
    } else {
	GH_IS_CAMERA_HORIZONTAL = false;
    }
}

function ghEnableCesium3Dtile(flag,type){
    if ( GH_V == null ) return;

    //GH_3DTILE_TYPE = type;
    if  ( flag ) {
	GH_SHOW_3DTILE = true;
    } else {
	GH_SHOW_3DTILE = false;
    }
    if ( type == 'osmbuildings' ) {
        if ( GH_3DTILE_OSMBUILDING == null ) {
            if ( flag ) {
                GH_3DTILE_OSMBUILDING = Cesium.createOsmBuildings();                    
                GH_V.scene.primitives.add(GH_3DTILE_OSMBUILDING);
            } else {
                // NOP
            }
        } else {
            if ( flag ) {
                // NOP
            } else {
                GH_V.scene.primitives.remove(GH_3DTILE_OSMBUILDING);                
                GH_3DTILE_OSMBUILDING = null ;
            }

        }
	GH_USE_OSMBUILDING = true;
	GH_USE_3DTILE_TEXTURE = false;
    } else if ( type == 'polygon' ) {
        if ( GH_3DTILE_OSMBUILDING != null ) {
            GH_V.scene.primitives.remove(GH_3DTILE_OSMBUILDING);
	    GH_3DTILE_OSMBUILDING = null ;
        }
	GH_USE_OSMBUILDING = false;
	GH_USE_3DTILE_TEXTURE = false;
    } else if ( type == 'withtexture' ) {
        if ( GH_3DTILE_OSMBUILDING != null ) {
            GH_V.scene.primitives.remove(GH_3DTILE_OSMBUILDING);
	    GH_3DTILE_OSMBUILDING = null ;
        }
	GH_USE_OSMBUILDING = false;
	GH_USE_3DTILE_TEXTURE = true;
    } else {
	//  Unknown Type
        if ( GH_3DTILE_OSMBUILDING != null ) {
            GH_V.scene.primitives.remove(GH_3DTILE_OSMBUILDING);
	    GH_3DTILE_OSMBUILDING = null ;
        }
	GH_USE_OSMBUILDING = false;
	GH_USE_3DTILE_TEXTURE = false;
    }
}

function ghChangeCesiumWeather(val,check,v) {
    // val = sunny or rain
    // check box = rain audio checkbox
    // v = rain density
    if ( val == "rain" ) {
        GH_IS_RAIN = true;    
        GH_V.scene.skyAtmosphere = new Cesium.SkyAtmosphere(Cesium.Ellipsoid.WGS84,"cloud");
	//GH_V.scene.sun = new Cesium.Sun();
    } else {
        GH_IS_RAIN = false;
     	GH_V.scene.skyAtmosphere = new Cesium.SkyAtmosphere(Cesium.Ellipsoid.WGS84,"default");
	//GH_S.sun = null;
	//delete GH_V.scene.sun;
	if ( check ) {
	    $( '#gh_rainsoundcheckbox').prop('checked',false);
	} else {
	    // NOP
	}
    }
    ghEnableCesiumRainAudio(val,check,v);
}
function ghEnableCesiumRainAudio(r,c,v) {
    if ( r == "rain" ) {
        if ( GH_C.shouldAnimate && c ) {
	    ghRainPlayAudio(true);
        } else {
	    // train animation paused now
	    ghRainPlayAudio(false);
        }
    } else {
	ghRainPlayAudio(false);
    }
}
function ghSetCesiumRainDensity(r,c,v) {
    GH_RAIN_POINTS = v * 10;
    if ( GH_IS_RAIN ) {
        ghRainRemove();
        // Create new rain primitive in update process
    }
}


function ghChangeLeafletTrainIconSize(val) {
    GH_MARKER_PROP.train.size = GH_MARKER_SIZE[val];
    for ( var j in GH_LAYER.tmarker ) {
	if ( ( typeof GH_LAYER.tmarker[j] ) == 'undefined' ) {
	    // NOP
	} else {
	    if ( GH_M.hasLayer(GH_LAYER.tmarker[j]) ) {
		// NOP
	    } else {
		GH_LAYER.tmarker[j].addTo(GH_M);
	    }
	    GH_LAYER.tmarker[j].setIcon( ghCreateLeafletIcon("train",j) );
	}
    }
}
function ghChangeLeafletPolylineSize(val) {
    if ( val == "hide" ) {
	for ( var i in GH_LAYER.polyline ) {
	    if ( GH_M.hasLayer(GH_LAYER.polyline[i]) ) {
		GH_M.removeLayer(GH_LAYER.polyline[i]);
	    }
	}
    } else {
	GH_POLYLINE_PROP.size = ( GH_MARKER_SIZE[ val ] / 4 ) |0;
	for ( var i in GH_LAYER.polyline ) {
	    if ( GH_M.hasLayer(GH_LAYER.polyline[i]) ) {
		// NOP
	    } else {
		GH_LAYER.polyline[i].addTo(GH_M);
	    }
	    GH_LAYER.polyline[i].setStyle({weight: GH_POLYLINE_PROP.size});
	}

    }
}
function ghChangeLeafletPolylineMarker(flag) {
    for(var key in GH_LAYER.polyline){
	if ( GH_M.hasLayer(GH_LAYER.polyline[key]) ) {
            if ( flag ) {
                GH_LAYER.polyline[key].addDistanceMarkers();
            } else {
                GH_LAYER.polyline[key].removeDistanceMarkers();
            }
	}
    }
}
function ghChangeLeafletBahnhofIconSize(val) {
    if ( val == "hide" ) {
	for ( var i in GH_LAYER.smarker ) {
	    if ( GH_M.hasLayer(GH_LAYER.smarker[i]) ) {
		GH_M.removeLayer(GH_LAYER.smarker[i]);
	    }
	}
    } else {
	GH_MARKER_PROP.station.size = GH_MARKER_SIZE[val];
	for ( var i in GH_LAYER.smarker ) {
	    if ( GH_M.hasLayer(GH_LAYER.smarker[i]) ) {
		// NOP
	    } else {
		GH_LAYER.smarker[i].addTo(GH_M);
	    }
	    GH_LAYER.smarker[i].setIcon( ghCreateLeafletIcon("station",i) );
	}
    }
}
function ghChangeLeafletCameraIconSize(val) {
    if ( val == "hide" ) {
	for ( var i in GH_LAYER.cmarker ) {
	    if ( GH_M.hasLayer(GH_LAYER.cmarker[i]) ) {
		GH_M.removeLayer(GH_LAYER.cmarker[i]);
	    }
	}
    } else {
	GH_MARKER_PROP.camera.size = GH_MARKER_SIZE[val];
	for ( var i in GH_LAYER.cmarker ) {
	    if ( GH_M.hasLayer(GH_LAYER.cmarker[i]) ) {
		// NOP
	    } else {
		GH_LAYER.cmarker[i].addTo(GH_M);
	    }
	    GH_LAYER.cmarker[i].setIcon( ghCreateLeafletIcon("camera",i) );
	}
    }
}

function ghChangeCesiumStationLabel( flag ) {
    for ( var i in GH_ENTITY.stationlabel ) {
        GH_ENTITY.stationlabel[i].label.show = flag;
    }     
}
function ghChangeCesiumStationLabelColor( val ) {
    var col = null;
    switch(val) {
    case "blue":
	col = Cesium.Color.BLUE;
	break;
    case "black":
	col = Cesium.Color.BLACK;
	break;
    case "purple":
	col = Cesium.Color.PURPLE;
	break;
    case "orange":
	col = Cesium.Color.ORANGE;
	break;
    case "yellow":
	col = Cesium.Color.YELLOW;
	break;
    case "pink":
	col = Cesium.Color.PINK;
	break;
    case "green":
	col = Cesium.Color.GREEN;
	break;
    default :
	col = Cesium.Color.YELLOW;
    }
    for ( var i in GH_ENTITY.stationlabel ) {
        GH_ENTITY.stationlabel[i].label.fillColor = col;
    } 
}

function ghChangeCesiumModelLabel( flag ) {
    for ( var key in GH_ENTITY.unit ) {
        if ( GH_ENTITY.unit[key].status == GH_UNIT_STATUS_GLTF ) {
	    GH_ENTITY.unit[key].entity[0].label.show = flag;
	}
    }
}
function ghChangeLocomotiveLoaded(data) {
    if ( GH_CHANGE_MODEL.id == "ALL" )  {
	var u = GH_FIELD.units;
	for ( var i=0,ilen=u.length; i < ilen; i++ ) {
	    u[i].gltf = data;
	    // see ghGetUnitIndexFromField(id)
	    var tid = GH_FIELD.id + "_" + u[i].trainid;
	    ghUnSetTrainCoach(tid,false)
	}
    } else {
	var tid = ghGetUnitIndexFromField(GH_CHANGE_MODEL.id);
	GH_FIELD.units[tid].gltf = data;
	GH_FIELD.units[tid].locomotive = GH_CHANGE_MODEL.locomotive;
	ghUnSetTrainCoach(GH_CHANGE_MODEL.id,false)
    }

}
function ghChangeCesiumTrainModel( val ) {
    if ( GH_PICK.entity != null && GH_PICK.type == "train" ) {
	var s = GH_PICK.entity.id.split(GH_UNIT_GLTF_DELIMITER);
	GH_CHANGE_MODEL.id = s[0];
    } else {
	GH_CHANGE_MODEL.id = "ALL";
    }
    GH_CHANGE_MODEL.name = val;
    if ( val == "default" ) {
	// ????  units[0] is OK??
	ghChangeLocomotiveLoaded(GH_FIELD.gltf);
    } else {
	GH_CHANGE_MODEL.locomotive = "locomotive/" + GH_CHANGE_MODEL.name + ".json";
	ghGetLocomotiveDataASync(ghGetResourceUri(GH_CHANGE_MODEL.locomotive),ghChangeLocomotiveLoaded);
    }


}

function ghPlayTrainAudio(flag) {
    if ( GH_CURRENT_AUDIO == null ) return;
    if ( flag ) {
        GH_CURRENT_AUDIO.play();
    } else {
        GH_CURRENT_AUDIO.pause();
    }
}
function ghChangeTrainAudio(val) {
    var ret = "non";    
    $('input[name=trainaudio]').each(function(i){
        var id = $(this).attr('value');
        if ( $(this).is(':checked') ) {
            ret = id;
        }
        if ( id != "non" ) {
            var dom = document.getElementById(id);                
            dom.pause();
        }
    });
    
    if ( ret == "non") {
        GH_CURRENT_AUDIO = null;
    } else {
        GH_CURRENT_AUDIO = document.getElementById(ret); 
        if (  GH_C.shouldAnimate ) {
            ghPlayTrainAudio(true);
        } else {
            // NOP train animation paused now
        }
    }
}

function ghCameraAutomodeToggleRange(ischeck) {
    if ( ! ischeck ) return;

    // Toggle tracking distance
    
    var threshold = ( GH_CAMERA_AUTOMODE.trackingdistance[0] + GH_CAMERA_AUTOMODE.trackingdistance[1] ) / 2.0;
    var current = $("#gh_trackingdistance").val();
    var next = 0;
    if ( current < threshold ) {
        next = GH_CAMERA_AUTOMODE.trackingdistance[1];
    } else {
        next = GH_CAMERA_AUTOMODE.trackingdistance[0];
    }
    $("#gh_trackingdistance").val(next);
    ghSetCesiumTrackingRange( next );
}
            
function ghGetNextCameraAutomodeView() {

    var val = $("input[name='automode_pattern']:checked").val();
    if ( val == null ) {
        GH_CAMERA_AUTOMODE.patternidx = 2; // All type
    } else {
        GH_CAMERA_AUTOMODE.patternidx = val;
    }

    var patternary = GH_CAMERA_AUTOMODE.pattern[GH_CAMERA_AUTOMODE.patternidx];
    var patternlength = patternary.length - 2;
    if ( GH_CAMERA_AUTOMODE.currentpatternidx > patternlength ) {
        GH_CAMERA_AUTOMODE.currentpatternidx = 0;
    } else {
        GH_CAMERA_AUTOMODE.currentpatternidx++;
    }

    return patternary[GH_CAMERA_AUTOMODE.currentpatternidx];
}

function ghCameraAutomodeTimer() {
    //GH_VIEWPOINT = num;
    // 22 -> 10 -> 23 -> 12 -> 24 -> 13 -> 25
    //    ghChangeViewpoint(num);

    var nextview = ghGetNextCameraAutomodeView();
    if ( GH_PICK.entity != null ) {
	switch(GH_VIEWPOINT) {
	case GH_VIEWPOINT_RIGHT:
	case GH_VIEWPOINT_LEFT:
	case GH_VIEWPOINT_LEFT_SIDE:            
            ghCameraAutomodeToggleRange(true);            
	    break;
        case GH_VIEWPOINT_DRIVERS:
	case GH_VIEWPOINT_FRONT:
	case GH_VIEWPOINT_BEHIND:
	case GH_VIEWPOINT_RIGHT_SIDE:
        default:
            ghCameraAutomodeToggleRange(false);
	    break;
	}
        ghChangeViewpoint(nextview);
    }
    GH_CAMERA_AUTOMODE.timer = setTimeout(ghCameraAutomodeTimer,GH_CAMERA_AUTOMODE.interval);
}

function ghChangeViewpoint(num) {
    if ( GH_PICK.entity == null ) {
	GH_VIEWPOINT = GH_VIEWPOINT_FREE;
	$('#gh_viewpointicon').attr('src',GH_VIEWPOINT_ICON[GH_VIEWPOINT_FREE]);
	return;
    }
    switch(num) {
    case GH_VIEWPOINT_DRIVERS:
    case GH_VIEWPOINT_RIGHT:
    case GH_VIEWPOINT_LEFT:
	if ( GH_PICK.entity != null ) {
	    GH_POV.Entity = GH_PICK.entity;
	}
        GH_V.trackedEntity = null;
	GH_POV.Entity.show = false;
        break;
    case GH_VIEWPOINT_TRACKING:
    case GH_VIEWPOINT_FRONT:
    case GH_VIEWPOINT_BEHIND:
    case GH_VIEWPOINT_RIGHT_SIDE:
    case GH_VIEWPOINT_LEFT_SIDE: 
        if ( GH_PICK.entity != null ) {
	    GH_V.trackedEntity = GH_PICK.entity;
	} else {
	    if ( GH_POV.Entity != null ) {
		GH_V.trackedEntity = GH_POV.Entity;
	    }
	}
	if ( GH_POV.Entity != null ) {
	    GH_POV.Entity.show = true;
	}
	GH_POV.Entity = null;
        break;
    case GH_VIEWPOINT_FREE:
        GH_V.trackedEntity = null;
	//
	//   GH_POV is Cesium Object Pointer
	//  at first GH_POV->(cesium object).show change to Fasle
	//  second  GH_POV (pointer) variable is NULL (cesium object) is exist yet
	//
	if ( GH_POV.Entity != null ) {
	    GH_POV.Entity.show = true;
	}
	GH_POV.Entity = null;
        break;
    default:
	//  NOP
    }
    GH_VIEWPOINT = num;

    $('#gh_viewpointicon').attr('src',GH_VIEWPOINT_ICON[num]);

}

function ghGetModelSpeed() {
    return parseInt($('#gh_modelspeed').val(),10);
}
function ghParseStartStopClockTime(obj) {
    // parse CZML Obj
    for ( var i=0,len=obj.length; i < len; i++ ) {
	if ( ( typeof obj[i].availability ) != 'undefined' ) {
	    var t = obj[i].availability ;
	    var st = t.split("/");
	    if ( GH_FIELD_PROP.clock.start == null ) {
		GH_FIELD_PROP.clock.start = Cesium.JulianDate.fromIso8601(st[0], new Cesium.JulianDate());
	    } else {
		var v = Cesium.JulianDate.fromIso8601(st[0], new Cesium.JulianDate());
		if ( Cesium.JulianDate.lessThan(v,GH_FIELD_PROP.clock.start) ) {
		    GH_FIELD_PROP.clock.start = v;
		}
	    }
	    if ( GH_FIELD_PROP.clock.stop == null ) {
		GH_FIELD_PROP.clock.stop = Cesium.JulianDate.fromIso8601(st[1], new Cesium.JulianDate());
	    } else {
		var v = Cesium.JulianDate.fromIso8601(st[1], new Cesium.JulianDate());
		if ( Cesium.JulianDate.greaterThan(v,GH_FIELD_PROP.clock.stop) ) {
		    GH_FIELD_PROP.clock.stop = v;
		}
	    }
	}
    }
};
function ghRenameTimelineLabel() {
    //https://cesium.com/blog/2018/03/21/czml-time-animation/
    GH_V.timeline.makeLabel = function (date) {
        var gregorianDate = ghCesiumJulianTimeToUserGregorianTime(date);
	
        var hour = gregorianDate.hour % 24;
        if ( hour < 10 ) hour = "0" + hour;
        var minu = gregorianDate.minute;
        if ( minu < 10 ) minu = "0" + minu;
        return hour + ":" + minu;
    }
    //GH_V.clock.onTick.addEventListener(function(event) {
        // If the year changed, update label information
        //console.log(event);
    //});
}


//////////////////////////////////////////////////////////////
//
//   D3 chart
//

function ghD3chart(dataset) {
    var margin = {top: 0, right: 40, bottom: 20, left: 40},
	width = $(window).width() - margin.left - margin.right,
	height = 140 - margin.top - margin.bottom;

    d3.select("#gh_chartsvg").remove(); 

    var svg = d3.select("#gh_chartcontainer").append("svg:svg")
	.attr("id", "gh_chartsvg" )
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)
	.append("svg:g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var xScale = d3.scale.linear()
	.domain([0, d3.max(dataset, function(d){ return d.x; })])
	.range([0, width]);
    
    var yScale = d3.scale.linear()
	.domain([0, d3.max(dataset, function(d){ return d.y; })])
	.range([height, 0]);

    var xAxis = d3.svg.axis()
	.scale(xScale)
	.orient("bottom")
	.tickSubdivide(true)
	.tickSize(-(height), -(height), 0);

    var yAxis = d3.svg.axis()
	.scale(yScale)
	.orient("left")
	.tickSubdivide(true)
	.tickSize(-(width), 3, 0);
    
    var line = d3.svg.line()
	.interpolate('cardinal')
	.x(function(d) { return xScale(d.x); })
	.y(function(d) { return yScale(d.y); });

    var area = d3.svg.area()
	.x(function(d) { return xScale(d.x); })
	.y0(function(d) { return yScale(0); })
	.y1(function(d) { return yScale(d.y); })
	.interpolate('cardinal');

    svg.selectAll("text")
	.data(dataset)
	.enter()
	.append("svg:text")
	.attr("x", function(d) { return xScale(d.x); })
	.attr("y", function(d) { return yScale(d.y) - 5; })
        .text( function(d){ return d.name })
	.attr("text-anchor", "middle")
	.attr("font-family", "sans-serif")
	.attr("font-size", "10px")
	.attr("fill", "white");

    svg.append("svg:g")
	.attr("class", "x axis")
	.attr("transform", "translate(0," + height + ")")
	.call(xAxis);
    svg.append("svg:g")
	.attr("class", "y axis")
	.call(yAxis);

    svg.append("svg:path")
	.attr("class", "line")
	.attr("d", line(dataset));
    svg.append("svg:path")
	.attr("d", area(dataset))
	.attr("fill", "yellow")
	.attr("opacity", 0.2);
}
//
//   D3 chart
//
//////////////////////////////////////////////////////////////


function ghOnclickLeafletMarker(id,type){
    // id = 
    // Lille_Europe_15
    // 10ES_N_9049
    
    var txt = "<a href=\"javascript:ghOnclickLeafletPopup(this,'" + id + "','" + type + "',true);\">";
    txt += "<i class=\"material-icons\">videocam</i></a>&nbsp&nbsp&nbsp";
    txt += "<a href=\"javascript:ghOnclickLeafletPopup(this,'" + id + "','" + type + "',false);\">";
    txt += "<i class=\"material-icons\">close</i></a>";
    var popup = L.popup({minWidth: 60, maxWidth: 80, closeButton:false}).setContent( txt );
    if ( type == "train" ) {
	GH_LAYER.tmarker[id].unbindPopup();
	GH_LAYER.tmarker[id].bindPopup(popup);
	GH_LAYER.tmarker[id].openPopup();
    } else if ( type == "station" ) {
	GH_LAYER.smarker[id].unbindPopup();
	GH_LAYER.smarker[id].bindPopup(popup);
	GH_LAYER.smarker[id].openPopup();
    } else {
	// NOP
	console.log(type);
    }
    GH_V.selectedEntity = null; //undefined;// Close infobox window
}
function ghOnclickLeafletPopup(o,id,type,flag){
    if ( flag ) {

        var pos = null;
	if ( type == "station" ) {
	    pos = GH_LAYER.smarker[id].getLatLng();
	} else if ( type == "train" ) {
	    pos = GH_LAYER.tmarker[id].getLatLng();
	} else {
	    // NOP
	}
	GH_M.panTo(pos);
	ghChangeViewpoint(GH_VIEWPOINT_TRACKING);
    }
    // Close Popup
    if ( type == "station" ) {
	GH_LAYER.smarker[id].closePopup();
	GH_LAYER.smarker[id].unbindPopup();
    } else if ( type == "train" ) {
	GH_LAYER.tmarker[id].closePopup();
	GH_LAYER.tmarker[id].unbindPopup();
    } else {
	// NOP
    }
}

/////////////////////////////////////
///
//
//   Update Timetable
//   
/////////////////////////
function ghUpdateTimetableModal() {
    //  Update Unit data from Modal UI
    //
    //var idx = $( '#gh_update_timetable_idx' ).val();
    //console.log(idx);
    //console.log(GH_UPDATE_UNIT);
    //
    //  Clear current unit data
    //
    if ( GH_UPDATE_UNIT == null || GH_UPDATE_UNIT.length < 1 ) {
        return;
    }
    var lineid = $( '#gh_update_timetable_lineid' ).val();
    
    for ( var j=0,jlen=GH_FIELD.units.length; j < jlen; j++ ) {
        if ( GH_FIELD.units[j].lineid == lineid )  {
            // NOP
        } else {
            GH_UPDATE_UNIT.push( GH_FIELD.units[j] );            
        }
    }
    GH_FIELD.units = GH_UPDATE_UNIT;

    //
    //  similer ghGetFieldData(tcode) function
    //
    ghShowLoader(true);
    ghOnclick2DdialogButton(11); // Open 2D map if closed
    GH_FIELD_PROP.isok = false;

    ghUnitWorkerLoadFieldJson(GH_FIELD);

    // Force Stop
    GH_IS_PLAYING = true;
    ghOnclickPauseButton();
    ghEnablePlayButton(false);
    // Force Stop
	
    ghClearCesiumData();
    ghClearLeafletData();
    ghClearPickData();
	
    for(var key in GH_FIELD.lines){
        ghGetLinePolyline(key);
        ghGetLineStationModel(key);
        ghGetLineLonLat(key);
        ghCreateLineChart(key);
    }
    ghCreateLeafletStation();
    ghCreateLeafletCamera();
    ghCreateCesiumStationLabel();

    GH_FIELD_PROP.isok = true;

    //console.log(GH_FIELD);  //
    ghShowLoader(false);
    for ( var i=0,len=GH_FIELD.units.length; i < len; i++ ) {
	ghGetFieldGltfComponent(i,GH_FIELD.units[i]);
    }

}
function ghOpenSaveModal() {
    if ( GH_FIELD_PROP.isok ) {
        $('#gh_savemodal').modal('open');
    }
}
function ghOpenStartModal() {
    $('#gh_startmodal').modal('open');
}
function ghStartModalInputCheck() {

    var s = $('#gh_country_list').val();
    var e = $('#gh_tcode_list').val();
    GH_FIELD_PROP.id = e;
    ghGetFieldData(ghGetResourceUri(GH_FIELDINDEX.fieldlist[e].file));
    return;
}    

function ghShowDisplayClock(t){

    var gregorianDate = ghCesiumJulianTimeToUserGregorianTime(t);
    var h = gregorianDate.hour;
    if ( h < 10 ) h = "0" + h;
    var m = gregorianDate.minute;
    if ( m < 10 ) m = "0" + m;
    var s = gregorianDate.second;
    if ( s < 10 ) s = "0" + s;
    
    var str =  h + ":" + m + ":" + s;
    $('#gh_currenttime').html(str);
}
//
//  Bottom Speedmeter
//
function ghSetSpeedoMeter(t){
    if ( GH_SPEED_METER == null ) return;
    if ( !GH_SHOW_SPEEDOMETER ) return;
    var e = null;
    
    if ( GH_POV.Entity != null ) {
	e = GH_POV.Entity;
    } else if ( GH_PICK.entity != null ) {
	e = GH_PICK.entity;
    } else {
	//$('#gh_speedmeter').html(" Km/h");
	return;
	//e = GH_MDL.model;
    }
    
    if ( Cesium.defined( e.position ) ) {
	// NOP
    } else {
	// No Position data entity
	//$('#gh_speedmeter').html(" Km/h");
	return;
    }

    var po0 = new Cesium.Cartesian3();
    e.position.getValue(t,po0); // Current Position
    var dt = Cesium.JulianDate.secondsDifference(t,GH_SPEED_METER_PROP.prevtime);

    GH_SPEED_METER_PROP.value = Cesium.Cartesian3.distance( po0, GH_SPEED_METER_PROP.prevpos )  / dt ;   // Meter / sec;
    
    var v = parseInt( GH_SPEED_METER_PROP.value * GH_SPEED_CALC_PARAM,10); 
    GH_SPEED_METER.changeValue(v);    

    GH_SPEED_METER_PROP.prevpos = po0.clone();
    GH_SPEED_METER_PROP.prevtime = t.clone();

    return;
}

function ghSetLeafletMap(t) {
    if ( ( typeof L ) === 'undefined' ) return;
    if ( ! GH_FIELD_PROP.isok ) return;
    if ( GH_PICK.marker == null ) return;

    // Tracking view and Drivers view
    if ( GH_VIEWPOINT != GH_VIEWPOINT_FREE ) {
    	GH_M.setView(GH_PICK.marker.getLatLng());
    }
    
}


function ghCalculateHpr(modelmatrix) {
        
    var rotation = new Cesium.Matrix3();
    var hpr0 = new Cesium.HeadingPitchRoll();
    var hpr1 = new Cesium.HeadingPitchRoll(GH_V.camera.heading,GH_V.camera.pitch,GH_V.camera.roll);

    var qua0 = new Cesium.Quaternion();
    var qua1 = new Cesium.Quaternion();
    
    hpr0 = Cesium.Transforms.fixedFrameToHeadingPitchRoll(modelmatrix);
    Cesium.Quaternion.fromHeadingPitchRoll(hpr0, qua0);
    
    Cesium.Quaternion.fromHeadingPitchRoll(hpr1, qua1);

    Cesium.Quaternion.inverse(qua0,qua0);
    Cesium.Quaternion.multiply(qua1, qua0, qua1);
    Cesium.HeadingPitchRoll.fromQuaternion(qua1, hpr1);

    hpr1.pitch =  Cesium.Math.clamp(Cesium.Math.negativePiToPi(hpr1.pitch), -Cesium.Math.PI_OVER_SIX, Cesium.Math.PI_OVER_SIX); // 30 degre clamped
    
    return hpr1;

}

function ghSetPovCamera(e,t){
    var current_position = new Cesium.Cartesian3();
    e.position.getValue(t,current_position);
    var current_carto = GH_V.scene.globe.ellipsoid.cartesianToCartographic(current_position);
    
    if ( Cesium.defined( current_carto ) && ! current_position.equals( new Cesium.Cartesian3() ) ) {

        var modelMatrix = new Cesium.Matrix4();
        e.computeModelMatrix(t, modelMatrix) ;    
        var local_position = new Cesium.Cartesian3(); // Local ideal position
        var eyeheight = GH_POV.Height * GH_UNIT_PROP.scale;
        
        //Cesium.Cartesian3.fromElements(7.0, 0, current_carto.height, local_position);
        Cesium.Cartesian3.fromElements(7.0, 0, eyeheight, local_position);
        Cesium.Matrix4.multiplyByPoint( modelMatrix , local_position , current_position ) ;
         if (  isNaN(current_position.x)  ) {
            //
            // normalized result is not a number Workaround
            //
            e.position.getValue(t,current_position);
        }

        var dir_vector = new Cesium.Cartesian3();
        var up_vector = new Cesium.Cartesian3();
        
        Cesium.Matrix4.multiplyByPointAsVector(modelMatrix,Cesium.Cartesian3.UNIT_X,dir_vector) ;
        Cesium.Matrix4.multiplyByPointAsVector(modelMatrix,Cesium.Cartesian3.UNIT_Z,up_vector) ;               
         
        GH_V.camera.setView({
            destination: current_position,
            orientation : {
                direction : dir_vector,
                up: up_vector
            }
        });

        if ( GH_VIEWPOINT == GH_VIEWPOINT_RIGHT ) {
            GH_V.camera.lookRight(GH_POV.Deg90Radian);
        }
        if ( GH_VIEWPOINT == GH_VIEWPOINT_LEFT ) {
            GH_V.camera.lookLeft(GH_POV.Deg90Radian);
        }
        
	//        if ( GH_IS_CAMERA_HORIZONTAL && ( typeof GH_V.trackedEntity ) == 'undefined' ) {
	if ( GH_IS_CAMERA_HORIZONTAL ) {
            GH_V.camera.twistLeft(GH_V.camera.roll);
        } 
    }
    
}


function ghSetTrackingCamera(e,t){

    var current_position = new Cesium.Cartesian3();
    e.position.getValue(t,current_position);
    var current_orientation = new Cesium.Quaternion();
    e.orientation.getValue(t,current_orientation);

    var hpr = new Cesium.HeadingPitchRoll();
    hpr = Cesium.HeadingPitchRoll.fromQuaternion(current_orientation, hpr);
    
    if ( GH_VIEWPOINT == GH_VIEWPOINT_BEHIND ) {
        // back
        hpr.heading += GH_POV.Deg180Radian;
    }
    if ( GH_VIEWPOINT == GH_VIEWPOINT_RIGHT_SIDE ) {
        // right
        hpr.heading += GH_POV.Deg90Radian;
    }
    if ( GH_VIEWPOINT == GH_VIEWPOINT_LEFT_SIDE ) {
        // left
        hpr.heading += GH_POV.Deg270Radian;
    }
    var diff = Math.abs(GH_V.camera.heading - hpr.heading);
    if ( diff > GH_POV.SmoothRadian && diff < GH_POV.SmoothRadian * 100 ) {
        // 10 degree
        if ( GH_V.camera.heading > hpr.heading) {
            hpr.heading = GH_V.camera.heading - GH_POV.SmoothRadian ;
        } else {
            hpr.heading = GH_V.camera.heading + GH_POV.SmoothRadian ;
        }
    }

    // camera lookat function
    // pitch re-calc value change, so offset under formulation
    var poffset = GH_TRACKING.pitch_coeff * GH_TRACKING.range + GH_TRACKING.pitch_offset;
    var pitch = GH_V.camera.pitch + poffset;
    if ( GH_POV.Prestatus != GH_VIEWPOINT ) {
        // The closer it is, the smaller the angle 
        if ( GH_TRACKING.range < 200 ) {
            pitch = GH_TRACKING.default_pitch / 6.0;
        } else {
            pitch = GH_TRACKING.default_pitch;
        }
    }

    var hpr2 = new Cesium.HeadingPitchRange(hpr.heading, pitch, GH_TRACKING.range);
    GH_V.camera.lookAt( current_position, hpr2 );

    // Height Adjust
    var cart = GH_V.camera.positionCartographic;
    var height = GH_V.scene.globe.getHeight(cart);
    if ( cart.height < height + GH_TRACKING.minheight ) {
        hpr2.pitch -= GH_POV.PitchOffset;
        GH_V.camera.lookAt( current_position, hpr2 );
    }
    
    //console.log(Cesium.Math.toDegrees(pitch));    
    
}



// https://groups.google.com/forum/embed/?place=forum/cesium-dev&showsearch=true&showpopout=true&hideforumtitle=true&fragments=true&parenturl=https%3A%2F%2Fcesiumjs.org%2Fforum%2F#!searchin/cesium-dev/gltf$20loaded/cesium-dev/bh7THkDdm_c/1n-B93BcBgAJ 
// https://github.com/AnalyticalGraphicsInc/cesium/blob/1.44/Source/DataSources/DataSourceDisplay.js#L55
function ghUpdateUnitStatus() {
    if ( GH_FIELD.units.length < 0) return;

    for(var key in GH_ENTITY.unit ) {
	if ( GH_ENTITY.unit[key].status == GH_UNIT_STATUS_GLTF_READY ) {
            var boundingSphere = new Cesium.BoundingSphere();
	    var res = 0;
	    var l = GH_ENTITY.unit[key].entity.length;
	    for (var i = 0; i < l ; i++) {
		if ( Cesium.defined( GH_ENTITY.unit[key].entity[i] ) ) {
                    var state = GH_V.dataSourceDisplay.getBoundingSphere( GH_ENTITY.unit[key].entity[i] , false, boundingSphere); 
                    if (state === Cesium.BoundingSphereState.DONE) {
                        res++;
                    } else {
                        // NOP
                    }                   
		}
	    }
	    if ( res == l ) {
		GH_ENTITY.unit[key].status = GH_UNIT_STATUS_GLTF;
	    }
	}
    }
}


//https://stackoverflow.com/questions/58719901/is-there-a-way-to-use-turf-js-along-from-a-point-on-a-polyline
function ghCalcPositionLinestringDisntance(unit, tpos, distance ) {
    var line = unit.linestring;
    if ( ( typeof line ) == 'undefined' ) {
        // Something wrong
        return tpos;
    }
    //////////////////////

    if ( ( typeof line.geometry ) == 'undefined' || line.geometry == null ) {
        // Something wrong
	console.log(unit);
        return tpos;
    }
    var pos_c = GH_V.scene.globe.ellipsoid.cartesianToCartographic(tpos);
    var height = GH_V.scene.globe.getHeight(pos_c);
    var splitter = turf.helpers.point([ Cesium.Math.toDegrees(pos_c.longitude),Cesium.Math.toDegrees(pos_c.latitude) ]);
    
    // split the original polyline
    var sliced = turf.lineSlice.default(line.geometry.coordinates[0],splitter, line);
    sliced.geometry.coordinates = sliced.geometry.coordinates.reverse();
        
    // prep the first portion (reverse the coordinates)
    var slicedlength = turf.length.default(sliced) * 1000; // Kilometer to meter
    if ( slicedlength > distance ) {
        var ps = turf.along.default(sliced, distance, {units: 'meters'});
        return new Cesium.Cartesian3.fromDegrees( ps.geometry.coordinates[0], ps.geometry.coordinates[1] ,height );
    } else {
        return new Cesium.Cartesian3.fromDegrees( sliced.geometry.coordinates[0][0], sliced.geometry.coordinates[0][1] ,height );                     
    }
    
};

function ghSetHeight(pos,point){
//
// point is e.position.getValue(ct,point);;
//
    var cpos =  GH_V.scene.globe.ellipsoid.cartesianToCartographic(pos);
    var ret = null; // cartesian3
    
    if ( Cesium.defined( cpos ) ) {
        if ( GH_IS_3DTERRAIN ) {

            var height = GH_V.scene.globe.getHeight(cpos);
	    //
	    //  Important !
	    // cpos.height != height
	    // internet condition and user machine spec
	    // as async loading terrain height
	    //  getHeight is current height..
	    //
            if ( Cesium.defined( height ) ) {
		
                if ( GH_FIELD_PROP.useczmlalt ) {

                    var czmlpos = GH_V.scene.globe.ellipsoid.cartesianToCartographic(point);
                    if ( Cesium.defined( czmlpos ) ) {
                        var czmlheight = czmlpos.height;
                        if ( height - czmlheight > GH_CZML_GEOM.threshold ) {
			    // czml h1 is lower than current height,  proberbly tunnel
                            cpos.height = czmlheight; // height > h1(czml)
                        } else if ( czmlheight - height > GH_CZML_GEOM.threshold ) {
			    // czml h1 is higher than current height, viaduct?? future work
                            cpos.height = height; // h1(czml) < height
                        } else {
                            cpos.height = height; // Nearly height = h1(czml)
                        }
                    } else {
			// NOP
                        cpos.height = height;
                    }
		} else {
		    // NOP
                    cpos.height = height;
                    //pos = Cesium.Cartographic.toCartesian(cpos);
                }
		ret = Cesium.Cartographic.toCartesian(cpos);
            } else {
		ret = pos.clone();
	    }
        } else {
            cpos.height = 0;                
            //tpos = Cesium.Ellipsoid.WGS84.cartographicToCartesian(cpos);                 
            ret = Cesium.Cartographic.toCartesian(cpos);
        }
    } else {
	ret = pos.clone();
    }
    return ret;    
}

function ghSetTrainCoachMove(trainid,unit,e,ct,point){
    //
    //var lmax = unit.model.model.length;
    var unitparam = GH_FIELD.units[ghGetUnitIndexFromField(trainid)].gltf;
    var lmax = unitparam.model.length;

    var nextt = Cesium.JulianDate.addSeconds(ct, GH_TRAIN_TIME_STEP, new Cesium.JulianDate());
    var nextp = new Cesium.Cartesian3();  // Pretime ( -1 sec ) position
    e.position.getValue(nextt,nextp);
    if ( nextp == null  ) return; //  Cannot data next time
    
    //  For Each coarch
    // current first coarch position and time
    // For performance tuning...
    var boundingSphere = new Cesium.BoundingSphere();
    GH_V.dataSourceDisplay.getBoundingSphere(unit.entity[0], false, boundingSphere);
    var far =  GH_V.camera.distanceToBoundingSphere(boundingSphere);
    if ( far > GH_UNIT_PROP.distance * GH_UNIT_PROP.scale ) {
	for (var i = 1; i < lmax ; i++) {
            unit.entity[i].show = false;
        }
        lmax = 1;
    } else {
        // NOP
    }
    ////////////////////////////////////

    //
    //  For Calculate car0 orientation
    //
    var tpos_0 = nextp.clone();
    
    // Next Point height adjust
    tpos_0 = ghSetHeight(tpos_0,point);
        
    var tpos = point.clone(); // new Cesium.Cartesian3();
    var widetotal = 0;
    for (var i = 0; i < lmax ; i++) {
        if ( i == 0 ) {
            // NOP
            tpos = ghSetHeight(tpos,point);
        } else {
            var wide = unitparam.interval[i-1] * GH_UNIT_PROP.scale;
            tpos = ghCalcPositionLinestringDisntance(unit, tpos, wide );
            
            widetotal += wide;
            var ds = -1 * widetotal / GH_SPEED_METER_PROP.value; // = [sec]
            if ( Math.abs(ds) > 60 ) ds = 0;
            var nt = Cesium.JulianDate.addSeconds(ct, ds, new Cesium.JulianDate());
            var point1 = new Cesium.Cartesian3();  // Pretime ( -1 sec ) position
            e.position.getValue(nt,point1);
            // Height adjust
            tpos = ghSetHeight(tpos,point1);
	    unit.entity[i].show = true;
        }

        // Position set
        unit.entity[i].position = tpos;
        // 
        // Calculate orientation myself
        // Because of e.orientation.getValue(tsec,tori) 
        // data is exist , but direction is something wrong.
        // 
        var vv = new Cesium.Cartesian3();   // Velocity Vector
        Cesium.Cartesian3.subtract(tpos_0,tpos,vv);

	if ( Cesium.Cartesian3.magnitudeSquared(vv) > GH_TRAIN_TIME_STEP ) {
	    Cesium.Cartesian3.normalize(vv, vv);
            var rr = new Cesium.Matrix3();      // Rotation Matrix
            Cesium.Transforms.rotationMatrixFromPositionVelocity(tpos, vv, Cesium.Ellipsoid.WGS84, rr);
            var res = new Cesium.Quaternion();
            Cesium.Quaternion.fromRotationMatrix(rr, res);
	    unit.entity[i].orientation = res;
	}

        tpos_0 = tpos.clone();
    }; // for i loop ( train coach )
}

function ghGetLocomotiveDataSync(uri) {
//    var uri = GH_RESOURCE_ROOT + GH_BLOCK_PROP.units[ghGetUnitIndexBlock(id)].locomotive;
    var ret = $.ajax({
	type : 'GET',
	url: uri,
	async : false
    }).responseText;
    return JSON.parse(ret);
}
function ghGetLocomotiveDataASync(uri,callback) {
    //    var uri = GH_RESOURCE_ROOT + GH_BLOCK_PROP.units[ghGetUnitIndexBlock(id)].locomotive;
    $.ajax({
	dataType: "json",
	url: uri
    }).done(function(data) {
	callback(data);
    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
	var msg = "Locomotive Cannot load " + uri + "  ";
	msg += " XMLHttpRequest " + XMLHttpRequest.status ;
	msg += " textStatus " + textStatus ;
	console.log( msg );
	alert(GH_ERROR_MSG['locomotivedatacannotload']);
    });

}
function ghSetTrainCoachLoad(trainid,unit,e,ct,point){

    var unitparam = GH_FIELD.units[ghGetUnitIndexFromField(trainid)].gltf;
    var unitl = unitparam.model.length;
    
    var q0 = new Cesium.Quaternion();
    e.orientation.getValue(ct,q0);
    var coach = null;
    for (var i = 0; i < unitl ; i++) {
        var gltf = ghGetResourceUri(unitparam.model[i]);
	var tnumber = trainid.split("_");
        if ( i == 0 ) {
            coach = GH_V.entities.add({
		"id" : trainid + GH_UNIT_GLTF_DELIMITER + i,
		"name" : tnumber[1] + ' coach ' + i,
		"description" : e.description,
		"position" : point,
		"orientation" : q0,
		"model" : {
		    uri : gltf ,
		    scale: GH_UNIT_PROP.scale ,
		    minimumPixelSize : 4 ,
                    distanceDisplayCondition : new Cesium.DistanceDisplayCondition(0.0, GH_UNIT_PROP.scale * GH_UNIT_PROP.distance)
		},
		"label" : {
		    text : tnumber[1],
		    font : '18px Helvetica' ,
                    eyeOffset : new Cesium.Cartesian3(0.0, GH_TRAIN_LABEL_Y_OFFSET, 0.0),
                    fillColor : Cesium.Color.YELLOW,
                    outlineColor : Cesium.Color.BLACK,
                    outlineWidth : 2,
                }
            });
	} else {
            coach = GH_V.entities.add({
		"id" : trainid + GH_UNIT_GLTF_DELIMITER + i,
		"name" : tnumber[1] + ' coach ' + i,
		"description" : e.description,
		"position" : point,
		"orientation" : q0,
		"model" : {
		    uri : gltf ,
		    scale: GH_UNIT_PROP.scale ,
		    minimumPixelSize : 0 ,
                    distanceDisplayCondition : new Cesium.DistanceDisplayCondition(0.0, GH_UNIT_PROP.scale * GH_UNIT_PROP.distance)
		}
            });
	}
	unit.entity.push( coach );
    }
    unit.status = GH_UNIT_STATUS_GLTF_READY;
}

function ghSetTrainCoach(idx,e,ct,point){
    //if ( ( typeof GH_ENTITY.units ) == 'undefined' ) return;
    // idx = GH_ENTITY.unitczml[k].name = 10ES_9024
    if ( ( typeof GH_ENTITY.unit[idx] ) == 'undefined' ) return;

    var unit = GH_ENTITY.unit[idx];

    if ( unit.status == GH_UNIT_STATUS_GLTF ) {
        // For Performance tuning.... 
        ghSetTrainCoachMove(idx,unit,e,ct,point);
    }

    //
    // Load gltf train coach !
    //
    if ( unit.status == GH_UNIT_STATUS_CZML ) {
        ghSetTrainCoachLoad(idx,unit,e,ct,point);
    }

}
function ghUnSetTrainCoach(idx,isline){
    if ( ( typeof GH_ENTITY.unit[idx] ) == 'undefined' ) return;
    
    if ( GH_ENTITY.unit[idx].status > GH_UNIT_STATUS_CZML ) {
	for (var i=0,ilen=GH_ENTITY.unit[idx].entity.length; i<ilen ; i++) {
	    if ( Cesium.defined( GH_ENTITY.unit[idx].entity[i] ) ) {
		GH_V.entities.remove(GH_ENTITY.unit[idx].entity[i]);
		//delete GH_ENTITY.unit[idx].entity[i];
	    }
	}
	GH_ENTITY.unit[idx].entity = [];
	GH_ENTITY.unit[idx].status = GH_UNIT_STATUS_CZML;
        if ( isline ) {
            //GH_ENTITY.units[idx].linestring = void 0;
	    GH_ENTITY.unit[idx].linestring = null;
        }
    }
}
    
function ghGetCurrentEntity() {
    if ( GH_PICK.entity != null  ) {
        return GH_PICK.entity;
    } else if ( GH_POV.Entity != null  ) {
        return GH_POV.Entity;
    } else {
	return null;
    }
}
function ghUpdateCesiumScene(scene,currenttime) {

    if ( !GH_FIELD_PROP.isok ) return;
    
    ghShowDisplayClock(currenttime);
    ghBroadcastUpdateTime();
    if ( Cesium.JulianDate.secondsDifference(currenttime,GH_SPEED_METER_PROP.prevtime) > 1 ) {
	ghSetSpeedoMeter(currenttime);
    }
    ghUpdateUnitStatus()

    //  Update Train 3D and 2D
    // Unit data source GH_ENTITY.unitczml.push(val);
    var unitentity = GH_ENTITY.unitczml;
    for (var k = 0,len=unitentity.length; k < len; k++) {
	var idx = ghGetUnitIndexFromField(unitentity[k].name);
        if ( idx < 0 ) {
            // NOP Not found unit
        } else {
	    if (  GH_ENTITY.unit[ unitentity[k].name ].status > GH_UNIT_STATUS_INIT ) {
		var list = unitentity[k].entities.values;
		for(var j = 0,jlen = list.length; j < jlen; j++) {
		    var e = list[j];
		    var p1 = new Cesium.Cartesian3();
		    e.position.getValue(currenttime,p1);
		    var cp1 = GH_V.scene.globe.ellipsoid.cartesianToCartographic(p1);
		    // list[j].id = 9024
		    // unitentity[k].name = 10ES_9024
		    if ( Cesium.defined( cp1 ) ) {
                        ghMapLeafletMarker(unitentity[k].name,cp1);
                        ghSetTrainCoach(unitentity[k].name,e,currenttime,p1);
		    } else {
                        ghUnMapLeafletMarker(unitentity[k].name);
			ghUnSetTrainCoach(unitentity[k].name,false);
		    }
                }
            }
        }
    }

    // Update 2D map
    if ( $('#gh_2Ddialog').dialog('isOpen') ) {
	ghSetLeafletMap(currenttime);
	var pos= GH_V.camera.positionCartographic; 
	var p = new L.LatLng(Cesium.Math.toDegrees(pos.latitude),Cesium.Math.toDegrees(pos.longitude));
	GH_LAYER.cmarker['cam0'].setLatLng(p)
    }

    //
    //   3D Vector Tile
    //
    var timecheck = (currenttime.secondsOfDay|0);
    if ( GH_SHOW_3DTILE ) {
        if ( timecheck % GH_3DTILE_PROP.interval == 0 && timecheck != GH_3DTILE_PROP.prevupdate ) {
	    var e = ghGetCurrentEntity();
            if ( e != null ) {
                var nt = Cesium.JulianDate.addSeconds(currenttime, GH_3DTILE_PROP.presec, new Cesium.JulianDate());
                var p = new Cesium.Cartesian3();
                e.position.getValue(nt,p);
                gh3DtileSetup(GH_URILIST);
                var cp = GH_V.scene.globe.ellipsoid.cartesianToCartographic(p);
                // AdHook BUG 
                if ( ( typeof cp ) === 'undefined' ) {
                 // NOP   
                } else {
                    gh3DtileUpdate( cp , -1 , GH_USE_OSMBUILDING, GH_USE_3DTILE_TEXTURE  );
                }
                GH_3DTILE_PROP.prevupdate = timecheck;
            }
        }
    } else {
        gh3DtileFreeWorker(GH_V);
        GH_V.clock.currentTime = currenttime;
	//  Workaround automatically speed change ??
        GH_3DTILE_PROP.prevupdate = timecheck;
    }


    //
    // Rain update
    //
    if ( GH_IS_RAIN ) {
        if ( GH_ENTITY.rain == null ) {
            GH_ENTITY.rain = ghRainCreatePrimitive(GH_V.camera.positionCartographic,GH_RAIN_POINTS);
	    GH_V.scene.primitives.add(GH_ENTITY.rain);          
	} else {
	    ghRainMovePrimitive(GH_V.camera.positionCartographic,GH_ENTITY.rain);
	}       
    } else {
        ghRainRemove(GH_V.scene,GH_ENTITY.rain);
	GH_ENTITY.rain = null;
    }

    //
    // viewpoint
    //    
    if ( GH_POV.Entity != null  && GH_VIEWPOINT < GH_VIEWPOINT_TRACKING ) {
        ghSetPovCamera(GH_POV.Entity,currenttime);
    } else {       
        if ( GH_VIEWPOINT > GH_VIEWPOINT_TRACKING && GH_VIEWPOINT < GH_VIEWPOINT_FREE ){
            if ( GH_V.trackedEntity != null ) {
                GH_V.trackedEntity = null;  // Important Call
            }
            if ( GH_PICK.entity != null ) ghSetTrackingCamera(GH_PICK.entity,currenttime);
        }
    }   
    GH_POV.Prestatus = GH_VIEWPOINT;
    
    
}
////////////////// End of update

function ghRemoveCzmlTrain() {
    var ut = GH_ENTITY.unitczml;
    for ( var i=0,ilen=ut.length; i < ilen; i++ ) {
	if ( GH_V.dataSources.contains(ut[i]) ) {
            GH_V.dataSources.remove(ut[i],true);
	}
	delete ut[i];
    }
    GH_ENTITY.unitczml = [];
}
function ghCzmlTrainFinished(val) {
    
    GH_V.dataSources.add(val);
    GH_ENTITY.unitczml.push(val);
    // model entity -> GH_ENTITY.unitczml[i].entities.values[0]
    // unit model ID -> GH_ENTITY.unitczml[i].name
        
    ghSetUnitObjectStatus( val.name , GH_UNIT_STATUS_CZML);

    if ( GH_UNIT_WORKER.loaded == GH_FIELD.units.length ) {

	ghSetFieldDataInitialPosition();

	$('.tooltipped').tooltip('open');
	ghMarqueeText("Train data loaded.");

	ghInitialPlayingStart();

	if ( GH_FIELD.currenttime == null || GH_FIELD.currenttime == "" ) {
	    ghSetSpecifiedTime( new Date() );
	} else {
	    var str = GH_FIELD.currenttime.substr(2,5);
	    ghSetTimePicker( str , false );	    
	}

	ghCreateTimetablelistInModal();
        //ghSetFieldDataInitialPosition();

    }
    
    return;
}
/////////////    
function ghCreateLeafletIcon(type,id) {
    // Default Station
    var icon = GH_MARKER_PROP.station.url;
    var icons = GH_MARKER_PROP.station.shadow;
    var h = GH_MARKER_PROP.station.size;
    if ( type == "train") {
	var m = GH_FIELD.units[ ghGetUnitIndexFromField(id) ].marker;
	if ( m == "default" ) {
	    m = GH_FIELD.marker;
	}
	icon = ghGetResourceUri(m);
        icons = null;
        h = GH_MARKER_PROP.train.size;
    }
    if ( type == "camera") {
        icon = GH_MARKER_PROP.camera.url;
        icons = null;
        h = GH_MARKER_PROP.camera.size;
    }

    var w = (h * 5 / 6)|0;
    var ih = h;
    var iw = ( w / 2 )|0;
    //var pw = -1 * ih;
    var ph = -1 * iw;
    return L.icon({
	iconUrl: icon,
	shadowUrl: icons,
	iconSize:     [w, h], // size of the icon
	shadowSize:   [w, h], // size of the shadow
	iconAnchor:   [iw, ih], // point of the icon which will correspond to marker's location
	shadowAnchor: [0, ih],  // the same for the shadow
	popupAnchor:  [0, ph] // point from which the popup should open relative to the iconAnchor
    });
}    

function ghCreateCesiumStationLabelTimetable(name) {
    // Not implemented yet
    return name;

}

function ghCreateCesiumStation(j,id,lat,lng,alt,head,name) {
    var pos = new Cesium.Cartesian3.fromDegrees(
	parseFloat(lng),
	parseFloat(lat),
	alt
    );
    var desc = ghCreateStationTimetable(j);
    var hpr = Cesium.HeadingPitchRoll.fromDegrees(head,0.0,0.0);
    var orient = Cesium.Transforms.headingPitchRollQuaternion(pos, hpr );
    return GH_V.entities.add({
	id : id,
	name : name,
	position : pos,
	description : desc,
	orientation : orient,
	label : {
	    text : name,
	    font : '16px Arial',
	    eyeOffset : new Cesium.Cartesian3(0.0, 10.0, 0.0),
            heightReference : Cesium.HeightReference.CLAMP_TO_GROUND,
	    fillColor : Cesium.Color.YELLOW,
	    outlineColor : Cesium.Color.WHITE,
	    outlineWidth : 2,
	    style : Cesium.LabelStyle.FILL_AND_OUTLINE,
	}
    });
}


function ghClearCesiumData() {

    if ( GH_ENTITY.line.length > 0 ) {
	ghRemoveCesiumGroundPolyline();
	//ghRemoveCesiumPolyline();
    }
    if ( GH_ENTITY.station.length > 0 ) {
	ghRemoveStationGeojson();
    }

    if ( GH_ENTITY.stationlabel.length > 0 ) {
	ghRemoveCesiumStationLabel();
    }

    if ( GH_ENTITY.unitczml.length > 0 ) {
	ghRemoveCzmlTrain();
    }

    if ( GH_FIELD != null ) {
	GH_V.entities.removeAll();
	for(var key in GH_ENTITY.unit ) {
	    GH_ENTITY.unit[key].entity = [];
	    GH_ENTITY.unit[key].status = GH_UNIT_STATUS_CZML;
	    GH_ENTITY.unit[key].linestring = null;
	}
    }

    
};
function ghClearPickData() {
    GH_PICK = {
	"from" : "cesium",
	"type" : "",
	"id" : "",
	"name" : "",
	"entity" : null,
	"marker" : null
    };
}
function ghClearLeafletData() {
    
    ghRemoveLeafletPolyline();
    ghRemoveLeafletStation();
    ghRemoveLeafletCamera();

    for(var key in GH_LAYER.tmarker ) {
	ghUnMapLeafletMarker(key);
    }
    GH_LAYER.tmarker={};

};

function ghRemoveCesiumPolyline() {
    var line = GH_ENTITY.line;
    for ( var i=0,len=line.length; i < len; i++ ) {
	GH_V.entities.remove(line[i]);
	delete line[i];
    }
    GH_ENTITY.line = [];
}

function ghRemoveCesiumGroundPolyline() {
    var line = GH_ENTITY.line;
    for ( var i=0,len=line.length; i < len; i++ ) {
	GH_V.scene.primitives.remove(line[i]);
	delete line[i];
    }
    GH_ENTITY.line = [];
}


function ghCreateCesiumGroundPolyline(data) {
    
    var points = [];
    for (var i = 0; i < data.positions.length; i=i+2) {
        points.push([ data.positions[i], data.positions[i+1] ]);
    }
    var LS = turf.helpers.lineString(points,{name:'rail_line'}); //console.log(LINE_STRING);
    var LS_P = [];
    LS_P[0] = turf.lineOffset.default(LS, 1.0, {units:'meters'});
    LS_P[1] = turf.lineOffset.default(LS, -1.0, {units:'meters'});

    // 650AVE is wrong line string appeared
    var wrongdistance = 1.0; // Kilo meter
    
    for ( var k=1,klen=LS.geometry.coordinates.length;k<klen;k++){
        var org_p = turf.helpers.point(LS.geometry.coordinates[k]);
        var aside_p = turf.helpers.point(LS_P[0].geometry.coordinates[k]);
        var bside_p = turf.helpers.point(LS_P[1].geometry.coordinates[k]);

        var aside_dis = turf.distance.default(org_p,aside_p,{units: 'kilometers'});
        var bside_dis = turf.distance.default(org_p,bside_p,{units: 'kilometers'});
        
        if ( aside_dis > wrongdistance ) {
            var t = "lineoffset id " + k + " org=" + LS.geometry.coordinates[k] + " a=" + LS_P[0].geometry.coordinates[k] + " dis=" + aside_dis;
            console.log(t);
            LS_P[0].geometry.coordinates[k] = LS_P[0].geometry.coordinates[k-1];
        }
        if ( bside_dis > wrongdistance ) {
            var t = "lineoffset id " + k + " org=" + LS.geometry.coordinates[k] + " b=" + LS_P[1].geometry.coordinates[k] + " dis=" + bside_dis;
            console.log(t);
            LS_P[1].geometry.coordinates[k] = LS_P[1].geometry.coordinates[k-1];
        }
    }    
		
    // Create polyline Both Side
    var instance = [];
    var vpoly = [];
    for ( var i=0;i<2;i++){
	instance[i] = new Cesium.GeometryInstance({
            geometry : new Cesium.GroundPolylineGeometry({
		positions : Cesium.Cartesian3.fromDegreesArray(LS_P[i].geometry.coordinates.flat()),
		width : 2.0,
            }),
            attributes : {
		color : Cesium.ColorGeometryInstanceAttribute.fromColor(new Cesium.Color(0.2, 0.2, 0.2, 1.0))
            },
            id : data.geomid + " side " + i
	});
	vpoly[i] = new Cesium.GroundPolylinePrimitive({
            geometryInstances : instance[i],
            show : true,
            allowPicking : false,
            classificationType : Cesium.ClassificationType.TERRAIN,
            appearance : new Cesium.PolylineColorAppearance()
	});
	GH_V.scene.groundPrimitives.add(vpoly[i]);
	GH_ENTITY.line.push (vpoly[i]);
    }

}
   
   
function ghCreateTimetablelistInModal() {
    $('#gh_timemodal_list').html("");    
    var str = "";
    
    for(var key in GH_FIELD.linejson){
        var d = GH_FIELD.linejson[key].description;
        str += '<label>';
        str += '<input name="timetableline" value="' + key + '" type="radio"/>';
        str += '<span>' + d + '<span>';
        str += '</label><BR><BR>';
    }            

    $('#gh_timemodal_list').html(str);
}


function ghCloseTimeModal() {
    var val = $("input[name='timetableline']:checked").val();
    if ( ( typeof val ) == 'undefined' ) {
	return;
    }
    GH_FIELD_PROP.timetable.lineid = val;
}

function ghRemoveStationGeojson() {
    var st = GH_ENTITY.station;
    for ( var i=0,ilen=st.length; i < ilen; i++ ) {
	if ( GH_V.dataSources.contains(st[i]) ) {
            GH_V.dataSources.remove(st[i],true);
	}
	delete st[i];
    }
    GH_ENTITY.station = [];
}

function ghRemoveLeafletPolyline() {
    for(var key in GH_LAYER.polyline ) {
	if ( GH_M.hasLayer(GH_LAYER.polyline[key]) ) {
	    GH_M.removeLayer(GH_LAYER.polyline[key]);
	}
	delete GH_LAYER.polyline[key];
    }
    GH_LAYER.polyline = {};
}
function ghCreateLeafletPolyline(xml) {
    var ep = $(xml).find('encodedpolyline')[0].attributes.geomid;
    var k = 0;
    $(xml).find('encodedpath').each(function(k){
        var id = 'encodedpolyline_' + ep.value + "_" + k;
        var p = L.Polyline.fromEncoded( $(this).text() , {
            pane: 'encodedpolyline',
            color: GH_POLYLINE_PROP.color[k % GH_POLYLINE_PROP.color.length],
            opacity: GH_POLYLINE_PROP.opacity,
            weight: GH_POLYLINE_PROP.size,
            distanceMarkers: { showAll : 13, offset: 1000, iconSize: [18.18], lazy: true }    
        });
        p.addTo(GH_M);
        GH_LAYER.polyline[id] = p ;
        k ++;
    });

}

function ghCreateLeafletMarker(type,id,name,lat,lng) {
    var p = new L.LatLng(parseFloat(lat),parseFloat(lng));
    var mi = ghCreateLeafletIcon(type,id);
    var marker = L.marker(p, { icon: mi , title: name , alt: name });
    marker._myId = id;  // Work around TRICK
    return marker;

}

function ghRemoveLeafletStation() {
    for(var key in GH_LAYER.smarker ) {
	if ( GH_M.hasLayer(GH_LAYER.smarker[key]) ) {
	    GH_M.removeLayer(GH_LAYER.smarker[key]);
	}
	//delete GH_LAYER.smarker[key];
    }
    GH_LAYER.smarker = {};
}

function ghCreateLeafletStation() {
    var stlen = 0;
    for(var key in GH_FIELD.linejson){
        var st = GH_FIELD.linejson[ key ].markers;
	for ( var j=0,jlen=st.length; j < jlen; j=j+3 ) {
	    var id = st[j].replace(/\s+/g,'_');
            //var aid = ( i * stlen ) + j;
	    id = id + "_" + stlen;
	    var m = ghCreateLeafletMarker('station',id,st[j],st[j+1],st[j+2]) ;
	    //m._myId = id;  // Work around TRICK
	    m.addTo(GH_M);
	    m.on('click', function(e) {
		ghPickLeafletData(this,'station',e);
		ghOnclickLeafletMarker(e.target._myId,"station");
	    });
	    GH_LAYER.smarker[id] =  m;
	}
        stlen++;
    }
};



function ghRemoveLeafletCamera() {
    for(var key in GH_LAYER.cmarker ) {
	if ( GH_M.hasLayer(GH_LAYER.cmarker[key]) ) {
	    GH_M.removeLayer(GH_LAYER.cmarker[key]);
	}
	//delete GH_LAYER.smarker[key];
    }
    GH_LAYER.cmarker = {};
}

function ghCreateLeafletCamera() {
    var i = 0;
    var latlng = null;
    for(var key in GH_LAYER.smarker ) {
	if ( i == 0 ) {
	    latlng = GH_LAYER.smarker[key].getLatLng();
	}
	i++;
    }
    var m = ghCreateLeafletMarker('camera','cam0','camera',latlng.lat,latlng.lng) ;
    GH_LAYER.cmarker['cam0'] = m;
}

function ghCreateLineChart(id) {
    //
    var way = GH_FIELD.linejson[id].way;
    
    if ( way[0].chart == "" ) return;
    
    var uri = ghGetResourceUri(GH_FIELD.linejson[id].baseuri + way[0].chart);

    $.ajax({
	dataType: "json",
	url: uri
    }).done(function(ret){
	ghD3chart(ret.data);
    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
	var msg = "chart data cannot load " + uri + " " ;
	msg += " XMLHttpRequest " + XMLHttpRequest.status ;
	msg += " textStatus " + textStatus ;
	msg += " errorThrown " + errorThrown.message ;
	console.log( msg );
        $('#gh_chartcontainer').text("N/A");
    });

};

function ghCreateCesiumLabel(type,name,lat,lng) {
    var pos = new Cesium.Cartesian3.fromDegrees(
	parseFloat(lng),
	parseFloat(lat)
    );
    var desc = name;
    if ( type == 'station' ) {
	desc = ghCreateCesiumStationLabelTimetable(name);
    }
    return GH_V.entities.add({
	name : name,
	position : pos,
	description : desc,
	label : {
	    text : name,
	    font : '16px Arial',
	    eyeOffset : new Cesium.Cartesian3(0.0, 10.0, 0.0),
            heightReference : Cesium.HeightReference.CLAMP_TO_GROUND,
	    fillColor : Cesium.Color.YELLOW,
	    outlineColor : Cesium.Color.WHITE,
	    outlineWidth : 2,
	    style : Cesium.LabelStyle.FILL_AND_OUTLINE,
	}
    });
}
    
function ghRemoveCesiumStationLabel() {
    for(var st in GH_ENTITY.stationlabel){
        GH_V.entities.remove(GH_ENTITY.stationlabel[st]);
        delete GH_ENTITY.stationlabel[st];
    }
    GH_ENTITY.stationlabel = [];
}
function ghCreateCesiumStationLabel() {
    for(var key in GH_FIELD.linejson){
        var st = GH_FIELD.linejson[ key ].markers;
	for ( var j=0,jlen=st.length; j < jlen; j=j+3 ) {
	    var m = ghCreateCesiumLabel('station',st[j],st[j+1],st[j+2]) ;
	    GH_ENTITY.stationlabel.push ( m );
	}
    }
}
///////////////////////////////////
function ghSetFieldDataInitialPosition() {
    var tmpb = null;
    var point = [];
    for(var key in GH_LAYER.polyline ) {
	tempb = GH_LAYER.polyline[key].getBounds();
	point.push( tempb.getSouthWest() ); // LatLng
	point.push( tempb.getSouthEast() ); // LatLng
	point.push( tempb.getNorthEast() ); // LatLng
	point.push( tempb.getNorthWest() ); // LatLng
    }
    var bounds = L.latLngBounds(point);
    GH_M.fitBounds( bounds ); // for leaflet
    if ( GH_FIELD.camera == null || GH_FIELD.camera == "" ) {
	var w = bounds.getWest();
	var s = bounds.getSouth();
	var e = bounds.getEast();
	var n = bounds.getNorth();
	GH_V.camera.setView({
	    destination : Cesium.Rectangle.fromDegrees(w, s, e, n)
	});
    } else {
	var pos = GH_FIELD.camera.position;
	GH_V.camera.setView({
	    destination: Cesium.Cartesian3.fromDegrees(pos[0],pos[1],pos[2]),
	    orientation: {
		heading : Cesium.Math.toRadians(GH_FIELD.camera.heading),
		pitch : Cesium.Math.toRadians(GH_FIELD.camera.pitch),
		roll : Cesium.Math.toRadians(GH_FIELD.camera.roll)
	    }
	});
    }
}
function ghInitialPlayingStart() {
    // Force Stop
    GH_IS_PLAYING = true;  // Call First Load Only, when work pausebutton next command
    ghOnclickPauseButton(); // play button enabled, pause button disable
    
    //  Time setting  timezone offset include CZML
    //var t0 = Cesium.JulianDate.addMinutes(GH_BLOCK_PROP.clockstart,-1 * GH_TRAIN_TIMEZONE_OFFSET, new Cesium.JulianDate());
    //var t1 = Cesium.JulianDate.addMinutes(GH_BLOCK_PROP.clockstop,-1 * GH_TRAIN_TIMEZONE_OFFSET, new Cesium.JulianDate());

    GH_V.clock.startTime = GH_FIELD_PROP.clock.start;
    GH_V.clock.stopTime = GH_FIELD_PROP.clock.stop;
    ghRenameTimelineLabel();
    GH_V.clock.multiplier = 1.0;
    GH_V.timeline.updateFromClock();
    GH_V.timeline.zoomTo(GH_FIELD_PROP.clock.start,GH_FIELD_PROP.clock.stop);
    GH_V.timeline.resize();

}

/////////////////////////////
//
//   Field Component Loaded
//
///////////////////////////

function ghGetFieldGLTF() {
    var uri = ghGetResourceUri(GH_FIELD.locomotive);
    $.ajax({
	dataType: "json",
	url: uri
    }).done(function(data) {
	GH_FIELD.gltf = data;
	for ( var i=0,len=GH_FIELD.units.length; i < len; i++ ) {
	    ghGetFieldGltfComponent(i,GH_FIELD.units[i]);
	}
    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
	var msg = "Default GLTF Component Cannot load " + file + "  ";
	msg += " XMLHttpRequest " + XMLHttpRequest.status ;
	msg += " textStatus " + textStatus ;
	console.log( msg );
	alert(GH_ERROR_MSG['gltfdatacannotload']);
    });
}
function ghGetFieldGltfComponent(id,unit) {
    if ( unit.locomotive == "default" ) {
	GH_FIELD.units[id].gltf = GH_FIELD.gltf;
	return;
    }
    if ( GH_FIELD.units[id].gltf != null ) {
	return;
    }

    var uri = ghGetResourceUri(GH_FIELD.units[id].locomotive);
    $.ajax({
	dataType: "json",
	url: uri
    }).done(function(data) {
	GH_FIELD.units[id].gltf = data;
    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
	var msg = "GLTF Component Cannot load " + file + "  ";
	msg += " XMLHttpRequest " + XMLHttpRequest.status ;
	msg += " textStatus " + textStatus ;
	console.log( msg );
	alert(GH_ERROR_MSG['gltfdatacannotload']);
    });

}

function ghGetFieldLineFinished() {

    if ( GH_FIELD_PROP.id == 'custom' ) {
	ghUnitWorkerLoadField(GH_FIELD_PROP.customfile);
    } else {
	ghUnitWorkerLoadField(GH_FIELDINDEX.fieldlist[ GH_FIELD_PROP.id ].file);
    }


    ghCreateLeafletStation();
    ghCreateLeafletCamera();
    ghCreateCesiumStationLabel();

    GH_FIELD_PROP.isok = true;

    ghShowLoader(false);
    
    if ( GH_FIELD_PROP.id == 'custom' ) {
	ghCheckData(GH_FIELD_PROP.id,GH_FIELD_PROP.customfile);
    } else {
	ghCheckData(GH_FIELD_PROP.id,GH_FIELDINDEX.fieldlist[GH_FIELD_PROP.id].name);
    }
}

function ghWaitFieldLineLoaded(func) {
    var linecnt = 0;
    var matchcnt = 0;
    for(var key in GH_FIELD.lines){
        if ( ( typeof GH_FIELD.linejson[ key ] ) == 'undefined' ) {
            // NOP
        } else {
            matchcnt++;
        }        
        linecnt++;
    }
    if ( linecnt == matchcnt ) {
	func();
    }
};

function ghGetLinePolyline(id) {
    
    var way = GH_FIELD.linejson[id].way;

    for ( var k=0,klen=way.length; k < klen; k++ ) {
    
        var poly = way[k].polyline;
        for ( var i=0,ilen=poly.length; i < ilen; i++ ) {
            var uri = ghGetResourceUri(GH_FIELD.linejson[id].baseuri + poly[i]);
    
            $.ajax({
                dataType: "xml",
                url: uri
            }).done(function(xml) {
                
                ghCreateLeafletPolyline(xml);
                //ghSetFieldDataInitialPosition(); move to trainfinished
            
            }).fail(function(XMLHttpRequest, textStatus,errorThrown){
                var msg = "Polyline data Cannot load " + file + "  ";
                msg += " XMLHttpRequest " + XMLHttpRequest.status ;
                msg += " textStatus " + textStatus ;
                console.log( msg );
		alert(GH_ERROR_MSG['polylinedatacannotload']);
            });
        }
    }
    
};

function ghGetLineStationModel(id) {
    
    var way = GH_FIELD.linejson[id].way;
    for ( var k=0,klen=way.length; k < klen; k++ ) {
        if ( way[k].station3d != "" ) {
            var uri = ghGetResourceUri(GH_FIELD.linejson[id].baseuri + way[k].station3d);
            var stpromise = Cesium.GeoJsonDataSource.load( uri );
            stpromise.then(function (dataSource) {
                var p = dataSource;
                //Get the array of entities
                var ent = dataSource.entities.values;
                for (var j = 0; j < ent.length; j++) {
                    var entity = ent[j];
                    entity.polygon.material = Cesium.Color.GREY;
                    entity.polygon.outline = false;
                    entity.polygon.extrudedHeight = 1;
                    entity.polygon.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
                }
                GH_V.dataSources.add(p);
                GH_ENTITY.station.push ( p );
            }).otherwise(function (error) {
                //Display any errrors encountered while loading.
                //window.alert(error);
                var msg = "station geojson file cannot load " + uri + " ";
                msg += " XMLHttpRequest " + XMLHttpRequest.status ;
                msg += " textStatus " + textStatus ;
                console.log( msg );        
            });   
        }
    }
    
};
function ghGetLineLonLat(id) {
    
    var way = GH_FIELD.linejson[id].way;

    for ( var k=0,klen=way.length; k < klen; k++ ) {
    
        var lonlat = way[k].lonlat;
        for ( var i=0,ilen=lonlat.length; i < ilen; i++ ) {
            var uri = ghGetResourceUri(GH_FIELD.linejson[id].baseuri + lonlat[i]);
            $.ajax({
                dataType: "json",
                url: uri
            }).done(function(data) {
                ghCreateCesiumGroundPolyline(data);
            }).fail(function(XMLHttpRequest, textStatus,errorThrown){
                var msg = "Line Lot Lng Cannot load " + uri + "  ";
                msg += " XMLHttpRequest " + XMLHttpRequest.status ;
                msg += " textStatus " + textStatus ;
                console.log( msg );
		alert(GH_ERROR_MSG['linegeometrycannotload']);
            });
        }
    }
}

//
//   Load Line JSON data
//
function ghGetFieldLine(file) {
    var uri = ghGetResourceUri(file);
    $.ajax({
	dataType: "json",
	url: uri
    }).done(function(data) {
	GH_FIELD.linejson[data.id] = data;

        ghGetLinePolyline(data.id);
        ghGetLineStationModel(data.id);
        ghGetLineLonLat(data.id);
        ghCreateLineChart(data.id);
        ghWaitFieldLineLoaded(ghGetFieldLineFinished);
        
    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
	var msg = "Field Component Cannot load  " + id + " " + file + "  ";
	msg += " XMLHttpRequest " + XMLHttpRequest.status ;
	msg += " textStatus " + textStatus ;
	console.log( msg );
	alert(GH_ERROR_MSG['fieldcomponentcannotload']);
    });
}
///////////////////////////////////
//
// Field Data Loading Start!
//
////////////////////////////////
function ghGetFieldCustomData(fd) {
    GH_FIELD_PROP.id = 'custom';
    GH_FIELD_PROP.customfile = 'custom/' + fd + ".json";
    ghGetFieldData(ghGetResourceUri(GH_FIELD_PROP.customfile));
};
function ghGetFieldData(uri) {
    ghShowLoader(true);
    ghOnclick2DdialogButton(11); // Open 2D map if closed
    GH_FIELD_PROP.isok = false;

    //////////////
    //  Field data
    //var file = GH_RESOURCE_ROOT + GH_BLOCKINDEX.blocklist[tcode].filedata;
    $.ajax({
	dataType: "json",
	url: uri
    }).done(function(data) {

	// Force Stop
	GH_IS_PLAYING = true;
	ghOnclickPauseButton();
	ghEnablePlayButton(false);
	// Force Stop
	
        ghClearCesiumData();
        ghClearLeafletData();
	ghClearPickData();

	//
	// GH_FIELD data input
	//
	GH_FIELD = data;
	ghGetFieldGLTF();


	//
	//  Send Urilist foe Unit Worker thread
	//
        ghUnitWorkerSetUrilist(GH_URILIST);
        
	GH_FIELD.linejson = {}; // for loaded line json object
        for(var key in GH_FIELD.lines){
            ghGetFieldLine(GH_FIELD.lines[key]);
	}

	ghSetTitleLineinfo(GH_FIELD.name+" "+GH_FIELD.description);

    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
	var msg = "train data cannot load ";
	msg += " XMLHttpRequest " + XMLHttpRequest.status ;
	msg += " textStatus " + textStatus ;
	console.log( msg );
	alert(GH_ERROR_MSG['traindatacannotload']);

	ghShowLoader(false);
    });

}

    
/////////////////////////////////////////////////////////////
function getUnmaskedInfo(gl) {
    var unMaskedInfo = {
        renderer: '',
        vendor: ''
    };
    var dbgRenderInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (dbgRenderInfo != null) {
        unMaskedInfo.renderer = gl.getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL);
        unMaskedInfo.vendor   = gl.getParameter(dbgRenderInfo.UNMASKED_VENDOR_WEBGL);
    }
    return unMaskedInfo;
}

function ghCheckData(tc,str) {

    // Ignored Google Bot
    //var userAgent = window.navigator.userAgent.toLowerCase();
    var ua = window.navigator.userAgent;
    if(ua.indexOf('Googlebot') != -1) {
        return;
    }    
    
    var language = (window.navigator.languages && window.navigator.languages[0]) ||
            window.navigator.language ||
            window.navigator.userLanguage ||
            window.navigator.browserLanguage;
    var txt = "plathome " + navigator.platform + " Core: " + navigator.hardwareConcurrency + "\n";
    txt += "train code " + tc + "\n";
    txt += "train desc " + str + "\n";
    txt += "width :" + window.screen.width + "\n";
    txt += "height :" + window.screen.height + "\n";
    txt += "href :" +  location.href + "\n";
    txt += "referrer :" + document.referrer + "\n";
    
    // canvas = GH_S.canvas
    var gl = GH_V.scene.canvas.getContext('webgl');
    var webgl = "version:" + gl.getParameter(gl.VERSION) + "\n";
    webgl += "shading:" + gl.getParameter(gl.SHADING_LANGUAGE_VERSION) + "\n";
    webgl += "vendor:" + gl.getParameter(gl.VENDOR) + "\n";
    webgl += "renderer:" + gl.getParameter(gl.RENDERER) + "\n";
    webgl += "unMaskVendor:" + getUnmaskedInfo(gl).vendor + "\n";    
    webgl += "unMaskRenderer:" + getUnmaskedInfo(gl).renderer + "\n";    
    webgl += "texture size:" + gl.getParameter(gl.MAX_TEXTURE_SIZE);
    
    var ret = txt + "\n" + webgl;
    
    $.ajax({
        type: "POST",
        url: "//earth.geoglyph.info/cgi/contactform.php",
 	data: {
	    "language": language ,
	    "name": "ghRailNeo3",
            "checktype": "Rail",
	    "email" : "info@geoglyph.info", 
	    "subject" : window.navigator.userAgent,
	    "message" : ret
	}
    }).done(function(data) {
        // NOP
    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
        var msg = "check contact query error ";
        msg += " XMLHttpRequest " + XMLHttpRequest.status ;
        msg += " textStatus " + textStatus ;
	console.log( msg );
    });
};

function ghSetAboutContent() {
    var data = "";
    data += GH_REV + '<BR>';
    data += '<BR>';
    data += window.navigator.userAgent + '<BR>';
    data += 'Plathome:' + navigator.platform + '<BR>';
    data += 'Cesium :' + Cesium.VERSION + '&nbsp;&nbsp;' + 'Leaflet :' + L.version + '&nbsp;&nbsp;' + 'jQuery :' + jQuery.fn.jquery + '<BR>';     
    $('#gh_aboutcontent').html(data);
};
/////////////////////////////////////////////////////////////
function ghGetHtmlArgument(type) {

    var str = location.search.substring(1);
    var ret = "nop";
    if (str) {
        var x = str.split("&");
        for(var i=0,len=x.length;i<len;i++){
            var y = x[i].split("=");
            if ( y[0] == "tc" && type == "tc" ) {
                if ( y[1] in GH_FIELDINDEX.fieldlist ){
                    ret = y[1];
                }
            }
            if ( y[0] == "fd" && type == "fd" ) {
                ret = y[1];
            }
        }
    }
    return ret;

}
function ghDelayStart() {

    var tc = ghGetHtmlArgument("tc");
    var fd = ghGetHtmlArgument("fd");

    if ( tc == "nop" ) {
	if ( fd == "nop" ) {
	    // For begginers
	    $('#gh_startmodal').modal('open');
	} else {
	    ghGetFieldCustomData(fd);
	}
    } else {
	// load tc
	GH_FIELD_PROP.id = tc;
	ghGetFieldData(ghGetResourceUri(GH_FIELDINDEX.fieldlist[tc].file));
    }
    
    ghSetAboutContent();
    
}

function ghAvoidOperation() {
    history.pushState(null, null, null);
    $(window).on("popstate", function (event) {
        if (!event.originalEvent.state) {
            alert('Attension reload button, if wrong operation? ---');
            history.pushState(null, null, null);
            return;
        }
    });
    window.addEventListener('beforeunload', function(e) {
        e.returnValue = 'Attension reload button, if wrong operation AA';
    }, false);
}

/////////////////////////////
//
//  Broadcast Channel
//https://www.digitalocean.com/community/tutorials/js-broadcastchannel-api
//https://developers.google.com/web/updates/2016/09/broadcastchannel
//

function ghBroadcastUpdateTime() {
    var t = $('#gh_currenttime').html();
    var tt = t.split(":");
    var str = tt[0] + ":" + tt[1];
    var sp = 1;
    if ( GH_V != null ) {
	sp = GH_V.clock.multiplier;
    }
    var data = { time : str , speed : sp };
    ghBroadcastSendTime(data);
};

function ghBroadcastPrimaryReceiveMessage(data) {
    if (data.type == 'INITCONNECTION') {
	var linedata = GH_FIELD.linejson[GH_FIELD_PROP.timetable.lineid];
	var initdata = { 
            "yourid": null,
	    "name" : GH_FIELD.name ,
            "description" : linedata.description,
            "lineid" : GH_FIELD_PROP.timetable.lineid,
            "way" : [
		{
                    "direction" : linedata.way[0].direction,
                    "station": linedata.way[0].stations
		},
		{
                    "direction" : linedata.way[1].direction,
                    "station": linedata.way[1].stations
		}
            ],
            urilist :GH_URILIST
	}; 
	ghBroadcastSendUniqueID(initdata);
    } else if (data.type == 'GETUNITS') {
	var oid = data.sender;
	if ( ghBroadcastCheckSender(oid) ) {
	    if ( data.value.lineid == GH_FIELD_PROP.timetable.lineid ) {
		var data = { "marker" : GH_FIELD.marker ,
			     "locomotive" : GH_FIELD.locomotive,
			     "units" : GH_FIELD.units }; 
		ghBroadcastSendUnits(oid,data);
	    } else {
		var t = "Receive ID " + data.value.lineid + " modal ID " + GH_FIELD_PROP.timetable.lineid;
		console.log(t);
	    }
	}
    } else if (data.type == 'CLOSE') {
	var oid = data.sender;
	if ( ghBroadcastCheckSender(oid) ) {
	    ghBroadcastRemoveID(oid);
	} else {
	    // NOP
	}
    } else if (data.type == 'UPDATEUNITS') {
	var oid = data.sender;
	if ( ghBroadcastCheckSender(oid) ) {
            $('#gh_update_timetable_line').html(data.value.name);
	    GH_UPDATE_UNIT = data.value.units;
	    $( '#gh_update_timetable_lineid' ).val(data.value.lineid);
            //$( '#gh_update_timetable_way' ).val(data.value.way);
	    $('#gh_updatemodal').modal('open');
            
            // Update OK -> call for ghUpdateTimetableModal();
	} else {
	    // NOP
	}
    }
}
////////////
if(window.BroadcastChannel){
    ghBroadcastSetup('primary',ghBroadcastPrimaryReceiveMessage);
} else {
    console.log("Broadcast Channel Not Supported. \nThis application does not work your browser.");
    alert(GH_ERROR_MSG['broadcastnotsupport']);
}

//
//  Broadcast Channel Function
//
/////////////////////////////

////////////////////////////////////////////////
//   Document Start
//
////////////////////////////////////////////////
$(document).ready(function(){

    if(typeof jQuery == "undefined"){ //jQuery
        alert('Cannot load jQuery.. ');
	alert(GH_ERROR_MSG['jquerylibrarynotsupport']);
    }
    if(typeof L == "undefined"){ //leaflet
        alert('Cannot load leaflet.. ');
	alert(GH_ERROR_MSG['leafletlibrarynotsupport']);
    }


    ghInitMaterializeUI();
    ghInitFieldIndex();
    
    ghInitLeafletMap();
    ghInitCesium();
    ghSetCesiumQuality(70);
	
    ghInitSpeedoMeter();

    setTimeout(ghDelayStart, 1234);

    //ghAvoidOperation();

});

console.log( " Cesium " + Cesium.VERSION + " jQuery " + jQuery.fn.jquery + " leaflet " + L.version );
