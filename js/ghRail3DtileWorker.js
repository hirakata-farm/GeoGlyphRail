//
//
// 3D Vector Tile Worker 
//
// for .mvt format
//  https://mapzen.com/projects/vector-tiles/
//  https://mapzen.com/documentation/vector-tiles/use-service/#available-tile-formats
//
//  stackoverflow.com/questions/3177774/how-to-prevent-html5-web-workers-from-locking-up-thus-currenctly-responding-to-me
//  qiita.com/cgetc/items/e8a59416ddb18236ca78
//
//
//  parseInt(x,10) => x|0;
//  
//  IN
//   lng longitude (degree) => tileX
//   lat latitude  (degree) => tileY
//   area  Request area aquare size [m]
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

importScripts('pbf.min.js','vectortile.min.js');
importScripts('turf3DtileWorker.min.js');
//http://code.iamkate.com/javascript/queues/
importScripts('Queue.min.js');

importScripts('../../cesium/Cesium.js');


//////////////////////////////////////////////////////////////////
//  vector tile service
//  https://docs.mapbox.com/vector-tiles/reference/mapbox-streets-v7/#layer-reference
//  https://tilezen.readthedocs.io/en/latest/
//  https://openmaptiles.org/schema/ -> maptiler
//
//https://cloud.maptiler.com/tiles/v3/
//
//
//
var NEXTZEN_API_KEY = "___NEXTZEN_TOKEN___";
var nextzen_building_key = 'buildings';
var nextzen_forest_key = 'landuse';
///////////////////////////////////
var LAYER_BUILDING_KEY = nextzen_building_key;
var LAYER_FOREST_KEY = nextzen_forest_key;
var LAYER_3D_URI = 'nextzen';
///////////////////////////////////


/////////////////////////////////////////////////


var EARTH_RADIUS_IN_METERS = 6378137;
var FOREST_DENSITY = 900; // [m^2]
var BUILDING_DEFAULT_HEIGHT = 4; // [m]

var TILE_HASH = {};
var TILE_STATUS_QUEUE = 4;
var TILE_STATUS_SUCCESS = 8;
var TILE_STATUS_ERROR = 16;

var QUEUE = new Queue();
var QUEUE_MAX = 32;

var TILE_IS_POLYGON = true;
var TILE_POLYGON_MAX = 3000; // 800
var TILE_DISTANCE = 2000;
var TILE_IS_TEXTURE = false;

// https://github.com/AnalyticalGraphicsInc/czml-writer/wiki/CZML-Guide
var CZML = [];

var GH_URILIST = [];
function ghGetResourceUri(file) {
    var idx = Math.floor(Math.random() * GH_URILIST.length);
    var u = GH_URILIST[idx] + file;
    return u
}

 
///////////////////////////////////////

function _get_uri_nextzen(x,y,z){
  var u = "https://tile.nextzen.org/tilezen/vector/v1/512/all";
  u +=  "/" + z + "/" + x + "/" + y + ".mvt?api_key=" + NEXTZEN_API_KEY;
  return u;
}

function _get_tile_hash_key(x,y,z){
  return "TILE_" + x + "_" + y + "_" + z;
}

function _getTileSizeInMeters( latitude, zoom ) {
  return EARTH_RADIUS_IN_METERS * Math.cos(latitude / 180 * Math.PI) / Math.pow(2, zoom);
}
function _getZoomFromMeters( latitude, area ) {
    var x = EARTH_RADIUS_IN_METERS * Math.cos(latitude / 180 * Math.PI) / area ;
    if ( x < 1 ) x = 1;
    var ret = Math.floor (  Math.LOG2E * Math.log(x) ) ;
    if ( ret > 17 ) ret = 17;
    if ( ret < 9 ) ret = 9;
    return ret;
}
function _long2tile(lon,z) {
    var x = (lon+180)/360*Math.pow(2,z); 
    return x|0;
}
function _lat2tile(lat,z)  {
    var y = (1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2
	* Math.pow(2,z);
    return y|0;
}
function _tile2long(x,z) {
    return (x/Math.pow(2,z)*360-180); 
}
function _tile2lat(y,z) {
    var n=Math.PI-2*Math.PI*y/Math.pow(2,z);
    return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
}

///////////////////////////////////////
//  3D Vector Tile forest model uri
var VTILE_FOREST_URI =  [
    "tree/simple-texture-tree-0.glb",
    "tree/simple-texture-tree-2.glb",
    "tree/simple-texture-tree-3.glb"
];
var VTILE_FOREST_LEN =  VTILE_FOREST_URI.length;
                                     
var VTILE_FOREST_LOWPOLY_URI =  [
    "tree/tree-low-01.glb",
    "tree/tree-low-02.glb",
    "tree/tree-low-03.glb"
];
var VTILE_FOREST_LOWPOLY_LEN =  VTILE_FOREST_LOWPOLY_URI.length;
    
    
//  3D Vector Tile wall texture uri ( medium height )
var VTILE_WALL_MEDIUM_URI =  [
    "texture/32/texture_wall_01.png",
    "texture/32/texture_wall_02.png",
    "texture/32/texture_wall_03.png",
    "texture/32/texture_wall_04.png",
    "texture/32/texture_wall_05.png",
    "texture/32/texture_wall_06.png",
    "texture/32/texture_wall_07.png",
    "texture/32/texture_wall_08.png",
    "texture/32/texture_wall_09.png",
    "texture/32/texture_wall_10.png",
    "texture/32/texture_wall_11.png",
    "texture/32/texture_wall_12.png",
    "texture/32/texture_wall_13.png",
    "texture/32/texture_wall_14.png",
    "texture/32/texture_wall_15.png",
    "texture/32/texture_wall_16.png",
    "texture/32/texture_wall_17.png",
    "texture/32/texture_wall_18.png",
    "texture/32/texture_wall_19.png",
    "texture/32/texture_wall_20.png",
    "texture/32/texture_wall_21.png",
    "texture/32/texture_wall_22.png",
    "texture/32/texture_wall_23.png",
    "texture/32/texture_wall_24.png"
];

var VTILE_WALL_MEDIUM_LEN =  VTILE_WALL_MEDIUM_URI.length;

//  3D Vector Tile wall texture uri ( heigh height )
var VTILE_WALL_HIGH_URI =  [
    "texture/32/texture_wall_81.png",
    "texture/32/texture_wall_82.png",
    "texture/32/texture_wall_83.png",
    "texture/32/texture_wall_84.png",
    "texture/32/texture_wall_85.png",
    "texture/32/texture_wall_86.png",
    "texture/32/texture_wall_87.png",
    "texture/32/texture_wall_88.png",
    "texture/32/texture_wall_89.png",
    "texture/32/texture_wall_90.png",
    "texture/32/texture_wall_91.png",
    "texture/32/texture_wall_92.png",
    "texture/32/texture_wall_93.png",
    "texture/32/texture_wall_94.png",
    "texture/32/texture_wall_95.png"
];

var VTILE_WALL_HIGH_LEN =  VTILE_WALL_HIGH_URI.length;
var VTILE_WALL_UNIT = 5; // Texture repeat unit size

//  3D Vector Tile roof texture uri ( medium height )
var VTILE_ROOF_MEDIUM_URI =  [
    "texture/32/texture_roof_03.png",
    "texture/32/texture_roof_04.png",
    "texture/32/texture_roof_08.png",
    "texture/32/texture_roof_07.png",
    "texture/32/texture_roof_07.png",
    "texture/32/texture_roof_02.png",
    "texture/32/texture_roof_06.png",
    "texture/32/texture_roof_06.png",
    "texture/32/texture_roof_09.png",
    "texture/32/texture_roof_05.png",
    "texture/32/texture_roof_03.png",
    "texture/32/texture_roof_04.png",
    "texture/32/texture_roof_08.png",
    "texture/32/texture_roof_02.png",
    "texture/32/texture_roof_03.png",
    "texture/32/texture_roof_06.png",
    "texture/32/texture_roof_01.png",
    "texture/32/texture_roof_06.png",
    "texture/32/texture_roof_04.png",
    "texture/32/texture_roof_02.png",
    "texture/32/texture_roof_03.png",
    "texture/32/texture_roof_08.png",
    "texture/32/texture_roof_02.png",
    "texture/32/texture_roof_02.png"
];

var VTILE_ROOF_MEDIUM_LEN =  VTILE_ROOF_MEDIUM_URI.length;

//  3D tile roof texture uri ( heigh height )
var VTILE_ROOF_HIGH_URI =  [
    "texture/32/texture_roof_06.png",
    "texture/32/texture_roof_06.png",
    "texture/32/texture_roof_07.png",
    "texture/32/texture_roof_07.png",
    "texture/32/texture_roof_07.png",
    "texture/32/texture_roof_03.png",
    "texture/32/texture_roof_06.png",
    "texture/32/texture_roof_03.png",
    "texture/32/texture_roof_03.png",
    "texture/32/texture_roof_08.png",
    "texture/32/texture_roof_09.png",
    "texture/32/texture_roof_07.png",
    "texture/32/texture_roof_08.png",
    "texture/32/texture_roof_08.png",
    "texture/32/texture_roof_06.png"
];

var VTILE_ROOF_HIGH_LEN =  VTILE_ROOF_HIGH_URI.length;
var VTILE_ROOF_UNIT =  4; // Texture repeat unit size

// heigh and medium height threshhold
var VTILE_THRESHHOLD =  16;
var VTILE_TOO_SMALL = 20;


// Polygon mode ( not enough texture memory )
var VTILE_POLYGON_HIGH_COLOR = [
    '#65767A', '#8C9684', '#92A6BC',
    '#9ABDD0', '#ABDCAF', '#3D4B52',
    '#FFD9A0', '#EAA87B', '#DADFCF',
    '#FAFAFA', '#C7F8FF'
];

var VTILE_POLYGON_LOW_COLOR = [
    '#C2A98C', '#D7B19B', '#B79287',
    '#DDD0A2', '#E9C59A', '#B6A483',
    '#AAAAAA', '#546568', '#C6B6A4',
    '#E8AC92', '#E9EDD5' ];
var VTILE_POLYGON_SMALL_COLOR = [
    '#DCDCDC', '#E6E6FA', '#F0F8FF',
    '#D3D3D3', '#FFFFE0', '#778899'];

// heigh and low height threshhold
var VTILE_POLYGON_THRESHHOLD =  5;
var VTILE_POLYGON_ALPHA = 0.3;

function _vtile_get_building_color(height,num) {
    var color = null;
    if ( height > VTILE_POLYGON_THRESHHOLD ) {
        color = Cesium.Color.fromCssColorString(VTILE_POLYGON_HIGH_COLOR[num%VTILE_POLYGON_HIGH_COLOR.length]);
    } else {
        color = Cesium.Color.fromCssColorString(VTILE_POLYGON_LOW_COLOR[num%VTILE_POLYGON_LOW_COLOR.length]);
    }
    color.withAlpha(VTILE_POLYGON_ALPHA);
    return color;    
}
function _vtile_get_small_color(num) {
    var color = null;
    color = Cesium.Color.fromCssColorString(VTILE_POLYGON_SMALL_COLOR[num%VTILE_POLYGON_SMALL_COLOR.length]);
    color.withAlpha(VTILE_POLYGON_ALPHA);
    return color;    
}
function _vtile_get_degreesarray(coords,height) {
    var ret = [];
    for (var i = 0; i < coords.length; i++) {
	var c = coords[i];
	ret.push(c[0]);
	ret.push(c[1]);
	ret.push(height);
    }
    return ret;
}

//
// Query the terrain height of two Cartographic positions
//  https://github.com/AnalyticalGraphicsInc/cesium/issues/7121
//
var TPV = Cesium.createWorldTerrain();
var DISTANCE_HEIGHTREFERENCE_WORKWAROUND = 5000;
function _cesium_height_workaround(lng,lat) {
   // longitude, latitude position (each in decimal degrees)
    var checkpositions = [
        Cesium.Cartographic.fromDegrees(lng, lat)
    ];
    var promise = Cesium.sampleTerrainMostDetailed(TPV, checkpositions);
    Cesium.when(promise, function(updatedPositions) {
        // positions[0].height and positions[1].height have been updated.
        // updatedPositions is just a reference to positions.
        if ( checkpositions[0].height > 100 ) {
            DISTANCE_HEIGHTREFERENCE_WORKWAROUND = checkpositions[0].height;
        } else {
            DISTANCE_HEIGHTREFERENCE_WORKWAROUND = 0;
        }
    });
}

function _create_building_czml_withouttexture( czml, features ) {

    var slope = 10;
    for (var i = 0; i < features.length; i++) {
        var entity = features[i];
        var typedata = entity.properties.type.split("_");
        var track = typedata[4];
        
        var ht = entity.properties.render_height;
        var positions = _vtile_get_degreesarray(entity.geometry.coordinates[0],ht);

        var distance = TILE_DISTANCE + DISTANCE_HEIGHTREFERENCE_WORKWAROUND ;
        var c = null;
        if ( ht > VTILE_THRESHHOLD ) {
            c = _vtile_get_building_color(ht,i);
        } else {
            if ( track < VTILE_THRESHHOLD ) {
                c = _vtile_get_small_color(i);
            } else {
                c = _vtile_get_building_color(ht,i);
            }
        }
        var roofmaterial = {
            "solidColor" : {
                "color": {
                    "rgba" : [Cesium.Color.floatToByte(c.red), Cesium.Color.floatToByte(c.green), Cesium.Color.floatToByte(c.blue), Cesium.Color.floatToByte(c.alpha)]
                }
            }
        };
        var wallmaterial = {
            "solidColor" : {
                "color": {
                    "rgba" : [Cesium.Color.floatToByte(c.red), Cesium.Color.floatToByte(c.green), Cesium.Color.floatToByte(c.blue), Cesium.Color.floatToByte(c.alpha)]
                }
            }
        };
        var wallpositions = positions;
        var wallheights_up = [];
        var wallheights_bottom = [];
        for ( var k=0;k<wallpositions.length;k=k+3){
            wallheights_up.push(ht);
            wallheights_bottom.push(-slope);
        }
        
        //  Roof flat Polygon
        var id = "polygon" + i;
        var poly = {
            "id" : id,
            "name" : entity.properties.type,
            "polygon" : {
                positions : {
                    "cartographicDegrees" : positions
                },
                height: ht,
                heightReference : "RELATIVE_TO_GROUND",
                shadows : {
                    "shadowMode" : "ENABLED"
                },
                distanceDisplayCondition :  {
                    distanceDisplayCondition : [ 1.0, distance ]
                },
                material : roofmaterial
            }
        };//
        czml.push(poly);
        
        var id = "wall" + i;
        var wall = {
            "id" : id,
            "name" : entity.properties.type,
            "wall" : {
                positions : {
                    "cartographicDegrees" : positions
                },
                maximumHeights : {
                    "array" : wallheights_up
                },
                minimumHeights : {
                    "array" : wallheights_bottom
                },
                shadows : {
                    "shadowMode" : "ENABLED"
                },
                heightReference : "CLAMP_TO_GROUND",
                distanceDisplayCondition :  {
                    distanceDisplayCondition : [ 1.0, distance ]
                },
                material : wallmaterial
            }
        };//
        
        czml.push(wall);
    }
}


function _create_building_czml( czml, features ) {

    var slope = 10;
    for (var i = 0; i < features.length; i++) {
        var entity = features[i];

        var typedata = entity.properties.type.split("_");
        var track = typedata[4];
        
        var ht = entity.properties.render_height;
        var positions = _vtile_get_degreesarray(entity.geometry.coordinates[0],ht);
        var texscale = track / ( 4 * VTILE_ROOF_UNIT ) ; // 5 (texture unit) * 4 ( square sampling) 
        var texscalex = track / VTILE_WALL_UNIT ; // 5 (texture unit) 
        var texscaley = ( ht + slope ) / VTILE_WALL_UNIT ; // 5 (texture unit) 
        var roofmaterial = null;
        var wallmaterial = null;
        var distance = TILE_DISTANCE + DISTANCE_HEIGHTREFERENCE_WORKWAROUND ;
	
        if ( ht > VTILE_THRESHHOLD ) {
            distance = TILE_DISTANCE * ( 1 + ( ht / VTILE_THRESHHOLD ) );
            roofmaterial = {
                image : {
                    image : {
                        uri : ghGetResourceUri(VTILE_ROOF_HIGH_URI[i%VTILE_ROOF_HIGH_LEN])
                    },
                    repeat : {
                        cartesian2 : [texscale,texscale]
                    }
                }
            };
            wallmaterial = {
                image : {
                    image : {
                        uri : ghGetResourceUri(VTILE_WALL_HIGH_URI[i%VTILE_WALL_HIGH_LEN])
                    },
                    repeat : {
                        cartesian2 : [texscalex,texscaley]
                    }
                }
            };
        } else {
            if ( track < VTILE_THRESHHOLD ) {
                var c = _vtile_get_small_color(i);
                roofmaterial = {
                    "solidColor" : {
                        "color": {
                            "rgba" : [Cesium.Color.floatToByte(c.red), Cesium.Color.floatToByte(c.green), Cesium.Color.floatToByte(c.blue), Cesium.Color.floatToByte(c.alpha)]
                        }
                    }
                };
                wallmaterial = {
                    "solidColor" : {
                        "color": {
                            "rgba" : [Cesium.Color.floatToByte(c.red), Cesium.Color.floatToByte(c.green), Cesium.Color.floatToByte(c.blue), Cesium.Color.floatToByte(c.alpha)]
                        }
                    }
                };
            } else {
                roofmaterial = {
                    image : {
                        image : {
                            uri : ghGetResourceUri(VTILE_ROOF_MEDIUM_URI[i%VTILE_ROOF_MEDIUM_LEN])
                        },
                        repeat : {
                            cartesian2 : [texscale,texscale]
                        }
                    }
                };
                wallmaterial = {
                    image : {
                        image : {
                            uri : ghGetResourceUri(VTILE_WALL_MEDIUM_URI[i%VTILE_WALL_MEDIUM_LEN])
                        },
                        repeat : {
                            cartesian2 : [texscalex,texscaley]
                        }
                    }
                };
            }
        }
        
        var wallpositions = positions;
        var wallheights_up = [];
        var wallheights_bottom = [];
        for ( var k=0;k<wallpositions.length;k=k+3){
            wallheights_up.push(ht);
            wallheights_bottom.push(-slope);
        }
        
        //  Roof Polygon
        var id = "polygon" + i;
        var poly = {
            "id" : id,
            "name" : entity.properties.type,
            "polygon" : {
                positions : {
                    "cartographicDegrees" : positions
                },
                height: ht,
                heightReference : "RELATIVE_TO_GROUND",
                shadows : {
                    "shadowMode" : "ENABLED"
                },
                distanceDisplayCondition :  {
                    distanceDisplayCondition : [ 1.0, distance ]
                },
                material : roofmaterial
            }
        };//
        czml.push(poly);
        var id = "wall" + i;
        var wall = {
            "id" : id,
            "name" : entity.properties.type,
            "wall" : {
                positions : {
                    "cartographicDegrees" : positions
                },
                maximumHeights : {
                    "array" : wallheights_up
                },
                minimumHeights : {
                    "array" : wallheights_bottom
                },
                shadows : {
                    "shadowMode" : "ENABLED"
                },
                heightReference : "CLAMP_TO_GROUND",
                distanceDisplayCondition :  {
                    distanceDisplayCondition : [ 1.0, distance ]
                },
                material : wallmaterial
            }
        };//
            
        czml.push(wall);

    }
}

function _create_tree_czml( czml, features ) {
    
    var sum = 0;
    for (var i = 0; i < features.length; i++) {
       	var entity = features[i];
	sum = sum + entity.geometry.coordinates.length;
    }
    var modulus_index = Math.ceil( sum / TILE_POLYGON_MAX );
    var idx = 0;
    
    for (var i = 0; i < features.length; i++) {
	var entity = features[i];
	for (var j = 0; j < entity.geometry.coordinates.length; j++) {
            if ( idx %  modulus_index == 0 ) {
                var coord = entity.geometry.coordinates[j];
                var position = Cesium.Cartesian3.fromDegrees( coord[0], coord[1] );
                var tname = "ghtree_" + idx;
                //  1 degree to 170 degree
                var hpr = new Cesium.HeadingPitchRoll( Math.floor(Math.random()*(170-1)+1) , 0.0, 0.0);
                var orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
                Cesium.Quaternion.normalize(orientation, orientation); 
                var ent = {
                    id : "Tree_" + tname,
                    name : tname,
                    position : {
                        "cartographicDegrees" : [coord[0], coord[1] , 100.0 ]  
                    },
                    orientation : {
                        "unitQuaternion" : [orientation.x,orientation.y,orientation.z,orientation.w ]  
                    },
                    model : {
                        gltf : ghGetResourceUri(VTILE_FOREST_URI[(i+j)%VTILE_FOREST_LEN]),
                        heightReference : "CLAMP_TO_GROUND",
                        scale : 0.7,
                        minumumPixelSize : 64,
                        shadows : {
                            "shadowMode" : "ENABLED"
                        },
                        distanceDisplayCondition :  {
                            distanceDisplayCondition : [ 1.0, TILE_DISTANCE + DISTANCE_HEIGHTREFERENCE_WORKWAROUND ]
                        }
                    }
                };
                czml.push(ent);
            }
            idx++;
        }
    }
}

function _create_tree_czml_withouttexture( czml, features ) {
    
    var sum = 0;
    for (var i = 0; i < features.length; i++) {
       	var entity = features[i];
	sum = sum + entity.geometry.coordinates.length;
    }
    var modulus_index = Math.ceil( sum / TILE_POLYGON_MAX );
    var idx = 0;
    
    for (var i = 0; i < features.length; i++) {
	var entity = features[i];
	for (var j = 0; j < entity.geometry.coordinates.length; j++) {
            if ( idx %  modulus_index == 0 ) {
                var coord = entity.geometry.coordinates[j];
                var position = Cesium.Cartesian3.fromDegrees( coord[0], coord[1] );
                var tname = "ghtree_low_" + idx;
                //  1 degree to 170 degree
                var hpr = new Cesium.HeadingPitchRoll( Math.floor(Math.random()*(170-1)+1) , 0.0, 0.0);
                var orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
                Cesium.Quaternion.normalize(orientation, orientation); 
                var ent = {
                    id : "Tree_" + tname,
                    name : tname,
                    position : {
                        "cartographicDegrees" : [coord[0], coord[1] , 100.0 ]  
                    },
                    orientation : {
                        "unitQuaternion" : [orientation.x,orientation.y,orientation.z,orientation.w ]  
                    },
                    model : {
                        gltf : ghGetResourceUri(VTILE_FOREST_LOWPOLY_URI[(i+j)%VTILE_FOREST_LOWPOLY_LEN]),
                        heightReference : "CLAMP_TO_GROUND",
                        scale : 1.5,
                        minumumPixelSize : 64,
                        shadows : {
                            "shadowMode" : "ENABLED"
                        },
                        distanceDisplayCondition :  {
                            distanceDisplayCondition : [ 1.0, TILE_DISTANCE + DISTANCE_HEIGHTREFERENCE_WORKWAROUND ]
                        }
                    }
                };
                czml.push(ent);
            }
            idx++;
        }
    }
}


//
//https://gist.github.com/shunter/4c21b8cb05e9646c6773
function _create_building_geojson( layer,x,y,z ) {

    var x0 = _tile2long(x,z);
    var y0 = _tile2lat(y,z);
    var xd = _tile2long(x+1,z) - x0;
    var yd = _tile2lat(y+1,z) - y0;
    var xp = 0;
    var yp = 0;
    var tile_extent = layer.extent;
    var multipoly = [];
    var idx = 0;

    var modulus_index = Math.ceil( layer.length / TILE_POLYGON_MAX );

    for(var i = 0,len=layer.length; i < len; i++) {
        var f = layer.feature(i);
        //VectorTileFeature.types = ['Unknown', 'Point', 'LineString', 'Polygon'];
        var prop = "";
        if (typeof f.properties === 'undefined' ) {
            prop = new Object();
        } else {
            prop = f.properties;
        }        
        var geo = f.loadGeometry();
	prop.kind = "buildings";
        prop.number = i;
	if ( typeof prop.render_height === 'undefined'  ) {
	    if ( typeof prop.render_min_height === 'undefined'  ) {
                if (typeof f.properties.height === "undefined") {
                    prop.render_height = BUILDING_DEFAULT_HEIGHT;
                } else {
                    // for nextzen server tile
                    prop.render_height = f.properties.height;
                }
	    } else {
		prop.render_height = prop.render_min_height;
	    }
	}
        for(var j = 0,len2=geo.length; j < len2; j++) {
	    var len3 = geo[j].length;
	    if ( len3 > 3 ) {
                var polygon = [];
		for(var k = 0; k < len3; k++) {
                    xp = x0 + ( geo[j][k].x / tile_extent * xd );
                    yp = y0 + ( geo[j][k].y / tile_extent * yd );
                    polygon.push([ xp, yp ]);
		}
                var linetmp = turf.helpers.lineString(polygon,prop);
                var linelength = turf.length.default(linetmp)*1000; // kilometer to meter
                
                if ( linelength > VTILE_TOO_SMALL ) {
                    prop.type = "_" + x + "_" + y + "_" + z + "_" + linelength;
                    if ( idx % modulus_index == 0 ) {
                        multipoly.push ( turf.lineToPolygon.default(turf.helpers.lineString(polygon,prop)) );
                    }
                    idx++;
                }
	    }
        }
    }
    return turf.helpers.featureCollection(multipoly);
}

//
//https://github.com/Turfjs/turf/blob/master/packages/turf-points-within-polygon/index.js
//inpoints = turf.pointsWithinPolygon(points, turf.featureCollection([ turf.polygon(aline) ]) );
function createPointsWithinPolygon(points, polygons) {
    var results = [];
    var cnt = 0;
    var prop = "";
    turf.meta.featureEach(points, function (point,pointidx) {
        var contained = false;
        turf.meta.geomEach(polygons, function (polygon,polygonidx,polygonprop,polygonbbox,polyid) {
            if (turf.booleanPointInPolygon.default(point, polygon)) {
		prop = polygonprop;
		contained = true;
	    }
        });
        if (contained) {
            results.push(turf.invariant.getCoord(point));
	    cnt++;
        }
    });
    if ( cnt < 1 ) {
	return null;
    } else {
	return turf.helpers.multiPoint(results,prop);
    }
}

function _create_landcover_sampling( layer,x,y,z ) {
    var x0 = _tile2long(x,z);
    var y0 = _tile2lat(y,z);
    var xd = _tile2long(x+1,z) - x0;
    var yd = _tile2lat(y+1,z) - y0;
    var xp = 0;
    var yp = 0;
    var tile_extent = layer.extent;
    var multipoints = [];

    for(var i = 0,len=layer.length; i < len; i++) {
        var f = layer.feature(i);
        //VectorTileFeature.types = ['Unknown', 'Point', 'LineString', 'Polygon'];
        var prop = "";
        if (typeof f.properties === "undefined") {
            prop = new Object();
        } else {
            prop = f.properties;            
            if (typeof f.properties.class === "undefined") {
                // for nextzen server tile
                prop.class = f.properties.kind;            
            }
        }

        if ( prop.class == "wood" || prop.class == "grass" || prop.class == "forest" 
                || prop.class == "natural_wood"  ) {
        
            var geo = f.loadGeometry();
            prop.kind = "landcover";
            prop.type = "_" + x + "_" + y + "_" + z;

            var ret = [];
            for(var j = 0,len2=geo.length; j < len2; j++) {
                var len3 = geo[j].length;
                if ( len3 > 3 ) {
                    ret[j] = [];
                    for(var k = 0; k < len3; k++) {
                        xp = x0 + ( geo[j][k].x / tile_extent * xd );
                        yp = y0 + ( geo[j][k].y / tile_extent * yd );
                        ret[j][k] = [ xp, yp ];
                    }
                    var aline = turf.helpers.lineString(ret[j],prop) ;
                    var apoly = turf.lineToPolygon.default(aline) ;
                    var area = turf.area.default(apoly); // square meter
                    var count = Math.floor(area / FOREST_DENSITY) ;
                    var bbox = turf.bbox.default(aline);
                    var points = turf.random.randomPoint(count,{ bbox: bbox });
                    var inpoints = createPointsWithinPolygon(points, apoly);
                    if ( inpoints != null ) multipoints.push ( inpoints  );
                }
            }
        }
    }
    return turf.helpers.featureCollection(multipoints);
}
function _create_park_sampling( layer,x,y,z ) {
    var x0 = _tile2long(x,z);
    var y0 = _tile2lat(y,z);
    var xd = _tile2long(x+1,z) - x0;
    var yd = _tile2lat(y+1,z) - y0;
    var xp = 0;
    var yp = 0;
    var tile_extent = layer.extent;
    var multipoints = [];

    for(var i = 0,len=layer.length; i < len; i++) {
        var f = layer.feature(i);
        var prop = "";
        //VectorTileFeature.types = ['Unknown', 'Point', 'LineString', 'Polygon'];
        if (typeof f.properties === "undefined") {
            prop = new Object();
        } else {
            prop = f.properties;            
        }
        var geo = f.loadGeometry();
	prop.kind = "park";
        prop.type = "_" + x + "_" + y + "_" + z;
	var ret = [];
        for(var j = 0,len2=geo.length; j < len2; j++) {
	    var len3 = geo[j].length;
	    if ( len3 > 3 ) {
		ret[j] = [];
		for(var k = 0; k < len3; k++) {
                    xp = x0 + ( geo[j][k].x / tile_extent * xd );
                    yp = y0 + ( geo[j][k].y / tile_extent * yd );
		    ret[j][k] = [ xp, yp ];
		}
		var aline = turf.helpers.lineString(ret[j],prop) ;
		var apoly = turf.lineToPolygon.default(aline) ;
		var area = turf.area.default(apoly); // square meter
		var count = Math.floor(area / FOREST_DENSITY) ;
		var bbox = turf.bbox.default(aline);
		var points = turf.random.randomPoint(count,{ bbox: bbox });
		var inpoints = createPointsWithinPolygon(points, apoly);
		if ( inpoints != null ) multipoints.push ( inpoints  );
	    }
        }
    }

    return turf.helpers.featureCollection(multipoints);
}

function _gettilevector(x0,y0,z0)  {

    var uri = 'unknown';
    if ( LAYER_3D_URI == 'nextzen' ) uri = _get_uri_nextzen(x0,y0,z0);
    if ( LAYER_3D_URI == 'openmaptiles' ) uri = _get_uri_openmaptiles(x0,y0,z0);

    var xhr = new XMLHttpRequest();
    xhr.open('GET', uri , true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function() {
        
        var key = _get_tile_hash_key(x0,y0,z0);
        
	if (this.status == 200) {

	    // Success
	    var tile = new VectorTile( new pbf( new Uint8Array(this.response) ) );
	    //$('#tarea').html(JSON.stringify(tile));
	    var layer = tile.layers;
	    //
	    // water
	    // waterway
	    // landcover ( Landcover is used to describe the physical material at the surface of the earth. Land covers include grass, asphalt, trees, bare ground, water, etc. )
	    // landuse  ( Land use, as the name suggests, describes what an area of land is used for e.g. housing, commercial activities, farming, education, leisure, etc.  )
	    // mountain_peak
	    // park
	    // boundary 
	    // trainsportation
	    // building
	    // water_name
	    // transportation_name
	    // place
	    // poi
	    // 
	    //
	    //
	    //
	    //
	    //VectorTileFeature.types = ['Unknown', 'Point', 'LineString', 'Polygon'];
	    // f.type = 0,1,2,3
	    //

	    CZML = [{
		"id" : "document",
		"name" : key + "_POLY",
		"version" : "1.0"
	    }];

	    var geo = null;
	    if ( layer[ LAYER_BUILDING_KEY ] ) {
                if ( TILE_IS_POLYGON ) {
                    geo = _create_building_geojson( layer[ LAYER_BUILDING_KEY ],x0,y0,z0 );
                    if (  TILE_IS_TEXTURE ) {
                        _create_building_czml( CZML , geo.features );
                    } else {
                        _create_building_czml_withouttexture( CZML , geo.features );
                    }
                }
	    }
            
            if ( CZML.length > 1 ) {
                //console.log(CZML);
                //  Normal Message  Object 
                //var ret = { 'cmd': "czml", 'tile' : key, 'result' : CZML };
                //self.postMessage( ret );

                // Tansfer array buffer                
                //var czmlstring = JSON.stringify(CZML);
                //var uint8_array = new TextEncoder(document.characterSet.toLowerCase()).encode(czmlstring);
                var uint8_array = new TextEncoder().encode( JSON.stringify(CZML) );
                var array_buffer = uint8_array.buffer;
                self.postMessage(array_buffer, [array_buffer]);               
                
            } else {
                //console.log(layer);
                //var z = z0 - 1;
                //if ( z > TILE_MIN_ZOOM ) QUEUE.enqueue({"x":x0, "y":y0, "z":z});               
            }
            

	    CZML = [{
		"id" : "document",
		"name" : key + "_TREE",
		"version" : "1.0"
	    }];
            
	    if ( layer[ LAYER_FOREST_KEY ] ) {
                geo = _create_landcover_sampling( layer[ LAYER_FOREST_KEY ],x0,y0,z0 );
                if (  TILE_IS_TEXTURE ) {
                    _create_tree_czml( CZML , geo.features );
                } else {
                    _create_tree_czml_withouttexture( CZML , geo.features );
                }
	    }
             if ( CZML.length > 1 ) {
                //console.log(CZML);
                //  Normal Message  Object 
                //var ret = { 'cmd': "czml", 'tile' : key, 'result' : CZML };
                //self.postMessage( ret );

                // Tansfer array buffer                
                //var czmlstring = JSON.stringify(CZML);
                //var uint8_array = new TextEncoder(document.characterSet.toLowerCase()).encode(czmlstring);
                var uint8_array = new TextEncoder().encode( JSON.stringify(CZML) );
                var array_buffer = uint8_array.buffer;
                self.postMessage(array_buffer, [array_buffer]);               
                
            } else {
                //console.log(layer);
                //var z = z0 - 1;
                //if ( z > TILE_MIN_ZOOM ) QUEUE.enqueue({"x":x0, "y":y0, "z":z});               
            }
            
            tile = null;

        } else if (this.status == 400 ) {
	    // invalid request 400  No data such zoom level
            console.log("Probably there is no 3D data. 400 error : " + this.statusText);
        } else if (this.status == 404 ) {
            // Not Found 404            
            console.log("404 error : " + this.statusText);
	} else if (this.status == 500  ) {
	    // "Failed to load resource: the server responded with a status of 500 (INTERNAL SERVER ERROR)"
            // internal server error 500
            console.log("500 error : " + this.statusText);
	} else {
	    
	    console.log("Unknown error : " + uri + " " + this.statusText);
	};
        
        if ( TILE_HASH[key] ) {
            TILE_HASH[key] = this.status;
        } else {
            //NOP
            console.log("Wrong Hash keys : " + key );
        }        
        _queue_next();
    }
    xhr.send();
}

function _queue_next(){

    if ( QUEUE.getLength() > 0 ) {
	// If Queue is over max
	// old queue throw away
	var q = null;
	for(var i = 0,len=QUEUE.getLength()-QUEUE_MAX; i < len; i++) {
	    // Dispose many queue
    	    q = QUEUE.dequeue();

	    var key = _get_tile_hash_key(q.x,q.y,q.z);
	    if ( TILE_HASH[key] ) {
		delete TILE_HASH[key];
	    } else {
		//NOP
	    }
	}
	q = QUEUE.dequeue();
	_gettilevector(q.x,q.y,q.z) ;
    }
}


//////////////////////////////////////////////
// Main Loop
/////////////////////////////////////////////
self.addEventListener('message', function(e) {
    var data = e.data;
    var command = data.cmd;
    if ( command == "update") {
        
        var lat = parseFloat(data.lat);
        var lng = parseFloat(data.lng);
        var ara = parseFloat(data.area);
	TILE_POLYGON_MAX = parseFloat(data.maxpolygon);
        TILE_DISTANCE = parseFloat(data.distanceDisplay);
	TILE_IS_POLYGON = ! data.withoutbuildings;
	TILE_IS_TEXTURE = data.withtexture;
	
        var z = _getZoomFromMeters( lat, ara );
        var x0 = _long2tile(lng,z);
        var y0 = _lat2tile(lat,z);
        var key = _get_tile_hash_key(x0,y0,z);
        if ( TILE_HASH[key] ) {
            // already exist
            // NOP
        } else {
            TILE_ZOOM =  z;
            _cesium_height_workaround(lng,lat);
            QUEUE.enqueue({"x":x0, "y":y0, "z":z});
            TILE_HASH[key] = 1;
        }
        _queue_next();
    } else if ( command == "urilist") {
        GH_URILIST = data.value;
    } else if ( command == "remove") {
        var x0 = parseInt(data.lat,10);
        var y0 = parseInt(data.lng,10);
        var z0 = parseInt(data.area,10);
        var key = "TILE_" + x0 + "_" + y0 + "_" + z0;        
        if ( TILE_HASH[key] ) {
            delete TILE_HASH[key]; 
        } else {
           // NOP;
        }
    } else if ( command == "reset") {
	TILE_HASH = {};
    } else {
        // NOP
    }
    e = null;
        
});
