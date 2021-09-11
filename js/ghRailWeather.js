/////////////////////////////
//
//  Cesium Weather component
//
//  Require Cesiumjs
//
//


var GH_RAIN_SHADER_SRC =
'varying vec3 v_positionEC;' +
'varying vec3 v_normalEC;' +
'varying vec4 v_color;' +
'float rand(vec2 co){' +
'    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);' +
'}' +
'float char(vec2 outer, vec2 inner) {' +
'	vec2 seed = floor(inner * 4.0) + outer.y;' +
'	if (rand(vec2(outer.y, 23.0)) > 0.98) {' +
'		seed += floor((czm_frameNumber + rand(vec2(outer.y, 41.0))) * 3.0);' +
'	}'+
'	return float(rand(seed) > .4);'+
'}'+
'void main()' +
'{' +
'vec3 positionToEyeEC = -v_positionEC;' +
'vec3 normalEC = normalize(v_normalEC);' +
'vec3 sun_direction = normalize(czm_sunDirectionWC);' + 
'czm_materialInput materialInput;' +
'materialInput.normalEC = normalEC;' +
'materialInput.positionToEyeEC = positionToEyeEC;' +
'czm_material material = czm_getDefaultMaterial(materialInput);' +
'material.diffuse = v_color.rgb;' +
'float rx = gl_FragCoord.x;' +
'float x = floor(rx);' +
'float ry = gl_FragCoord.y + rand(vec2(x, x * 13.0)) * 100000.0 + czm_frameNumber * rand(vec2(x, 23.0)) * 120.0;' +
'float mx = mod(rx, 10.0);' +
'float my = mod(ry, 30.0);' +
'if (my < 24.0) {' +
'gl_FragColor = vec4(0);' +
'} else {' +
'float b = char(vec2(rx, floor((ry) / 30.0)), vec2(mx, my) / 24.0);' +
'material.alpha = clamp(b,0.,0.99);' +
'gl_FragColor = czm_phong(normalize(positionToEyeEC), material,sun_direction);' +
'}' +	
'}' ;


function ghRainGetArea(c) {
    // c = Cartographic();
    var c0 = Cesium.Cartographic.clone(c);
    c0.longitude = c0.longitude+0.001;
    c0.latitude = c0.latitude+0.001;
    var c1 = Cesium.Cartographic.clone(c);
    c1.longitude = c1.longitude-0.001;
    c1.latitude = c1.latitude-0.001;
    return Cesium.Rectangle.fromCartographicArray([c,c0,c1]);
}
function ghRainCalcRandom(s,r) {
    return s + Cesium.Math.nextRandomNumber() * r - ( r / 2 );
}
function ghRainMovePrimitive(pos,entity) {
    var center = new Cesium.Cartographic();
    pos.clone(center);
    var coef = Cesium.Math.nextRandomNumber() * 0.69777 - 0.34888; // 40 degrees ( +- 20 deg )
    var rotz = new Cesium.Matrix3.fromRotationZ( coef , new Cesium.Matrix3() );
    var m = Cesium.Matrix4.multiplyByMatrix3(
	Cesium.Transforms.eastNorthUpToFixedFrame(
	    Cesium.Cartesian3.fromRadians( center.longitude, center.latitude, 0.0)
	),
	rotz,
	new Cesium.Matrix4());
    entity.modelMatrix = m;
}
function ghRainCreatePrimitive(pos,points) {
    //pos cartographic
    var maxradii = 200;
    //var points_coeff = 100; // >= maxradii
    var center = new Cesium.Cartographic();
    
    var c = new Array();
    var m = new Cesium.Matrix4();
    var maxpoints = 0;
    Cesium.Math.setRandomNumberSeed( 19 );

    for(var r = 1; r < maxradii; r++)  {
	maxpoints = (points/r); // y = k / r 
	maxpoints = maxpoints|0;
	for(var j = 0; j < maxpoints; j++)  {
	    var t = Cesium.Math.nextRandomNumber() * Cesium.Math.TWO_PI;
	    var offset = ghRainCalcRandom(0,10);
	    var x =  r * Math.cos(t);
	    var y =  r * Math.sin(t);
	    c.push ( new Cesium.GeometryInstance({
		geometry : new Cesium.SimplePolylineGeometry({
		    positions : [ new Cesium.Cartesian3.fromElements(x,y,8000.0),
				  new Cesium.Cartesian3.fromElements(x+offset,y+offset,-100.0) ]
		}),
		id: "rain_polyline",
		attributes: {
		    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.LIGHTSLATEGRAY.withAlpha(0.0))
		}
	    }) );
	}
    }

    pos.clone(center);
    m = Cesium.Transforms.eastNorthUpToFixedFrame(
	Cesium.Cartesian3.fromRadians(center.longitude,center.latitude,0.0));

    return new Cesium.Primitive({
	geometryInstances : c,
	allowPicking : false,
        vertexCacheOptimize: true,
	modelMatrix : m,
	appearance : new Cesium.PerInstanceColorAppearance({
	    fragmentShaderSource : GH_RAIN_SHADER_SRC
	})
    });

}
function ghRainRemove(scene,entity) {
    if ( entity != null ) {
    	scene.primitives.remove(entity);
    }
    entity = null;
}



