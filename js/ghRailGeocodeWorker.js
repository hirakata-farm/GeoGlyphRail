/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
//
//  Bing Maps API
//
//https://docs.microsoft.com/en-us/bingmaps/rest-services/
//  https://docs.microsoft.com/en-us/bingmaps/rest-services/locations/find-a-location-by-point
//

//const window = self.window = self;
window = self.window = self;

importScripts('../../cesium/Cesium.js');

var protocol = location.protocol;
var GH_BING = { 
    'url' : protocol + '//dev.virtualearth.net/REST/v1/Locations/',
    'key' : '___BING_TOKEN___'
}

var language = (window.navigator.languages && window.navigator.languages[0]) ||
            window.navigator.language ||
            window.navigator.userLanguage ||
            window.navigator.browserLanguage;
    
var LANG = null;    
if(language.indexOf('-') == -1) {
    LANG = language;
} else {
    var sp = language.split("-"); // ex en-US, it-IT
    LANG = sp[0];
}   
if ( LANG == 'en' || LANG == 'fr' || LANG == 'de' || LANG == 'it' || LANG == 'es' || LANG == 'pt' || LANG == 'hu' || LANG == 'nl' || LANG == 'ja' ) {
    // NOP
} else {
    LANG = 'en';  // default
}    

var STATION_PREFIX = {
    'en' : 'The location is near ',
    'fr' : 'L\'emplacement est près de ',
    'de' : 'Die Lage ist in der Nähe von ',
    'it' : 'La posizione è vicino a ',
    'es' : 'La ubicación está cerca de ',
    'pt' : 'A localização é perto de ',
    'nl' : 'De locatie ligt vlakbij ',
    'hu' : 'A hely ',
    'ja' : '位置　'
}
var STATION_POSTFIX = {
    'en' : '.',
    'fr' : '.',
    'de' : '.',
    'it' : '.',
    'es' : '.',
    'pt' : '.',
    'nl' : '.',
    'hu' : ' közelében található.',
    'ja' : '　近郊'
}

var TRAIN_ADDRESS = "";
var TRAIN_PREFIX = {
    'en' : 'Train runs near ',
    'fr' : 'Le train circule près de ',
    'de' : 'Zug fährt in der Nähe von ',
    'it' : 'Il treno passa vicino a ',
    'es' : 'El tren corre cerca de ',
    'pt' : 'Trem passa perto de ',
    'nl' : 'Trein rijdt in de buurt van ',
    'hu' : 'A vonat ',
    'ja' : '　'
}

var TRAIN_POSTFIX = {
    'en' : '.',
    'fr' : '.',
    'de' : '.',
    'it' : '.',
    'es' : '.',
    'pt' : '.',
    'nl' : '.',
    'hu' : ' közelében fut.',
    'ja' : '　近郊走行中'
}

var TRAIN_DESTINATION = "";

var TRAIN_DESTINATION_PREFIX = {
    'en' : 'This train is bound for ',
    'fr' : 'Ce train est à destination ',
    'de' : 'Dieser Zug fährt nach ',
    'it' : 'Questo treno è diretto a ',
    'es' : 'Este tren se dirige a ',
    'pt' : 'Este trem está com destino a ',
    'nl' : 'Deze trein is op weg naar ',
    'hu' : 'Ez a vonat ',
    'ja' : 'この列車は　'
}

var TRAIN_DESTINATION_POSTFIX = {
    'en' : '.',
    'fr' : '.',
    'de' : '.',
    'it' : '.',
    'es' : '.',
    'pt' : '.',
    'nl' : '.',
    'hu' : ' felé indul.',
    'ja' : '　行き。'
}


var TRAIN_NEXTSTOP = "";

var TRAIN_NEXTSTOP_PREFIX = {
    'en' : 'The next stop is ',
    'fr' : 'Le prochain arrêt est ',
    'de' : 'Die nächste Station ist ',
    'it' : 'La prossima fermata è ',
    'es' : 'La siguiente parada es ',
    'pt' : 'A próxima parada é ',
    'nl' : 'De volgende stop is ',
    'hu' : 'A következő megálló ',
    'ja' : '次の停車駅は　'
}

var TRAIN_NEXTSTOP_POSTFIX = {
    'en' : '.',
    'fr' : '.',
    'de' : '.',
    'it' : '.',
    'es' : '.',
    'pt' : '.',
    'nl' : '.',
    'hu' : '.',
    'ja' : '。'
}

var TRAIN_STOP = "";

var TRAIN_STOP_PREFIX = {
    'en' : 'Stopping at ',
    'fr' : 'Arrêt à la gare de ',
    'de' : 'Zwischenstopp am Bahnhof von ',
    'it' : 'Fermandosi alla stazione di ',
    'es' : 'Parando en la estación de ',
    'pt' : 'Parando na estação de ',
    'nl' : 'Stoppen bij ',
    'hu' : 'Megáll a ',
    'ja' : '　'
}

var TRAIN_STOP_POSTFIX = {
    'en' : 'station.',
    'fr' : '.',
    'de' : '.',
    'it' : '.',
    'es' : '.',
    'pt' : '.',
    'nl' : 'Station.',
    'hu' : 'állomáson.',
    'ja' : '駅停車中。'
}

var CURRENTTIME = null;
var UPDATE_TYPE = "train";
var PREV_TYPE = "NOP";
var PREV_TIMETABLE = "NOP";
var PREV_POSITION = new Cesium.Cartesian3.fromDegrees(-10.0,-10.0,0.0);
var TRAIN_DISTANCE2 = 3000*3000;  // 3000 m ^2
var DESCRIPTION = "";
var ADDRESS = "";

function __ghResponse(data) {

    var result = "";
    if ( data == null ) {
	result = DESCRIPTION;
    } else {
	if ( UPDATE_TYPE == "train") {
            result = DESCRIPTION + "  " + TRAIN_PREFIX[LANG] + data + TRAIN_POSTFIX[LANG];
	} else if ( UPDATE_TYPE == "station") {
            result = DESCRIPTION + " " + STATION_PREFIX[LANG] + data + STATION_POSTFIX[LANG];
	} else {
            result = " " + data + " ";
	}
    }
    var ret = { 'cmd': "update", 'type' : UPDATE_TYPE, 'result' : result };
    self.postMessage( ret );
    
}
function __ghQueryReverseGeocode(lat,lng) {
    //http://dev.virtualearth.net/REST/v1/Locations/47.64054,-122.12934?o=xml&key={BingMapsAPIKey}  
    var uri = GH_BING.url + lat + "," + lng + "?c=" + LANG + "&key=" + GH_BING.key;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', uri , true);
    xhr.responseType = 'json';
    xhr.onload = function() {
	if (this.status == 200) {
            var ret = this.response;
	    var address = "";
                    
	    // Success
            //
            //console.log(ret.resourceSets[0].resources[0]);
            // 
            // ret.resourceSets[0].resources[0].address.addressLine   = "La Briqueterie"
            // ret.resourceSets[0].resources[0].address.adminDistrict   = "Hauts-de-France"
            // ret.resourceSets[0].resources[0].address.adminDistrict2   = "Pas-de-Calais"
            // ret.resourceSets[0].resources[0].address.countryRegion   = "France"
            // ret.resourceSets[0].resources[0].address.formattedAddress   = "La Briqueterie, 62185 Fréthun"
            //                                                 
            //
	    if ( ( typeof ret.resourceSets[0].resources ) != 'undefined' && ( typeof ret.resourceSets[0].resources[0].address ) != 'undefined' ) {
		address = ret.resourceSets[0].resources[0].address.formattedAddress;
            
		if(address.indexOf(ret.resourceSets[0].resources[0].address.countryRegion) != -1) {
                    // same word exist NOP
		} else {
                    address = address + " " + ret.resourceSets[0].resources[0].address.countryRegion;                
		}    
		__ghResponse(address);
	    }
            
	} else if (this.status == 500 || this.status == 404 ) {
	    //  Not defined tile data
	    console.log("Geocode 500 or 404 error : " + this.status);
	} else {
	    console.log("Geocode Unknown error : " + this.status);
	};
    }
    xhr.send();    
}

function  __ghGetDescriptionFromTimetable(timetable) {

    var destination = timetable[timetable.length-2];
    var ctime = Cesium.JulianDate.fromIso8601(CURRENTTIME);
    var timestr = CURRENTTIME.split("T");
    var retidx = 0;
    var type = 'stop';
    var station0 = 'stop';
    var station1 = 'stop';
    // timetable array format 3 data for each
    for (var i = 0,ilen = timetable.length; i < ilen ; i=i+3) {
	var ttime = timetable[i].split("T");
	var tabletime = timestr[0] + "T" + ttime[1] + ".000Z";
	var tc = Cesium.JulianDate.fromIso8601(tabletime, new Cesium.JulianDate());
	var d0 = Cesium.JulianDate.compare(ctime,tc);
	if ( d0 < 0 ) {
	    retidx = i;
	    break;
	} 
    }

    if ( retidx > 1 ) {
	station0 = timetable[retidx-1];
	station1 = timetable[retidx+1];
	if ( station0 == station1 ) {
	    type = 'stop';
	} else {
	    type = 'run';
	}
    } else {
	type = 'stop';
	station0 = timetable[retidx+1];
	station1 = timetable[retidx+1];
    }

    if ( type == 'run' ) {
	return TRAIN_DESTINATION_PREFIX[LANG] + destination + TRAIN_DESTINATION_POSTFIX[LANG] + " " + TRAIN_NEXTSTOP_PREFIX[LANG] + station1 + TRAIN_NEXTSTOP_POSTFIX[LANG];
    } else {
	return TRAIN_DESTINATION_PREFIX[LANG] + destination + TRAIN_DESTINATION_POSTFIX[LANG] + " " + TRAIN_STOP_PREFIX[LANG] + station1 + TRAIN_STOP_POSTFIX[LANG];
    }
    
}
//////////////////////////////////////////////
// Main Loop
/////////////////////////////////////////////
self.addEventListener('message', function(e) {
    var data = e.data;

    if ( data.cmd == "update") {

	UPDATE_TYPE = data.type;
	//CURRENTTIME = Cesium.JulianDate.fromIso8601(data.time);
	CURRENTTIME = data.time;
    
	var distance = Cesium.Cartesian3.distanceSquared(data.position,PREV_POSITION);
	var cartographic = Cesium.Cartographic.fromCartesian(data.position);
	var lng = Cesium.Math.toDegrees(cartographic.longitude);
	var lat = Cesium.Math.toDegrees(cartographic.latitude);
	var timetable = "";
	if ( UPDATE_TYPE == "train" ) {
	    timetable = __ghGetDescriptionFromTimetable(data.value);
	}
	
	if ( distance > TRAIN_DISTANCE2 ) {

	    if ( UPDATE_TYPE == "train" ) {
		//console.log(val);
		DESCRIPTION = timetable;
		PREV_TIMETABLE = timetable;
	    } else if ( UPDATE_TYPE == "station" ) {
		DESCRIPTION = data.value;
	    } else {
		DESCRIPTION = "";
	    }
	    __ghQueryReverseGeocode(lat,lng);
	    //__ghResponse("test");

	    PREV_POSITION = Cesium.Cartesian3.clone(data.position);
	    PREV_TYPE = UPDATE_TYPE;

	} else {
	    if ( UPDATE_TYPE == PREV_TYPE ) {
		// Same type and near position
		if ( UPDATE_TYPE == "train" && PREV_TIMETABLE != timetable ) {
		    DESCRIPTION = timetable;
		    __ghResponse(null);
		    PREV_TIMETABLE = timetable;
		}
	    } else {
		if ( UPDATE_TYPE == "train" ) {
		    DESCRIPTION = timetable;
		    PREV_TIMETABLE = timetable;
		} else if ( UPDATE_TYPE == "station" ) {
		    DESCRIPTION = data.value;
		} else {
		    DESCRIPTION = "";
		}
		//__ghResponse("test");
		__ghQueryReverseGeocode(lat,lng);

		PREV_POSITION = Cesium.Cartesian3.clone(data.position);
		PREV_TYPE = UPDATE_TYPE;
	    }
	}
    } else if ( command == "remove") {

    } else if ( command == "reset") {

    } else {
        // NOP
    }
    e = null;
        
});


