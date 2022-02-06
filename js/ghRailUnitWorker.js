//
//
// ghRailUnitWorker
//
//   Create CZML data from Unit data
//
//  parseInt(x,10) => x|0;
//  
//  IN
//   lng longitude (degree) => tileX
//   lat latitude  (degree) => tileY
//
//
//

//it looks like the ugly hack.
// global is undefined error
// https://github.com/aspnet/AspNetCore/issues/6979
// for importScripts('../cesium/Cesium.js');
//
//const window = self.window = self;
window = self.window = self;

//importScripts('turf3DtileWorker.min.js');
importScripts('../../cesium/Cesium.js');

//var GH_RESOURCE_ROOT = '../RSC/';
//var GH_LOCOMOTIVE_ROOT = GH_RESOURCE_ROOT + 'locomotive/';
var GH_USE_TUNNEL = true;
var GH_USE_BRIDGE = false;

// https://github.com/AnalyticalGraphicsInc/czml-writer/wiki/CZML-Guide
var CZML = [];
var CZML_POSITION = [];
var UNITGEOM = [];
var UNITGEOMPROP = [];
var UNITTIME = [];

var GH_FIELD = null;
var GH_URILIST = null;
function ghGetResourceUri(file) {
    var idx = Math.floor(Math.random() * GH_URILIST.length);
    var u = GH_URILIST[idx] + file;
    return u
}
//var GH_DISTANCEFROMCENTER_MIN = 40; // [m] Distance from the center position
//var GH_DISTANCEFROMCENTER_MAX = 100; // [m] Distance from the center position
var GH_DISTANCEFROMCENTER = 40; // [m]  Proberbly check each train length..   more better,
//
//
var ACCL_RATIO = [];
//ACCL_RATIO[0] = 0.06 ; //  0.01 < ratio < 0.4
//ACCL_RATIO[1] = 0.11 ; //  0.1 < ratio < 0.4
ACCL_RATIO[0] = 0.11 ; //  0.01 < ratio < 0.4
ACCL_RATIO[1] = 0.19 ; //  0.1 < ratio < 0.4

var STOP_TIME = 30 ; // [sec] 

///////////////////////////////////////

function __ghSimulateTwoPoints(x,t,d,v) {
    //   x = distance from startpoint
    //   t = time interval between start point  and end point
    //   d = distance between start point  and end point
    //   v = velocity at start point
    
    var alpha = 2 * ( d - v * t ) / ( t * t );
    var ret = 0;
    var param = 0;
    if ( Math.abs(alpha) < 0.001 && v != 0 ) {
        // nearly constat velocity   
        ret = x / v ;
    } else {
        param = v * v + 2 * alpha * x;
        if ( param < 0 ) param = 0;
        ret = ( -1 * v + Math.sqrt( param ) ) / alpha;
        if ( ret < 0 ) ret = 0;
    }
    
    if ( isFinite(ret) ) {
        // NOP
    } else {
        ret = 0.0;
        var msg = " ret=" + ret + " x=" + x + " t=" + t + " d=" + d + " v=" + v;
        console.log(msg);
    }
    return ret;
}
function ghSimulateStationToStation(startidx,stopidx,distance,sec,startsec) {

    var x = 0;
    var y = 0;
    var vel = distance / ( ( 1 - ACCL_RATIO[0] ) * sec );
    var xbound = [];
    xbound[0] = ( ACCL_RATIO[0] * distance ) / ( 2 * ( 1 - ACCL_RATIO[0] ) );
    xbound[1] = ( ( 2 - 3 * ACCL_RATIO[0] ) * distance ) / ( 2 * ( 1 - ACCL_RATIO[0] ) );
    var ybound = [];
    ybound[0] = ACCL_RATIO[0] * sec;
    ybound[1] = ( 1 - ACCL_RATIO[0] ) * sec;

    var lng0 = 1.0 * UNITGEOM[ startidx-1 ].lng.toFixed(9) ;
    var lat0 = 1.0 * UNITGEOM[ startidx-1 ].lat.toFixed(9) ;
    var alt0 = 1.0 * UNITGEOM[ startidx-1 ].alt.toFixed(3) ;
    var p0 = new Cesium.Cartesian3.fromDegrees(lng0,lat0,alt0);
    
    for ( var j=startidx;j<stopidx; j++ ) {
        var lng1 = 1.0 * UNITGEOM[ j ].lng.toFixed(9) ;
        var lat1 = 1.0 * UNITGEOM[ j ].lat.toFixed(9) ;
        var alt1 = 1.0 * UNITGEOM[ j ].alt.toFixed(3) ;
        var p1 = new Cesium.Cartesian3.fromDegrees(lng1,lat1,alt1);
        x += Cesium.Cartesian3.distance(p0,p1);         
        
        if ( x >= 0 && x < xbound[0] ) {
            // Accle
            y = __ghSimulateTwoPoints( x, ACCL_RATIO[0] * sec , xbound[0] , 0);
        } else if ( x >= xbound[0] && x <= xbound[1] ) {
            // Vel
            y = __ghSimulateTwoPoints( x - xbound[0], ( 1 - 2 * ACCL_RATIO[0] ) * sec , xbound[1] - xbound[0] , vel) + ybound[0];
        } else if ( x > xbound[1] && x <= distance + 0.1 ) {
            //  0.1 margin for error
            // De-Accel
            y = __ghSimulateTwoPoints( x - xbound[1], ACCL_RATIO[0] * sec , xbound[0] , vel)  + ybound[1];
        } else {
            // Wrong parameter   
            var msg = "start" + startidx + " stop " + stopidx + " distance " + distance + " sec " + sec + " total " + startsec + " x " + x + " j " + j;
            console.log(msg);
        }
        var ysec = 1.0 * y.toFixed(1);

        CZML_POSITION.push( startsec + ysec );
        CZML_POSITION.push(lng1);
        CZML_POSITION.push(lat1);
        CZML_POSITION.push(alt1);

        p0 = p1;
        
    }
};
function ghSimulateStationToPassing(startidx,stopidx,distance,sec,startsec) {

    var x = 0;
    var y = 0;
    var vel = 2 * distance / ( ( 2 - ACCL_RATIO[1] ) * sec );
    var xbound = [];
    xbound[0] = ( ACCL_RATIO[1] * distance ) / ( 2 - ACCL_RATIO[1] );

    var ybound = [];
    ybound[0] = ACCL_RATIO[1] * sec;


    var lng0 = 1.0 * UNITGEOM[ startidx-1 ].lng.toFixed(9) ;
    var lat0 = 1.0 * UNITGEOM[ startidx-1 ].lat.toFixed(9) ;
    var alt0 = 1.0 * UNITGEOM[ startidx-1 ].alt.toFixed(3) ;
    var p0 = new Cesium.Cartesian3.fromDegrees(lng0,lat0,alt0);
    
    for ( var j=startidx;j<stopidx; j++ ) {
        var lng1 = 1.0 * UNITGEOM[ j ].lng.toFixed(9) ;
        var lat1 = 1.0 * UNITGEOM[ j ].lat.toFixed(9) ;
        var alt1 = 1.0 * UNITGEOM[ j ].alt.toFixed(3) ;
        var p1 = new Cesium.Cartesian3.fromDegrees(lng1,lat1,alt1);
        x += Cesium.Cartesian3.distance(p0,p1);         
        
        if ( x >= 0 && x < xbound[0] ) {
            // Accle
            y = __ghSimulateTwoPoints( x, ACCL_RATIO[1] * sec , xbound[0] , 0);
        } else if ( x >= xbound[0] && x <= distance + 0.1 ) {
            // Vel
            y = __ghSimulateTwoPoints( x - xbound[0], ( 1 - ACCL_RATIO[1] ) * sec , distance - xbound[0] , vel) + ybound[0]; 
        } else {
            // Wrong parameter   
            var msg = "start" + startidx + " stop " + stopidx + " distance " + distance + " sec " + sec + " total " + startsec + " x " + x + " j " + j;
            console.log(msg);
        }
        var ysec = 1.0 * y.toFixed(1);
      
        CZML_POSITION.push( startsec + ysec );
        CZML_POSITION.push(lng1);
        CZML_POSITION.push(lat1);
        CZML_POSITION.push(alt1);

        p0 = p1;
        
    }
};

function ghSimulatePassingToStation(startidx,stopidx,distance,sec,startsec) {

    var x = 0;
    var y = 0;
    var vel = 2 * distance / ( ( 2 - ACCL_RATIO[1] ) * sec );
    var xbound = [];
    xbound[0] = 2 * ( 1 - ACCL_RATIO[1] ) * distance / ( 2 - ACCL_RATIO[1] );
    var ybound = [];
    ybound[0] = ( 1 - ACCL_RATIO[1] ) * sec;

    var lng0 = 1.0 * UNITGEOM[ startidx-1 ].lng.toFixed(9) ;
    var lat0 = 1.0 * UNITGEOM[ startidx-1 ].lat.toFixed(9) ;
    var alt0 = 1.0 * UNITGEOM[ startidx-1 ].alt.toFixed(3) ;
    var p0 = new Cesium.Cartesian3.fromDegrees(lng0,lat0,alt0);
    
    for ( var j=startidx;j<stopidx; j++ ) {
        var lng1 = 1.0 * UNITGEOM[ j ].lng.toFixed(9) ;
        var lat1 = 1.0 * UNITGEOM[ j ].lat.toFixed(9) ;
        var alt1 = 1.0 * UNITGEOM[ j ].alt.toFixed(3) ;
        var p1 = new Cesium.Cartesian3.fromDegrees(lng1,lat1,alt1);
        x += Cesium.Cartesian3.distance(p0,p1);         
        
        if ( x >= 0 && x < xbound[0] ) {
            // Vel 
            y = __ghSimulateTwoPoints( x, ( 1 - ACCL_RATIO[1] ) * sec , xbound[0] , vel);
        } else if ( x >= xbound[0] && x <= distance + 0.1 ) {
            // De-Accel
            y = __ghSimulateTwoPoints( x - xbound[0], ACCL_RATIO[1] * sec , distance - xbound[0] , vel) + ybound[0]; 
        } else {
            // Wrong parameter   
            var msg = "start" + startidx + " stop " + stopidx + " distance " + distance + " sec " + sec + " total " + startsec + " x " + x + " j " + j;
            console.log(msg);
        }
        var ysec = 1.0 * y.toFixed(1);
     
        CZML_POSITION.push( startsec + ysec );
        CZML_POSITION.push(lng1);
        CZML_POSITION.push(lat1);
        CZML_POSITION.push(alt1);

        p0 = p1;
        
    }
};

function ghSimulatePassingToPassing(startidx,stopidx,distance,sec,startsec) {

    var x = 0;
    var y = 0;
    var vel = distance / sec;

    var lng0 = 1.0 * UNITGEOM[ startidx-1 ].lng.toFixed(9) ;
    var lat0 = 1.0 * UNITGEOM[ startidx-1 ].lat.toFixed(9) ;
    var alt0 = 1.0 * UNITGEOM[ startidx-1 ].alt.toFixed(3) ;
    var p0 = new Cesium.Cartesian3.fromDegrees(lng0,lat0,alt0);
    
    for ( var j=startidx;j<stopidx; j++ ) {
        var lng1 = 1.0 * UNITGEOM[ j ].lng.toFixed(9) ;
        var lat1 = 1.0 * UNITGEOM[ j ].lat.toFixed(9) ;
        var alt1 = 1.0 * UNITGEOM[ j ].alt.toFixed(3) ;
        var p1 = new Cesium.Cartesian3.fromDegrees(lng1,lat1,alt1);
        x += Cesium.Cartesian3.distance(p0,p1);         
        
        // Vel 
        y = __ghSimulateTwoPoints( x, sec , distance , vel);
        var ysec = 1.0 * y.toFixed(1);
      
        CZML_POSITION.push( startsec + ysec );
        CZML_POSITION.push(lng1);
        CZML_POSITION.push(lat1);
        CZML_POSITION.push(alt1);

        p0 = p1;
        
    }
};


function __ghCreateTimePositionArray() {
    CZML_POSITION = [];
    //var totaldistance = 0;
    var totalsec = 0;
    var distance = 0;
    var sec = 0;
 
    let fgeoidx = UNITTIME[0].geoindex;
    var lng0 = 1.0 * UNITGEOM[ fgeoidx ].lng.toFixed(9) ;
    var lat0 = 1.0 * UNITGEOM[ fgeoidx ].lat.toFixed(9) ;
    var alt0 = 1.0 * UNITGEOM[ fgeoidx ].alt.toFixed(3) ;
    //var p0 = new Cesium.Cartesian3.fromDegrees(lng0,lat0,alt0);
    CZML_POSITION.push(totalsec);
    CZML_POSITION.push(lng0);
    CZML_POSITION.push(lat0);
    CZML_POSITION.push(alt0);
    
    var ilen = UNITTIME.length;
    for ( var i=1; i < ilen; i++ ) {
	    //distance = 0;
	    //sec = 0;
    	if ( UNITTIME[i].geoindex == UNITTIME[i].prevgeoindex ) {
            // Dont Move
            var j = UNITTIME[i].prevgeoindex;
	        var lng1 = 1.0 * UNITGEOM[ j ].lng.toFixed(9) ; // XX.XXXXXXXXX
    	    var lat1 = 1.0 * UNITGEOM[ j ].lat.toFixed(9) ; // XX.XXXXXXXXX
    	    var alt1 = 1.0 * UNITGEOM[ j ].alt.toFixed(3) ; // XX.XXX
	        //var p1 = new Cesium.Cartesian3.fromDegrees(lng1,lat1,alt1);
	        sec = UNITTIME[i].timeinterval;
	        CZML_POSITION.push( totalsec + sec );
	        CZML_POSITION.push(lng1);
	        CZML_POSITION.push(lat1);
    	    CZML_POSITION.push(alt1);
            
        } else {
    
            var startidx = UNITTIME[i-1].geoindex+1;
            var stopidx = UNITTIME[i].geoindex+1;
            distance = UNITTIME[i].betweendistance;
            sec = UNITTIME[i].timeinterval;
            
            if ( UNITTIME[i-1].type < GH_TYPE_THROUGH && UNITTIME[i].type < GH_TYPE_THROUGH ) {
                //  station - station
                ghSimulateStationToStation(startidx,stopidx,distance,sec,totalsec);
            } else if ( UNITTIME[i-1].type < GH_TYPE_THROUGH && UNITTIME[i].type > GH_TYPE_DEPATURE ) {
                //  station - through
                ghSimulateStationToPassing(startidx,stopidx,distance,sec,totalsec);
            } else if ( UNITTIME[i-1].type > GH_TYPE_DEPATURE && UNITTIME[i].type < GH_TYPE_THROUGH ) {
                //  through - station
                ghSimulatePassingToStation(startidx,stopidx,distance,sec,totalsec);
            } else {
                //  through - through
                ghSimulatePassingToPassing(startidx,stopidx,distance,sec,totalsec);
            }
                
        }
	    totalsec += sec;

    }
    
    // Last Stop exist 1 minutes at 1[m] position
    fgeoidx = UNITTIME[ilen-1].geoindex;
    var lastlatlng = __ghCalcStopPoint(fgeoidx,1.0);
    CZML_POSITION.push(totalsec + STOP_TIME );
    CZML_POSITION.push(lastlatlng.lng);
    CZML_POSITION.push(lastlatlng.lat);
    CZML_POSITION.push(lastlatlng.alt);    

    //var lng0 = 1.0 * UNITGEOM[ fgeoidx ].lng.toFixed(9) ;
    //var lat0 = 1.0 * UNITGEOM[ fgeoidx ].lat.toFixed(9) ;
    //var alt0 = 1.0 * UNITGEOM[ fgeoidx ].alt.toFixed(3) ;
    //CZML_POSITION.push(totalsec+ STOP_TIME );
    //CZML_POSITION.push(lng0);
    //CZML_POSITION.push(lat0);
    //CZML_POSITION.push(alt0);    
    
    //console.log(CZML_POSITION);
}

function __ghCalcStopPoint(idx,meter) {

    var lng0 = 1.0 * UNITGEOM[ idx - 1 ].lng;
    var lat0 = 1.0 * UNITGEOM[ idx - 1 ].lat;
    var alt0 = 1.0 * UNITGEOM[ idx - 1 ].alt;
    var p0 = new Cesium.Cartesian3.fromDegrees(lng0,lat0);

    var lng1 = 1.0 * UNITGEOM[ idx ].lng;
    var lat1 = 1.0 * UNITGEOM[ idx ].lat;
    var alt1 = 1.0 * UNITGEOM[ idx ].alt;
    var p1 = new Cesium.Cartesian3.fromDegrees(lng1,lat1);

	let dis = Cesium.Cartesian3.distance(p0,p1);
    let ratio = ( dis + meter ) / dis; // meter[m] far from STOP geometry

    var nextp = new Cesium.Cartesian3();
    Cesium.Cartesian3.lerp(p0, p1, ratio, nextp) ;                   
    var cpos = new Cesium.Cartographic.fromCartesian( nextp );
    var ret = {
            "lng" : Cesium.Math.toDegrees(cpos.longitude),
            "lat" : Cesium.Math.toDegrees(cpos.latitude),
            "alt" : alt1
        }
    return ret;
}

function __ghCreateAvailabilityString() {
    var ss = __ghCreateCesiumClock("0T00:00:00",GH_FIELD.timezone);
    var ee = __ghCreateCesiumClock("0T23:59:59",GH_FIELD.timezone);
    return ss.toString() + "/" + ee.toString();
}
function __ghCreateTimetableHtml(id) {
    var ta = GH_FIELD.units[id].timetable;
    var ret = "<table>";
    //
    // timetable array 3 step each
    //
    for ( var i=0,ilen=ta.length; i < ilen; i=i+3 ) {
        var point = parseInt(ta[i+2],10);
                
        if ( point < GH_TYPE_THROUGH ) {
            var t = ta[i];   // time
            var tt = t.split("T");
            var tm = tt[1].split(":");
            ret += "<tr><td>" + ta[i+1] + "</td><td>" + tm[0] + ":" + tm[1] + "</td></tr>";
        }
    }
    ret += "</table>";
    return ret;
}

function __ghLoadDefaultLocomotiveModel(file) {
    var dlm = new XMLHttpRequest();
    //trn.open('GET', file , true); async
    dlm.open('GET', file , false);
    dlm.onreadystatechange = function() {
	if (dlm.readyState == 4 && dlm.status == 200) {
            if (dlm.response) {
		GH_FIELD.gltf = JSON.parse(dlm.responseText);
            }
	} else {
	    var msg = "Locomotive data load error " + dlm.status;
	    console.log( msg );
	}
    }
    dlm.send();
}
function __ghLoadUnitLocomotiveModel( id ) {
    if ( GH_FIELD.units[id].locomotive == "default" ) {
	GH_FIELD.units[id].gltf = GH_FIELD.gltf;
	return;
    }

    var glb = new XMLHttpRequest();
    glb.open('GET', file , false);
    glb.onreadystatechange = function() {
	if (glb.readyState == 4 && glb.status == 200) {
            if (glb.response) {
		GH_FIELD.units[id].gltf = JSON.parse(trn.responseText);
            }
	} else {
	    var msg = "Locomotive data load error " + glb.status;
	    console.log( msg );
	}
    }
    glb.send();

    
    
}
///////////////////////////////////
//
//   Send to Parent
//
///////////////////////////////////
function __ghPostJsonToParent( jsonobj ) {
    var uint8_array = new TextEncoder().encode( JSON.stringify(jsonobj) );
    var array_buffer = uint8_array.buffer;
    self.postMessage(array_buffer, [array_buffer]);
}

//////////////////
function __ghCreateUnitCzml( id ) {
    //var uint8_array = new TextEncoder().encode( JSON.stringify(json) );
    //var array_buffer = uint8_array.buffer;
    //self.postMessage(array_buffer, [array_buffer]);

    CZML = [];

    var entityname = GH_FIELD.id + "_" + GH_FIELD.units[id].trainid;
    var title = {
	"name": entityname,
	"version": "1.4",
	"id": "document"
    };
    CZML.push(title);
    var desc = GH_FIELD.units[id].trainid + " " + GH_FIELD.description;
    var interval = UNITTIME[0].clock.toString() + "/" + UNITTIME[UNITTIME.length-1].clock.toString();

    __ghCreateTimePositionArray();
    
    // Box
    var obj1 = {
	"id": GH_FIELD.units[id].trainid,
	"availability": __ghCreateAvailabilityString(),
	"description": __ghCreateTimetableHtml(id),
	"name": desc,
	"box" : {
	    "dimensions" : {
		"cartesian" : [1.0, 1.0, 1.0],
	    },
	    "fill" : false,
	    "outline": true,
	    "outlineColor": {
		"rgba": [64, 64, 64, 64]
	    }
	},
	"position": {
	    "interpolationAlgorithm": "LAGRANGE",
	    "interpolationDegree": 1,
	    "cartographicDegrees": CZML_POSITION,
	    "epoch": UNITTIME[0].clock.toString()
	},
	"orientation": {
	    "velocityReference": "#position"
	}
    };
    CZML.push(obj1);

    __ghPostJsonToParent( CZML );
    
}


function __ghCalcGeometryDistance(id0,id1) {
    var ret = 0;
    if ( id0 < 0 ) id0 = 0;
    var p0 = new Cesium.Cartesian3.fromDegrees(
	parseFloat( UNITGEOM[id0].lng ),
	parseFloat( UNITGEOM[id0].lat ),
	parseFloat( UNITGEOM[id0].alt )
    );

    for ( var i=id0+1; i < id1+1; i++ ) {
	var p1 = new Cesium.Cartesian3.fromDegrees(
	    parseFloat( UNITGEOM[i].lng ),
	    parseFloat( UNITGEOM[i].lat ),
	    parseFloat( UNITGEOM[i].alt )
	);
	ret += Cesium.Cartesian3.distance(p0,p1);
	p0 = p1;
    }

    return ret;
    
}


function __ghSearchStationName2GeometryIndex(name) {
    for ( var i=0,ilen=UNITGEOM.length; i < ilen; i++ ) {
	if ( UNITGEOM[i].sta == name ) {
            return i;
        }
    }
    return 0
}


function __ghCreateCesiumClock(str,timezone) {
    //
    //  str = "0T08:28:00";
    //  offset = 90 ; // min
    // ISO8601
    // https://qiita.com/kidatti/items/272eb962b5e6025fc51e
    //
    var t = str.split("T");
    var td = parseInt(t[0],10);
    var d = new Date();

    if ( td > 0 ) {
	    d.setDate(d.getDate() + td );
    }
    
    var year = d.getFullYear();
    var month = d.getMonth() + 1;
    if ( month < 10 ) {
	    month = "0" + month;
    }
    var ddd = d.getDate();
    if ( ddd < 10 ) {
	    ddd = "0" + ddd;
    }
    
    var datetime = year + "-" + month + "-" + ddd + "T" + t[1] + ".000" + timezone;

    //2014-10-10T13:50:40+09:00  Timezone
    //2014-10-10T13:50:40Z     UTC
    
    //2021-03-01T07:50:00.000Z
    return Cesium.JulianDate.fromIso8601(datetime, new Cesium.JulianDate());
}

var GH_TYPE_ARRIVAL = 2;
var GH_TYPE_DEPATURE = 4;
var GH_TYPE_THROUGH = 7;

function __ghCreateUnitTimetable(id) {
    var ta = GH_FIELD.units[id].timetable;
    UNITTIME = [];

    var pidx = 0;
    var pclk = null;

    for ( var i=0,ilen=ta.length; i < ilen; i=i+3 ) {
        var point = parseInt(ta[i+2],10);

        var idx = __ghSearchStationName2GeometryIndex(ta[i+1]);
        var clk = __ghCreateCesiumClock(ta[i],GH_FIELD.timezone);
        if ( i == 0 ) {
            pclk = clk.clone();
            pidx = idx;
        } else {
            // NOP
        }
        var obj = {
            "clock" : clk,
            "station" : ta[i+1],
            "type" : point,
            "geoindex" : idx,
            "prevgeoindex" : pidx,
            "timeinterval" :  Cesium.JulianDate.secondsDifference(clk,pclk),
            "betweendistance" :  __ghCalcGeometryDistance(pidx,idx)
        };
        UNITTIME.push(obj);
        
        pclk = clk.clone();
        pidx = idx;
    }
//Array(4)
//0: {clock: JulianDate, station: "London St Pancras", geoindex: 0, prevgeoindex: 0, timeinterval: 0, …}
//1: {clock: JulianDate, station: "Ebbsfleet", geoindex: 346, prevgeoindex: 0, timeinterval: 900, …}
//2: {clock: JulianDate, station: "Ebbsfleet", geoindex: 346, prevgeoindex: 346, timeinterval: 60, …}
//3: {clock: JulianDate, station: "Paris Nord", geoindex: 4624, prevgeoindex: 346, timeinterval: 7500, …}
    //console.log(UNITTIME);
}

var GH_TUNNEL_PROP = {
    "depth": -20.0,
    "minlength" : 100.0
}

function __ghCalculateTunnelAltitude(idx) {
    // idx   => 48.882105,2.355226,99.885430,non
    // idx+1 => #P,gu=1435:ms=60:
    // idx+2 => 48.882105,2.355226,99.885430,non

    var firstid = idx;
    var lastid = idx;
    for (var i = idx+1; i < UNITGEOMPROP.length; i++) {
    	var prop = UNITGEOMPROP[i];
    	if ( prop != null && prop.tunnel ) {
	        lastid = i;
	    } else {
    	    break;
    	}
    }

    for (var i = idx; i > -1; i--) {
    	var prop = UNITGEOMPROP[i];
    	if ( prop != null && prop.tunnel ) {
	        firstid = i;
	    } else {
    	    break;
    	}
    }
    if ( firstid > lastid ) return null;
    
    var distance = __ghCalcGeometryDistance(firstid,lastid);
    if ( distance < GH_TUNNEL_PROP.minlength ) {
    	// Too short tunnell 
    	return null;
    } else {
    	var distance_prev = __ghCalcGeometryDistance(firstid,idx);
    	var distance_post = __ghCalcGeometryDistance(idx,lastid);
	
    	var alt_diff = UNITGEOM[lastid].alt - UNITGEOM[firstid].alt;
    	var alt_ratio = distance_prev / distance ;
    	var calc_alt = UNITGEOM[firstid].alt + alt_diff * alt_ratio ;
    	if ( alt_ratio < 0.1 ) {
	        calc_alt = UNITGEOM[firstid].alt - 1;
	    } else if ( alt_ratio > 0.9 ) {	       
    	    calc_alt = UNITGEOM[lastid].alt - 1;
    	} else if ( alt_ratio > 0.4 && alt_ratio < 0.6 ) {
	        calc_alt = calc_alt + GH_TUNNEL_PROP.depth;
	    } else {
    	    calc_alt = calc_alt + (GH_TUNNEL_PROP.depth/2.0);
    	}
	
    	if ( calc_alt > UNITGEOM[idx].alt ) {
            return parseFloat( UNITGEOM[idx].alt + GH_TUNNEL_PROP.depth );
	    } else {
            return calc_alt;
        }
    }
}

function __ghGetGeometryProperty(str) {
    var obj = str.split(",");
    if ( obj[0] != "#P" ) return null;

    var prop = {
    	"bridge" : false,
    	"tunnel" : false,
    	"gauge" : -1,
    	"maxspeed" : -1,
    	"highspeed" : false,
    	"layer" : null,
    	"embankment" : false
    }
    var param = obj[1].split(":");
    for ( var i=0,ilen=param.length; i < ilen; i++ ) {
    	if ( param[i].indexOf("bg") > -1 ) {
	        prop.bridge = true;
	    }
	    if ( param[i].indexOf("tn") > -1 ) {
    	    prop.tunnel = true;
    	}
    	if ( param[i].indexOf("gu") > -1 ) {
	        var dat = param[i].split("=");
	        prop.gauge = parseInt(dat[1],10);
	    }
	    if ( param[i].indexOf("ms") > -1 ) {
    	    var dat = param[i].split("=");
	        prop.maxspeed = parseInt(dat[1],10);
	    }
	    if ( param[i].indexOf("hs") > -1 ) {
    	    prop.highspeed = true;
    	}
    	if ( param[i].indexOf("ly") > -1 ) {
	        var dat = param[i].split("=");
	        prop.layer = parseInt(dat[1],10);
	    }
	    if ( param[i].indexOf("em") > -1 ) {
    	    prop.embankment = true;
    	}
    }
    return prop;
}
function __ghCalculateUnitAltitude() {
    for ( var i=0,ilen=UNITGEOM.length-1; i < ilen; i++ ) {
	    var prop = UNITGEOMPROP[i];
	    if ( prop != null && prop.tunnel ) {
    	    // tunnel prop
	        var alt = __ghCalculateTunnelAltitude(i);
	        if ( alt == null ) {
        		// NOP
	        } else {
    		    //  Change altitude data
		        UNITGEOM[i].alt = alt;
	        }
	    } 
    }
}

function __ghCreateUnitGeometryArray( data ) {

    UNITGEOM = [];
    UNITGEOMPROP = [];
    var str = null;
    for ( var i=0,ilen=data.length; i < ilen; i++ ) {
	    if ( data[i].indexOf('#') < 0 && data[i] != "" ) {
    	    str = data[i].split(",");
	        var obj = {
    		    "lat" : parseFloat(str[0]),
		        "lng" : parseFloat(str[1]),
    		    "alt" : parseFloat(str[2]),
    		    "sta" : str[3],
                "typ" : str[4]
	        }
	        UNITGEOM.push ( obj ) ;
	    } else if ( data[i].indexOf('#P') >= 0 ) {
    	    // #P,prop
	        var prop = __ghGetGeometryProperty(data[i]);
	        UNITGEOMPROP.push ( prop ) ;
	    } else {
    	    // NOP
    	}
    }
    
    // Adjust Station Point for train length
    
    for ( var i=0,ilen=UNITGEOM.length; i < ilen; i++ ) {
        var o = UNITGEOM[i];
	if ( o.sta != "x" && o.typ == "B" && i != ilen-1 ) {
           var dis = __ghCalcGeometryDistance(i,i+1);
           if ( dis > GH_DISTANCEFROMCENTER ) {
                var ratio = GH_DISTANCEFROMCENTER / dis;
                var p0 = new Cesium.Cartesian3.fromDegrees(o.lng,o.lat,o.alt);
                var p1 = new Cesium.Cartesian3.fromDegrees(
                        UNITGEOM[i+1].lng,
                        UNITGEOM[i+1].lat,
                        UNITGEOM[i+1].alt
                        );
                var result = new Cesium.Cartesian3();
                Cesium.Cartesian3.lerp(p0, p1, ratio, result)                    
                var cpos = Cesium.Cartographic.fromCartesian(result);
                UNITGEOM[i].lng = Cesium.Math.toDegrees(cpos.longitude);
                UNITGEOM[i].lat = Cesium.Math.toDegrees(cpos.latitude);
                UNITGEOM[i].alt = cpos.height;
           } else {
                    
                var k0 = i+1;
                var kmax = i+10;
                for ( var k=k0; k < kmax; k++ ) {
                    if ( k < ilen ) {
                        var dis = __ghCalcGeometryDistance(i,k);
                        if ( dis < GH_DISTANCEFROMCENTER ) {
                    
                            UNITGEOM[k].sta = UNITGEOM[k-1].sta;
                            UNITGEOM[k].typ = UNITGEOM[k-1].typ;
                            UNITGEOM[i].sta = "x";
                            UNITGEOM[i].typ = UNITGEOM[i-1].typ;
                            i++;  // add 2 step more
                        }
                    }
                }
           }
       }       
    }
    
}

function __ghLoadUnitGeometries(id,routearray, lineid, routename, way) {
    var geo = new XMLHttpRequest();
    var ret = [];
    for ( var i = 0,ilen=routearray.length; i<ilen; i++ ) {
	var file = GH_FIELD.linejson[ lineid ].way[way].geometry[ routearray[i] ];
	if (typeof file === "undefined") {
	    // NOP
	    console.log( lineid );
	    console.log( way );
	    console.log( GH_FIELD.linejson[ lineid ].way[way].geometry );
	    console.log( routearray[i] );
	} else {
	    var uri = ghGetResourceUri( GH_FIELD.linejson[ lineid ].baseuri + file );
            geo.open('GET', uri , false);
	    geo.send();
	    if (geo.status == 200) {
		if (geo.response) {
		    var r = geo.responseText;
		    var a = r.split(/\n/);
		    var startline = 1;

		    //  concat array 
		    for ( var j = startline,jlen=a.length; j<jlen; j++ ) {
        		if ( a[j] != "" ) {
			    ret.push ( a[j] );
			}
		    }
		}
	    } else {
    		var msg = "Unit geometry data load error " + geo.status + " " + uri;
		console.log( msg );
	    }
	}
    }

    if ( ret.length > 1 ) {
    	__ghCreateUnitGeometryArray( ret );
    	if ( GH_USE_TUNNEL ) __ghCalculateUnitAltitude();
    	__ghCreateUnitTimetable(id);
	__ghCreateUnitCzml(id);
    }
    
}

function __ghLoadFieldData(uri) {
    var xhr = new XMLHttpRequest();
    //xhr.open('GET', uri , true); async , false = sync;
    xhr.open('GET', uri , true);
    xhr.onreadystatechange = function() {
	    // readyState XMLHttpRequest の状態 4: リクエストが終了して準備が完了
    	// status httpステータス
    	if (xhr.readyState == 4 && xhr.status == 200) {
            if (xhr.response) {
		        GH_FIELD = JSON.parse(xhr.responseText);
                var lines = GH_FIELD.lines;
                GH_FIELD.linejson = {};
                for(var key in GH_FIELD.lines){
                    __ghLoadLineData(GH_FIELD.lines[key]);
                }
            }
    	} else {
	        // NOP
    	}
    }
    xhr.send();
}

function __ghCheckGeomid(geomid,lineid,lineway,route) {

    if ( ( typeof GH_FIELD.linejson[ lineid ].way ) == 'undefined' ) {
        var msg = "GEOMID " + geomid + " LINEID " + lineid + " LINEWAY " + lineway;
        console.log(msg);
        return false;
    } else {
        // NOP
    }   
        
    var r = GH_FIELD.linejson[ lineid ].way[lineway].route;
    for ( var key in r  ) {
        if ( key == route ) return true;
    }
    return false;

};
function __ghLoadUnitData() {
    
    var units = GH_FIELD.units;
    for ( var i=0,ilen=units.length; i < ilen; i++ ) {
        var geomid = units[i].geometry; // route index array [0,1,2,3,4]
        var lineid = units[i].lineid; // 10ES
	var route = units[i].route; // routename soundboundA
        var lineway = parseInt(units[i].way,10); // 0 or 1
        var flag = __ghCheckGeomid(geomid,lineid,lineway,route);
        if ( flag ) {
	        __ghLoadUnitGeometries( i , geomid, lineid, route , lineway );
        } else {
            var msg = "Wrong Geometry file " + lineid + " " + geomid + " " + lineway;
            console.log(msg);
        }
    }
    
};
                    
function __ghWaitFieldLineLoaded(func) {
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
        
function __ghLoadLineData(file) {
    var uri = ghGetResourceUri(file);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', uri , true);
    xhr.onreadystatechange = function() {
    	// readyState XMLHttpRequest の状態 4: リクエストが終了して準備が完了
    	// status httpステータス
    	if (xhr.readyState == 4 && xhr.status == 200) {
            if (xhr.response) {
                var json = JSON.parse(xhr.responseText);
        		GH_FIELD.linejson[json.id] = json;
                __ghWaitFieldLineLoaded( __ghLoadUnitData );
            }
        } else {
	        // NOP
	        //var msg = "Line data state " + xhr.status + " " + xhr.readyState + " " + file ;
    	    //console.log( msg );
    	}
    }
    xhr.send();
}

//////////////////////////////////////////////
// Main Loop
/////////////////////////////////////////////
self.addEventListener('message', function(e) {
    var data = e.data;
    var command = data.cmd;
    if ( command == 'unitarray') {
	// Obsolete
    } else if ( command == 'objarray') {

    } else if ( command == 'urilist') {
	    //console.log(data.value);
	    GH_URILIST = data.value;
    } else if ( command == 'fieldjson') {
	    GH_FIELD = data.value;
        var lines = GH_FIELD.lines;
        GH_FIELD.linejson = [];
        
        for(var key in GH_FIELD.lines){
            __ghLoadLineData(GH_FIELD.lines[key]);
        }
    } else if ( command == 'fielduri') {
        //console.log(data.value);
	    __ghLoadFieldData(data.value);
	
    } else if ( command == "remove") {

    } else if ( command == "reset") {
	    TILE_HASH = {};
    } else {
        // NOP
    }
    e = null;
});


//self.postMessage( "Start-Thread" );
