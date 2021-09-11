
//
//
//
// 3D Vector Tile Library
//
//  GH_V object required
//  Cesium library
//
//

"use strict";

//  In chrome
//  One datasource contains max polygons , data have about 400M ~ 500M byte with texture.
//  One datasource contains max polygons , data have about 100M ~ 200M byte without textreu..
//  Browser Process MAX 2000M byte limit, depends on Browser build.
//    when process over 2000M, unstable and crash process.
//  When datasource contains max polygons, There are 4 datsource ( 1600M ~ 2000M )  max datasource.
//
//  for building and trees sums to 4G , SRC_MAX limit to 3
//


var GH_3DTILE = {
    worker: null,
    workeruri : '../js/ghRail3DtileWorker.js',
    area: 400,
    tilemax : 4,
    maxpolygon : 3000,
    distanceDisplay: 1000,
    withoutbuildings : false,
    withtexture: false,
    name: [],
    hash : {}
};


function gh3DtileGetGLmaxTexture(canvas) {
    // canvas = GH_S.canvas
    var gl = canvas.getContext('webgl');
    var texsize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    console.log("Texture size " + texsize);
    return texsize;
}

function gh3DtileWorkerResponse(event) {
    // Let me just generate some array buffer for the simulation
    var array_buffer = new Uint8Array(event.data).buffer;
    // Now to the decoding
    var decoder = new TextDecoder("utf-8");
    var view = new DataView(array_buffer, 0, array_buffer.byteLength);
    var czmlstring = decoder.decode(view);
    var czmlobject = JSON.parse(czmlstring);    
    var key = czmlobject[0].name;

    if ( GH_3DTILE.hash[key] ) {
        // Already exist
        console.log(key);
    } else {
        //gh_3dtile_parse_geojson(ret.cmd,ret.tile,ret.result);
        gh3DtileParseCzml("json","transfer",czmlobject);  
        GH_3DTILE.hash[key] = 1;
    }
    event = null;
}

function gh3DtileSetup(list){
    
    if (window.Worker){
        if ( GH_3DTILE.worker == null ) {
            GH_3DTILE.worker = new Worker(GH_3DTILE.workeruri);
            GH_3DTILE.worker.addEventListener('message', gh3DtileWorkerResponse );
		
            GH_3DTILE.worker.addEventListener('error', function(err) {
                console.error(err);
            });
            
            if ( list != null ) {
                GH_3DTILE.worker.postMessage({
                    "cmd":"urilist",
                    "value":list
                });               
            }
	}
    } else {
	GH_3DTILE.worker = null;
	console.log('Not support Web Workers');	
    }
    return;
}
function gh3DtileFreeWorker(view){
    if ( GH_3DTILE.worker != null ) {
        GH_3DTILE.worker.terminate();
        GH_3DTILE.worker = null;

        for (var i = 0,ilen=GH_3DTILE.name.length; i < ilen; i++) {
            var srcary = view.dataSources.getByName(GH_3DTILE.name[i]);
            for ( var j = 0, jlen=srcary.length; j<jlen; j++ ) {
                if ( view.dataSources.contains(srcary[j]) ) {
                    view.dataSources.remove(srcary[j],true);
                }
            }
        }

        GH_3DTILE.name = [];

        for ( var key in GH_3DTILE.hash ) {
            delete GH_3DTILE.hash[key]; 
        }
        GH_3DTILE.hash = {};
    }
    return null;
}

function gh3DtileUpdate(cartographicpoint,maxpolygon,withoutbuildings,withtexture){
    GH_3DTILE.withoutbuildings = withoutbuildings;
    GH_3DTILE.withtexture = withtexture;
    if ( maxpolygon > 0 ) GH_3DTILE.maxpolygon = maxpolygon;
    
    if ( GH_3DTILE.worker != null ) {
        var lat = Cesium.Math.toDegrees(cartographicpoint.latitude);
        var lng = Cesium.Math.toDegrees(cartographicpoint.longitude);
        GH_3DTILE.worker.postMessage({
            "cmd":"update",
            "lng":lng,
            "lat":lat,
	    "area":GH_3DTILE.area,
	    "maxpolygon":GH_3DTILE.maxpolygon,
	    "distanceDisplay":GH_3DTILE.distanceDisplay,
	    "withoutbuildings":GH_3DTILE.withoutbuildings,
	    "withtexture":GH_3DTILE.withtexture
        });
    }
}
function gh3DtileLoadCzmlFinished(val) {
    GH_V.dataSources.add(val);
    GH_3DTILE.name.push(val.name);
}

function gh3DtileParseCzml(type,mode,czml) {
    var n = GH_3DTILE.name.length;
    if ( n+1 > GH_3DTILE.tilemax ) {
        var srcary = GH_V.dataSources.getByName(GH_3DTILE.name[n-GH_3DTILE.tilemax]);
        for ( var i = 0, len=srcary.length; i<len; i++ ) {
            var flg = GH_V.dataSources.remove(srcary[i],true);
            if ( flg ) {
                // NOP remove OK
                //console.log("remove:" + GH_3DTILE_NAME[n-GH_3DTILE_SRC_MAX] );      
            } else {
                console.log("Cannot remove datasource:" + GH_3DTILE.name[n-GH_3DTILE.tilemax] );      
            }        
        }
    }
    Cesium.CzmlDataSource.load(czml).then(gh3DtileLoadCzmlFinished); 
}

//stackoverflow.com/questions/34057127/how-to-transfer-large-objects-using-postmessage-of-webworker
//stackoverflow.com/questions/23237611/converting-javascript-2d-arrays-to-arraybuffer
//codeday.me/jp/qa/20190103/121089.html
//codeday.me/jp/qa/20190128/179403.html
//codeday.me/jp/qa/20190502/757522.html

//codeday.me/jp/qa/20190107/134814.html
