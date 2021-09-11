//
//
//   Geogplyph Rail Timetable 
//     Material design and time editor
//
//   railtime.html
//     |- turfRail.min.js
//     |- ghRailBroadcast.js  ( Communicate for ghRail.js )
//     |- ghRailTime.js
//
//
//
//    Geoglyph Rail timetable editor jExcel ver
//    //
//    https://bossanova.uk/jexcel/v4/examples/tabs
//    //
//.jexcel .highlight-bottom {
//    border-bottom: 1px solid #000;
//}
//
//.jexcel > tbody > tr > td {
//    border-top: 1px solid #ccc;
//    border-left: 1px solid #ccc;
//    border-right: 1px solid transparent;
//    border-bottom: 1px solid transparent;
//    padding: 4px;
//    white-space: nowrap;
//    box-sizing: border-box;
//    line-height: 1em;
//}
//
var GH_REV = 'Revision 5.9';

var GH_DATA = {
    name : null,
    id : null,
    lineid : "",
    way : [],
    geomfile : null,
    geo : [],
    units : []
}

var GH_TABS = null;
var GH_UNITS = null;
var GH_MARKER = null;
var GH_LOCOMOTIVE = null;

var GH_TABLE = [];
var GH_TABLE_CURRENT_KEY = 2;
GH_TABLE[0] = {
    sheet : null,
    status : -1,
    rows : 0,
    cols : 0,
    data : []
}
GH_TABLE[1] = {
    sheet : null,
    status : -1,
    rows : 0,
    cols : 0,
    data : []
}
var GH_TABLE_PROP = {
    stationstep : 16,
    stationstring : "Station",
    stationwidth : 100
}
var GH_BLINK = [];
GH_BLINK[0] = {
    time : "",
    ontimer : null,
    offtimer : null,
    interval : 500,
    cells : [],
    updatecount : 0,
    updatemax : 80
}
GH_BLINK[1] = {
    time : "",
    ontimer : null,
    offtimer : null,
    interval : 500,
    cells : [],
    updatecount : 0,
    updatemax : 80
}
GH_BLINK_PROP = {
    onstyle : '1px solid #f00',    
    offstyle : '1px solid transparent' 
}

// Unit station data type
var GH_TYPE_ARRIVAL = 2;
var GH_TYPE_DEPATURE = 4;
var GH_TYPE_THROUGH = 7;

var COLNAME = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','AA','AB','AC','AD','AE','AF','AG','AH','AI','AJ','AK','AL','AM','AN','AO','AP','AQ','AR','AS','AT','AU','AV','AW','AX','AY','AZ','BA','BB','BC','BD','BE','BF','BG','BH','BI','BJ','BK','BL','BM','BN','BO','BP','BQ','BR','BS','BT','BU','BV','BW','BX','BY','BZ','CA','CB','CC','CD','CE','CF','CG','CH','CI','CJ','CK','CL','CM','CN','CO','CP','CQ','CR','CS','CT','CU','CV','CW','CX','CY','CZ','DA','DB','DC','DD','DE','DF','DG','DH','DI','DJ','DK','DL','DM','DN','DO','DP','DQ','DR','DS','DT','DU','DV','DW','DX','DY','DZ','EA','EB','EC','ED','EE','EF','EG','EH','EI','EJ','EK','EL','EM','EN','EO','EP','EQ','ER','ES','ET','EU','EV','EW','EX','EY','EZ','FA','FB','FC','FD','FE','FF','FG','FH','FI','FJ','FK','FL','FM','FN','FO','FP','FQ','FR','FS','FT','FU','FV','FW','FX','FY','FZ','GA','GB','GC','GD','GE','GF','GG','GH','GI','GJ','GK','GL','GM','GN','GO','GP','GQ','GR','GS','GT','GU','GV','GW','GX','GY','GZ'];


var GH_MSG_WS_NOT_VALID =  'Whitespace is not allowed !<BR>Not a valid  Train ID';
var GH_MSG_SAME_ID =  'Same ID already exist. !<BR>Please change other ID';
var GH_MSG_NOT_EDIT_COL =  'Can not edit this column !';
var GH_MSG_WRONG_TIME =  'Wrong time data !';
var GH_MSG_PREV_INCORRECT = 'The elapsed time from the previous stop is incorrect !';
var GH_MSG_NEXT_INCORRECT = 'The elapsed time from the next stop is incorrect !';
var GH_MSG_WRONG_COL = 'Select right column !';


var GH_COPY_TABLE_HEADER = null;

var GH_URILIST = [];
function ghGetResourceUri(file) {
    var idx = Math.floor(Math.random() * GH_URILIST.length);
    var u = GH_URILIST[idx] + file;
    return u
}

//////////////////////////////////////////////////////
//   Diagram
//  https://www.bannerkoubou.com/photoeditor/grid/
//  https://www.achiachi.net/blog/leaflet/divicon
//
var GH_PIXEL_PER_MINUTES = 2;
var GH_TIME_PIXEL = 24 * 60 * GH_PIXEL_PER_MINUTES; // 2880px
var GH_PIXEL_PER_KILOMETER = 3;
var GH_KILO_PIXEL = 500 * GH_PIXEL_PER_KILOMETER; // 1500px
var GH_DIAGRAM = null;
var GH_STATION_YRATIO = {};
var GH_DIAGRAM_CURRENTTIME = null;
var GH_DIAGRAM_AXIS = [];
GH_DIAGRAM_AXIS[0] = [];
GH_DIAGRAM_AXIS[1] = [];
var GH_DIAGRAM_CHART = [];
GH_DIAGRAM_CHART[0] = [];
GH_DIAGRAM_CHART[1] = [];
var GH_DIAGRAM_COLOR = {
    "up" : '#4682b4', // steelblue
    "down" : '#228b22', // Forestgreen
    "time" : '#dc143c', // Crimson
    "station" : '#d2b48c' // tan
};

function ghInitializeDiagram(id) {
    
    $('#gh_diagram').height(TABLE_H).width(TABLE_W);
    
    var ch = parseInt(GH_KILO_PIXEL/2,10);
    var cw = parseInt(GH_TIME_PIXEL/2,10);

    GH_DIAGRAM = L.map('gh_diagram', {
        crs: L.CRS.Simple,
        minZoom: -3,
        maxZoom: 5,
        
    });
    var bounds = [[0,0],[GH_KILO_PIXEL,GH_TIME_PIXEL]]; // H,W
    var backimg = L.imageOverlay('../images/diagramgrid.png',bounds).addTo(GH_DIAGRAM);
    GH_DIAGRAM.setView( [ch, cw], -1);
    //GH_DIAGRAM.fitBounds(bounds);
};
function ghClearDiagramAxis(id) {  
    var m = GH_DIAGRAM_AXIS[id];
    for ( var i = 0,ilen = m.length; i< ilen; i++ ) {
        GH_DIAGRAM.removeLayer(m[i]);
    }        
    GH_DIAGRAM_AXIS[id] = [];
}
function ghDrawDiagramAxis(id) {  

    if ( GH_TABLE[id].status < 0 ) return;
    
    GH_STATION_YRATIO = {};
    var totaldistance = GH_TABLE[id].sheet.getValueFromCoords(0,GH_TABLE[id].rows-1);
    
    for ( var y=0;y<GH_TABLE[id].rows;y++) {
        var cellstation = GH_TABLE[id].sheet.getValueFromCoords(1,y);
        if ( cellstation != "" ) {
            if ( ( typeof GH_STATION_YRATIO[cellstation] ) == 'undefined' ) {            
                // Not Yet
                GH_STATION_YRATIO[cellstation] = GH_TABLE[id].sheet.getValueFromCoords(0,y) / totaldistance;
            } else {
                // Already Exist
            }        
        } else {
            // NOP
        }
    }

    // Y axis
    for ( key in GH_STATION_YRATIO ) {
        var strwidth = 10 * key.length;
        var strheight = 16;
         
        var divIcon = L.divIcon({
            html: key,
            className: 'diagramtexticon',
            iconSize: [strwidth,strheight]
        });
        
        // Left side
        var xpos = 30;
        var ypos = GH_KILO_PIXEL - ( GH_KILO_PIXEL * GH_STATION_YRATIO[key] );
        var m = L.marker([ypos, xpos], {icon: divIcon}).addTo(GH_DIAGRAM);
        GH_DIAGRAM_AXIS[id].push(m);

        // Right side
        m = L.marker([ypos, GH_TIME_PIXEL], {icon: divIcon}).addTo(GH_DIAGRAM);
        GH_DIAGRAM_AXIS[id].push(m);

        var l = L.polyline([[ypos,xpos], [ypos,GH_TIME_PIXEL]],{
            color: GH_DIAGRAM_COLOR.station,
            opacity: 0.4,
            fill: false,
            weight: 3
        }).addTo(GH_DIAGRAM).bindPopup(key).bindTooltip(key);
        GH_DIAGRAM_AXIS[id].push(l);        
    }

    // X axis
    var strwidth = 10 * 5;
    var strheight = 16;
    for ( var x=0;x<24;x++) {
	// x indicate [hour]
        var xpos = GH_PIXEL_PER_MINUTES * ( x * 60 ) ;
	var ypos = GH_KILO_PIXEL;
        var col = GH_DIAGRAM_COLOR.time;
	var str = x + ":00";
        var divIcon = L.divIcon({
            html: str,
            className: 'diagramtexticon',
            iconSize: [strwidth,strheight]
        });

	// top
        m = L.marker([ypos, xpos], {icon: divIcon}).addTo(GH_DIAGRAM);
        GH_DIAGRAM_AXIS[id].push(m);

	// bottom
        m = L.marker([0, xpos], {icon: divIcon}).addTo(GH_DIAGRAM);
        GH_DIAGRAM_AXIS[id].push(m);
    }

    
}


function ghClearDiagramChart(id) {  
    var m = GH_DIAGRAM_CHART[id];
    for ( var i = 0,ilen = m.length; i< ilen; i++ ) {
        GH_DIAGRAM.removeLayer(m[i]);
    }        
    GH_DIAGRAM_CHART[id] = [];
}

function ghDrawDiagramChart(id) {  

    if ( GH_TABLE[id].status < 0 ) return;
    var col = GH_DIAGRAM_COLOR.down;
    if ( id > 0 )  col = GH_DIAGRAM_COLOR.up;
    
    
    for ( var x=2;x<GH_TABLE[id].cols;x++) {
        var title = GH_TABLE[id].sheet.getHeader(x);
        if ( title == GH_TABLE_PROP.stationstring ) {
            // NOP
        } else {
            var txt = "<B>" + title + "</B><BR>";
            var poly = [];
            var startsec = -1;
            //"0T05:43:00","Paris Nord",type(2,4,7),"0T07:58:00","London St Pancras",type(2,4,7)
            // Unit station data type
            //var GH_TYPE_ARRIVAL = 2;
            //var GH_TYPE_DEPATURE = 4;
            //var GH_TYPE_THROUGH = 7;
            for ( var y=0;y<GH_TABLE[id].rows;y++) {
                var val = GH_TABLE[id].sheet.getValueFromCoords(x,y);
                if ( val != "" ) {
                    if ( startsec < 0 ) {
                        startsec = ghCalcPointTime( ghCreateISOTimeFormat(0,val) );
                    }
                    var sta0 = GH_TABLE[id].sheet.getValueFromCoords(1,y);
                    if ( y > 0 && sta0 == "" ) {
                        sta0 = GH_TABLE[id].sheet.getValueFromCoords(1,y-1);
                    }
                    
                    var sec = ghCalcPointTime( ghCreateISOTimeFormat(0,val) );
                    if ( sec < startsec ) {
                        sec = ghCalcPointTime( ghCreateISOTimeFormat(1,val) );
                    }
                    var ratio = GH_STATION_YRATIO[ sta0 ];

                    if( isNaN(sec) ) {
                        var errmsg = "sec NAN " + id + " " + title + " " + y + " " + sta0;
                        console.log(errmsg);
                    } else {
                        if( isNaN(ratio) ) {
                            var errmsg = "ratio NAN " + id + " " + title + " " + y + " " + sta0;
                            console.log(errmsg);
                        } else {
                            txt += "&nbsp;" + sta0 + "&nbsp;" + val + "<BR>";
                            var xpos = GH_PIXEL_PER_MINUTES * ( sec / 60 );
                            var ypos = GH_KILO_PIXEL - ( GH_KILO_PIXEL * ratio );
                            poly.push([ ypos, xpos ]);
                        }
                    }                  
                }
            }

            if ( poly.length > 1 ) {
                var popup = L.popup({minWidth: 100, maxWidth: 300, closeButton:true}).setContent( txt );
                var l = L.polyline(poly,{
                    color: col,
                    opacity: 0.8
                }).addTo(GH_DIAGRAM).bindPopup(popup).bindTooltip(title);
                GH_DIAGRAM_CHART[id].push(l);
            }

        }
    }
}    



function ghUpdateDiagramChart(id) {  
    ghClearDiagramChart(id);
    ghDrawDiagramChart(id);
}


function ghClearDiagramCurrenttime() { 
    if ( GH_DIAGRAM_CURRENTTIME != null ) {
        GH_DIAGRAM.removeLayer(GH_DIAGRAM_CURRENTTIME);
    }
    GH_DIAGRAM_CURRENTTIME = null;
}
function ghDrawDiagramCurrenttime(t) {  
    // t = 10:55
    var sec = ghCalcPointTime("0T" + t + ":00");
    if( isNaN(sec) ) {
        console.log("sec NAN");
        console.log(t);
    } else {
        var xpos = GH_PIXEL_PER_MINUTES * ( sec / 60 );
        var col = GH_DIAGRAM_COLOR.time;
        var poly = [ [ 0, xpos ], [ GH_KILO_PIXEL, xpos ] ];
    
        ghClearDiagramCurrenttime();
        GH_DIAGRAM_CURRENTTIME = L.polyline(poly,{
            color: col,
            opacity: 0.8
        }).addTo(GH_DIAGRAM).bindPopup(t).bindTooltip(t);
    }
}


function ghSelectCurrentTab(e) {
    // e = DOM object
    var istr = e.id.split("-");  // id="time-tab-0"
    var id = parseInt(istr[2],10);
    GH_TABLE_CURRENT_KEY = id;
}

///////////////////////////////////////////////////////
// Unit station data type
//var GH_TYPE_ARRIVAL = 2;
//var GH_TYPE_DEPATURE = 4;
//var GH_TYPE_THROUGH = 7;
//"0T05:43:00","Paris Nord",type(2,4,7),"0T07:58:00","London St Pancras",type(2,4,7)
// Unit station data type
//
function ghCreateTimetableArray(id,x) {
    var ret = [];
    var type = -1;
    var startsec = -1;
    for ( var y=0;y<GH_TABLE[id].rows;y++) {
        var val = GH_TABLE[id].sheet.getValueFromCoords(x,y);
        if ( val != "" ) {
            if ( startsec < 0 ) {
                startsec = ghCalcPointTime( ghCreateISOTimeFormat(0,val));
            }
            var sta0 = GH_TABLE[id].sheet.getValueFromCoords(1,y);
            if ( y > 0 && sta0 == "" ) {
                sta0 = GH_TABLE[id].sheet.getValueFromCoords(1,y-1);
                type = 4;
            } else {
                if ( type < 0 ) {
                    type = 4;
                } else {
                    type = 2;                        
                }
            }
            var sec = ghCalcPointTime( ghCreateISOTimeFormat(0,val) );
            if ( sec < startsec ) {
                val = ghCreateISOTimeFormat(1,val);
            } else {
                val = ghCreateISOTimeFormat(0,val);
            }  
            ret.push(val);
            ret.push(sta0);
            ret.push(type);
        }
    }
    
    return ret;
}
function ghCreateTimeFormat_old(str) {

    if( isNaN(str) ) return "0T00:00:00";

    var len = str.length;
    if ( len > 4 ) return "0T00:00:00";

    var ret = "";
    if ( len == 1 ) {
	// M -> 000M
	ret = "1T00:0" + str + ":00";
    } else if ( len == 2 ) {
	// MM -> 00MM
	ret = "1T00:" + str + ":00";
    } else if ( len == 3 ) {
	// HMM -> 0HMM
	var h = str.substr(0,1);
	if ( parseInt(h,10) < 1 ) {
	    // Next Day
	    ret = "1T0" + str.substr(0,1) + ":" + str.substr(1,2) + ":00";
	} else {
	    ret = "0T0" + str.substr(0,1) + ":" + str.substr(1,2) + ":00";
	}
    } else {
	// HHMM
	var h = str.substr(0,2);
	if ( parseInt(h,10) < 1 ) {
	    // Next Day
	    ret = "1T" + str.substr(0,2) + ":" + str.substr(2,2) + ":00";
	} else {
	    ret = "0T" + str.substr(0,2) + ":" + str.substr(2,2) + ":00";
	}
    }

    return ret;
    
};

function ghCreateISOTimeFormat(d,str) {
    if( isNaN(str) ) return "0T00:00:00";
    
    var day = parseInt(d,10);
    if( isNaN(day) ) day = 0;
    
    var len = str.length;
    day = "" + day + "T";
    
    if ( len < 1 || len > 4 ) {
        return day + "00:00:00";
    }
    var ret = "";
    if ( len == 1 ) {
	// M -> 000M
	ret = day + "00:0" + str + ":00";
    } else if ( len == 2 ) {
	// MM -> 00MM
	ret = day + "00:" + str + ":00";
    } else if ( len == 3 ) {
	// HMM -> 0HMM
        ret = day + "0" + str.substr(0,1) + ":" + str.substr(1,2) + ":00";        
    } else {
	// HHMM
        ret = day + "" + str.substr(0,2) + ":" + str.substr(2,2) + ":00";
    }
    return ret;
};

function ghCheckTimeFormat(data) {

    if( isNaN(data) ) return false;

    var len = data.length;
    if ( len > 4 ) return false;

    var str = "";
    if ( len == 1 ) {
	// M -> 000M
	str = "000" + data;
    } else if ( len == 2 ) {
	// MM -> 00MM
	str = "00" + data;
    } else if ( len == 3 ) {
	// HMM -> 0HMM
	str = "0" + data;
    } else {
	// HHMM
	str = "" + data;
    }

    var h = parseInt(str.substr(0,2),10);
    var m = parseInt(str.substr(2,2),10);

    if ( h < 0 || h > 23 ) return false;
    if ( m < 0 || m > 59 ) return false;

    return true;
    
};
function ghAddTimeStr(str,min) {
    var len = str.length;
    var ret = "";
    if ( len == 1 ) {
	// M -> 000M
	ret = "000" + str;
    } else if ( len == 2 ) {
	// MM -> 00MM
	ret = "00" + str;
    } else if ( len == 3 ) {
	// HMM -> 0HMM
	ret = "0" + str;
    } else if ( len > 4 ) {
	ret = str.substr(0,4);
    } else {
	// HHMM
	ret = "" + str;
    }

    var h = parseInt(ret.substr(0,2),10);
    var m = parseInt(ret.substr(2,2),10);

    var tm = 60 * h + m + min;

    h = Math.floor(tm/60);
    m = parseInt(tm % 60,10);

    if ( h < 10 ) {
	h = "0" + h;
    }
    if ( m < 10 ) {
	m = "0" + m;
    }
    return "" + h + m;
}

function ghOnclickAddTime(id,x,min) {
    var col = GH_TABLE[id].sheet.getColumnData(x);

    for ( var y=0;y<col.length;y++) {
	if ( col[y] != "" ) {
	    col[y] = ghAddTimeStr(col[y],min);
	}
    }
    
    // avoid     onchange: _ghOnchangeValue Event
    if ( min > 0 ) {
	for ( var y=col.length-1;y>-1;y--) {
	    if ( col[y] != "" ) {
		GH_TABLE[id].sheet.setValueFromCoords(x,y,col[y]);
	    }
	}
    } else {
	for ( var y=0;y<col.length;y++) {
	    if ( col[y] != "" ) {
		GH_TABLE[id].sheet.setValueFromCoords(x,y,col[y]);
	    }
	}
    }
    //GH_TABLE.sheet.setColumnData(x,col);
}
function ghOnclickSubtractTime(id,x,min) {
    if ( min > 0 ) {
        min = -1 * min;
    }
    ghOnclickAddTime(id,x,min);
}
function ghTrainMarkerModalOK(){
    var tid = ghGetUnitIndexFromTrainID( $('#gh_marker_trainid').val() );
    if ( tid < 0 ) {
	// NOP
    } else {
	GH_DATA.units[tid].marker = $("input[name='trainmarker']:checked").val();
	console.log(GH_DATA.units[tid].marker);
    }
}
function ghTrainModelModalOK(){
    var tid = ghGetUnitIndexFromTrainID( $('#gh_model_trainid').val() );
    if ( tid < 0 ) {
	// NOP
    } else {
	GH_DATA.units[tid].locomotive = $("input[name='train3dmodel']:checked").val();
	GH_DATA.units[tid].gltf = null;
	console.log(GH_DATA.units[tid].locomotive);
    }
}
function ghRenameTrainIDModalOK(){
    var data = $("#gh_trainid").val();
    var col = $("#gh_trainid_column").val();
    var id = $("#gh_trainid_columntab").val();
    var prevdata = $("#gh_trainid_prev").val();

    if (/\s/.test(data)) {
	M.toast({html: GH_MSG_WS_NOT_VALID})
    } else {
	var idx = ghGetUnitIndexFromTrainID(data);
	if ( idx < 0  ) {
	    GH_TABLE[id].sheet.setHeader(col,data);
	    var pidx = ghGetUnitIndexFromTrainID(prevdata);
	    GH_DATA.units[pidx].trainid = data;
	} else {
	    M.toast({html: GH_MSG_SAME_ID})
	}
    }
}

function ghDeleteTrainColumnModalOK() {
    var x = $('#gh_deletetraincolumn').val();
    var id = $('#gh_deletetraincolumntab').val();
    var title = GH_TABLE[id].sheet.getHeader(x);
    GH_TABLE[id].sheet.deleteColumn(parseInt(x,10));            
    var idx = ghGetUnitIndexFromTrainID(title);
    GH_DATA.units.splice(idx,1);
    GH_BLINK[id].updatecount = GH_BLINK[id].updatemax + 100; // Force Update
    GH_TABLE[id].cols--;
}

function ghTablePasteColmuns(currentheader) {
    //var id = ghGetUnitIndexFromTrainID(columnid);
    //  trainid = columnid // column header;
    var copyid = ghGetUnitIndexFromTrainID(GH_COPY_TABLE_HEADER);
    var currentid = ghGetUnitIndexFromTrainID(currentheader);

    if ( copyid > -1 && currentid > -1 ) {
        GH_DATA.units[currentid].marker = GH_DATA.units[copyid].marker;
        GH_DATA.units[currentid].locomotive = GH_DATA.units[copyid].locomotive;
        GH_DATA.units[currentid].geometry = GH_DATA.units[copyid].geometry;
        GH_DATA.units[currentid].way = GH_DATA.units[copyid].way;
    }
}
function ghOnclickRenameColumn(x) {
    var title = GH_TABLE[GH_TABLE_CURRENT_KEY].sheet.getHeader(x);
    if ( title == GH_TABLE_PROP.stationstring ) {
	M.toast({html: GH_MSG_NOT_EDIT_COL})
	return;
    }
    $('#gh_trainid').val(title);
    $('#gh_trainid_prev').val(title);
    $('#gh_trainid_column').val(x);
    $('#gh_trainid_columntab').val(GH_TABLE_CURRENT_KEY);
    $('#gh_trainidmodal').modal('open');
}
function ghGetPreviousTimeData(id,x,y) {
    var ret = null;
    for ( var i=parseInt(y,10)-1;i>-1;i--) {
        var dat = GH_TABLE[id].sheet.getValueFromCoords(x,i);
	if ( dat != "" ) {
	    ret = dat;
	    break;
	}
    }
    return ret;
};
function ghGetNextTimeData(id,x,y) {
    var ret = null;
    for ( var i=parseInt(y,10)+1;i<GH_TABLE[id].rows;i++) {
        var dat = GH_TABLE[id].sheet.getValueFromCoords(x,i);
	if ( dat != "" ) {
	    ret = dat;
	    break;
	}
    }
    return ret;
};
function ghElapsedTimeData(prev,value) {
    var ret = -1;
    var pprev = parseInt( prev, 10);
    var vvalue = parseInt( value , 10);
    ret = vvalue - pprev;

    if ( ret < -2000 ) {
	// pattern 
	//  2310
	//  0010
	return 0;
    } else {
	return ret;
    }
}
function _ghOnchangeValue(instance, cell, x, y, value) {

    if ( x < 2 ) return; // No Check
    if ( value == "" ) return; // No Check
    if ( GH_TABLE_CURRENT_KEY > 1 ) return;
    
    var title = GH_TABLE[GH_TABLE_CURRENT_KEY].sheet.getHeader(x);
    if ( title == GH_TABLE_PROP.stationstring ) {
	if ( value != GH_BUFFER.value ) GH_TABLE[GH_TABLE_CURRENT_KEY].sheet.setValueFromCoords(x,y,GH_BUFFER.value);
	M.toast({html: GH_MSG_NOT_EDIT_COL})
	return;
    }

    if ( ! ghCheckTimeFormat(value) ) {
	if ( value != GH_BUFFER.value ) GH_TABLE[GH_TABLE_CURRENT_KEY].sheet.setValueFromCoords(x,y,GH_BUFFER.value);
	M.toast({html: GH_MSG_WRONG_TIME})
	return;
    }

    var prev = ghGetPreviousTimeData(GH_TABLE_CURRENT_KEY,x,y);
    if ( prev == null ) {
	// OK first time
    } else {
	var ret = ghElapsedTimeData(prev,value);
	if ( ret < 0 ) {
	    if ( value != GH_BUFFER.value ) GH_TABLE[GH_TABLE_CURRENT_KEY].sheet.setValueFromCoords(x,y,GH_BUFFER.value);
	    M.toast({html: GH_MSG_PREV_INCORRECT})
	    return;
	} else {
	    // OK
	}
    }

    var next = ghGetNextTimeData(GH_TABLE_CURRENT_KEY,x,y);
    if ( next == null ) {
	// OK last time
    } else {
	var ret = ghElapsedTimeData(value,next);
	if ( ret < 0 ) {
	    if ( value != GH_BUFFER.value ) GH_TABLE[GH_TABLE_CURRENT_KEY].sheet.setValueFromCoords(x,y,GH_BUFFER.value);
	    M.toast({html: GH_MSG_NEXT_INCORRECT})
	    return;
	} else {
	    // OK
	}
    }

    return;
    
}
var GH_BUFFER = {
    "x1" : 0,
    "x2" : 0,
    "y1" : 0,
    "y2" : 0,
    "value" : ""
};
function _ghOnselectBuffer(instance, x1, y1, x2, y2, origin) {
    if ( GH_TABLE_CURRENT_KEY > 1 ) return;
    
    GH_BUFFER.x1 = x1;
    GH_BUFFER.y1 = y1;
    GH_BUFFER.x2 = x2;
    GH_BUFFER.y2 = y2;
    if ( x1 == x2 && y1 == y2 ) {
	GH_BUFFER.value = GH_TABLE[GH_TABLE_CURRENT_KEY].sheet.getValueFromCoords(x1,y1);
    } else if ( x1 == x2 && y2 - y1 == 1 ) {
	// Station Columns
	GH_BUFFER.value = GH_TABLE[GH_TABLE_CURRENT_KEY].sheet.getValueFromCoords(x1,y1);
    } else {
	GH_BUFFER.value = "";
    }
}

function ghAddNewColumns(pos) {

    if ( GH_BUFFER.x1 < 2 ) {
	M.toast({html: GH_MSG_WRONG_COL})
	return;
    }
    
    if ( pos > 0 ) {
	GH_TABLE.sheet.insertColumn(1,GH_BUFFER.x1,false,null);
    } else {
	GH_TABLE.sheet.insertColumn(1,GH_BUFFER.x1,true,null);
    }
    GH_TABLE.cols++;

}

///////////////////////
//    0: (2) [0, "Zuoying"]
//    1: (2) [31, "Tainan"]
//    2: (2) ["", ""]
//    3: (2) [94, "Chiayi"]
//    4: (2) ["", ""]
//    5: (2) [127, "Yunlin"]
//    6: (2) ["", ""]
//    7: (2) [151, "Changhua"]
//    8: (2) ["", ""]
//    9: (2) [180, "Taichung"]
//    10: (2) ["", ""]
//    11: (2) [241, "Miaoli"]
//    12: (2) ["", ""]
//    13: (2) [273, "Hsinchu"]
//    14: (2) ["", ""]
//    15: (2) [303, "Taoyuan"]
//    16: (2) ["", ""]
//    17: (2) [333, "Banqiao"]
//    18: (2) ["", ""]
//    19: (2) [340, "Taipei"]
//    20: (2) ["", ""]
//    21: (2) [349, "Nangang"]
//    console.log(GH_TABLE.data);
//
//timetable: Array(16)
//0: "0T07:55:00"
//1: "Zuoying"
//1: 2
//2: "0T08:38:00"
//3: "Taichung"
//1: 4
//4: "0T08:39:00"
//5: "Taichung"
//1: 2
//6: "0T09:20:00"
//7: "Banqiao"
//1: 4
//8: "0T09:21:00"
//9: "Banqiao"
//9: 2
//10: "0T09:31:00"
//11: "Taipei"
//11: 4
//12: "0T09:32:00"
//13: "Taipei"
//14: "0T09:40:00"
//15: "Nangang"
////////////////////
function ghGetTimetableIdx(start,table,name) {
    for ( var j=start;j<table.length;j++) {
         if ( table[j] == name ) {
            if ( table[j+1] < GH_TYPE_THROUGH )  {
                return j; 
            } else {
                // NOP Skip passing point
            }
         }
    }
    return -1;
}
function ghFormatTime(str){
    // str = "0T07:55:00"
    var a = str.split("T");
    var b = a[1].split(":");
    return b[0] + b[1];
}
function ghCreateColData(id,timetable) {
    var ret = [];
    var start_idx = 1;
    var idx = 0;
    var isfirst = true;
    for ( var y=0;y<GH_TABLE[id].rows;y++) {
        var cellstation = GH_TABLE[id].sheet.getValueFromCoords(1,y);
        if ( cellstation == "" ) {
	    cellstation = GH_TABLE[id].sheet.getValueFromCoords(1,y-1);
        }
	idx = ghGetTimetableIdx(start_idx,timetable,cellstation);
        if ( idx < 0 ) {
            ret.push("");
        } else {
	    if ( isfirst && y > 0 ) {
		// Next rows data
		ret.push("");
		ret.push( ghFormatTime(timetable[idx-1]) );
		y=y+1;
	    } else {
		ret.push( ghFormatTime(timetable[idx-1]) );
	    }
            start_idx = idx+3;  // Next data in timetable array
	    isfirst = false;
        }
    }

    return ret;
}
function ghCalcPointTime(timestr) {
    // "0T07:54:00" -> Convert to [sec]
    
    var a = timestr.split("T");
    var r0 = parseInt(a[0],10) * 24 * 60 * 60;
    var b = a[1].split(":");
    var r1 = parseInt(b[0],10) * 60 * 60;
    var r2 = parseInt(b[1],10) * 60;
    var r3 = parseInt(b[2],10) * 1;
    return (r0 + r1 + r2 + r3);
}
function ghCalcPointData(id,timetable) {
    var length = timetable.length
    var starttime = ghCalcPointTime( timetable[0] );
    var startstation = timetable[1];
    var startdis = -1;
    var endtime = ghCalcPointTime( timetable[length-3] );
    var endstation = timetable[length-2];
    var enddis = 999999;
    var stopped = 1;
    for ( var y=0;y<GH_TABLE[id].rows;y++) {
        var cellstation = GH_TABLE[id].sheet.getValueFromCoords(1,y);
        if ( startstation == cellstation ) {
            startdis = GH_TABLE[id].sheet.getValueFromCoords(0,y);
        }
        if ( endstation == cellstation ) {
            enddis = GH_TABLE[id].sheet.getValueFromCoords(0,y);
        }
	if ( startdis > -1 && enddis == 999999 ) {
	    stopped++;
	}
    }
    // average velocity 
    var vel = ( enddis - startdis ) / ( endtime - starttime - ( stopped * 60) ) ; // [Km/sec]
    //  For adjustment 
//    vel = vel * 0.8;  //  1.2 - 1.5 ??
    // calc puseudo time at 0[km] point
    var r = starttime - parseInt(startdis / vel,10);
    return  r;
}
function ghGetUnitIndexFromTrainID(trainid) {
    var len = GH_DATA.units.length;
    for ( var i=0;i<len;i++) {
	if ( trainid == GH_DATA.units[i].trainid ) {
	    return i;
	}
    }
    return -1;
}


//var arr = [[6,2], [3,9], [1,7], [4,0], [8,5]]
//array.sort(function(a,b){return(a[0] - b[0]);});
//=> [1, 7],[3, 9],[4, 0],[6, 2],[8, 5]

function ghGetSameRowIndex(current,check) {
    for ( var i=0,len=current.length; i < len; i++ ) {
	if ( current[i] != "" && check[i] != "" ) {
	    return i
	}
    }
    return -1;
};

function __time_compare(a, b) {
  // https://www.webprofessional.jp/sort-an-array-of-objects-in-javascript/
  var comparison = 0;
  if (a.pointtime > b.pointtime) {
    comparison = 1;
  } else if (a.pointtime < b.pointtime) {
    comparison = -1;
  }
  return comparison;
}
function ghInsertUnitSortData(id) {

    var unitlen = GH_DATA.units.length;
    var ret = [];
    for ( var i=0;i<unitlen;i++) {
        if ( GH_DATA.units[i].way == id ) {
	    //console.log( GH_DATA.units[i].trainid );
            var odat = {
                "trainid" : GH_DATA.units[i].trainid,
                "pointtime" : ghCalcPointData(id,GH_DATA.units[i].timetable),
                "timetable" : ghCreateColData(id,GH_DATA.units[i].timetable)
            };
            ret.push(odat);
        }
    }
    
    //
    //  Sort
    //
    //
    ret.sort(__time_compare);
    
    for ( var j=0,jlen=ret.length; j < jlen; j++ ) {
	GH_TABLE[id].sheet.insertColumn( ret[j].timetable );
	GH_TABLE[id].sheet.setHeader(GH_TABLE[id].cols,ret[j].trainid);
	GH_TABLE[id].cols++;
    }

    //  Insert Station Colmuns
    if ( GH_TABLE_PROP.stationstep > 0 )  {
	var st = GH_TABLE[id].sheet.getColumnData(1); // station columns
	var count = 0;
	for ( var x=2;x<GH_TABLE[id].cols;x++) {
	    count ++;
	    if ( count == GH_TABLE_PROP.stationstep ) {
		GH_TABLE[id].sheet.insertColumn( st, x, true );
		GH_TABLE[id].sheet.setHeader(x,GH_TABLE_PROP.stationstring);
		GH_TABLE[id].cols++;
		count = 0;
	    }
	}


	for ( var x=2;x<GH_TABLE[id].cols;x++) {
	    var title = GH_TABLE[id].sheet.getHeader(x);
	    if ( title == GH_TABLE_PROP.stationstring ) {
		for ( var y=0;y<GH_TABLE[id].rows;y++) {
		    if ( y == 0 || y == GH_TABLE[id].rows-1 ) {
			// NOP
		    } else {
			if ( y % 2 ) {
			    // NOP
			} else {
			    var cell = "" + COLNAME[x] + y;
			    GH_TABLE[id].sheet.setMerge(cell,1,2);
			}
		    }
		    
		}
		GH_TABLE[id].sheet.setWidth(x,GH_TABLE_PROP.stationwidth);
	    }
	}
    }
    if ( id == 0 ) {
        GH_BLINK[id].ontimer = setTimeout(ghBlinkOn0,GH_BLINK[id].interval);
    } else {
        GH_BLINK[id].ontimer = setTimeout(ghBlinkOn1,GH_BLINK[id].interval);
    }
    GH_TABLE[id].status = 1;
}


function ghCalcBetweenTimeRatio(start,stop,current) {
    var stop_hm = parseInt(stop.substr(0,2),10) * 60 + parseInt(stop.substr(2,2),10);
    var start_hm = parseInt(start.substr(0,2),10) * 60 + parseInt(start.substr(2,2),10);
    var current_hm = parseInt(current.substr(0,2),10) * 60 + parseInt(current.substr(2,2),10);
    var ratio = ( current_hm - start_hm ) / ( stop_hm - start_hm );
    return ratio;
}
//   Important!
// 
//  cell index ( start to 0 ) to Excel Cell name ID ( start to 1 )
//
function ghUpdateBlinkCells(id) {
    GH_BLINK[id].cells = [];
    if ( GH_TABLE[id].status < 1 ) return; // Yet No Table;
    
    for ( var x=2;x<GH_TABLE[id].cols;x++) {
	var starty = -1;
	var stopy = 100000;
	var starttime = "";
	var stoptime = "";
	var title = GH_TABLE[id].sheet.getHeader(x);
	
	if ( title == GH_TABLE_PROP.stationstring ) {

	    // NOP

	} else {
	    
	    // First search ( start and stop point )
	    for ( var y=0;y<GH_TABLE[id].rows;y++) {
		var val = GH_TABLE[id].sheet.getValueFromCoords(x,y);
		if ( val == null || val.length < 1 ) {
		    // NOP
		} else {
		    if ( parseInt(val,10) > parseInt(GH_BLINK[id].time,10) ) {
			if ( y < stopy ) {
			    stopy = y;
			    stoptime = val;
			}
		    }
		    if ( parseInt(val,10) <= parseInt(GH_BLINK[id].time,10) ) {
			if ( y > starty ) {
			    starty = y;
			    starttime = val;
			}
		    }
		}
	    }
	    // Second Search ( between stations )
	    var idx = -1;
	    if ( starty < 0 ) {
		// NOP
		// Not start train
	    } else {
		if ( stopy - starty == 1 ) {
		    idx = "" + stopy;
		    var cellname = "" + COLNAME[x] + idx;
		    GH_BLINK[id].cells.push(cellname);
		} else {
		    // Calc between position
		    var startidx = starty ;
		    if ( starty % 2 == 0 ) startidx = startidx - 1;
		    var stopidx = stopy ;
		    if ( stopy % 2 == 0 ) stopidx = stopidx - 1;
		    var d0 = GH_TABLE[id].sheet.getValueFromCoords(0,startidx); // distance
		    var d1 = GH_TABLE[id].sheet.getValueFromCoords(0,stopidx); // distance
		    var betweenratio = ghCalcBetweenTimeRatio(starttime,stoptime,GH_BLINK[id].time);
		    var position = d0 + betweenratio * ( d1 - d0 );

		    // Search suitable station 
		    for ( var j=startidx;j<stopidx;j=j+2) {
			var d2 = GH_TABLE[id].sheet.getValueFromCoords(0,j);
			if ( d2 > position ) {
			    break;
			}
		    }
		    
		    idx = "" + j;
		    var cellname = "" + COLNAME[x] + idx;
		    GH_BLINK[id].cells.push(cellname);
		}
	    }
	}
    }

}
function ghBlinkOn(id) {
    for ( var i=0;i<GH_BLINK[id].cells.length;i++) {
	GH_TABLE[id].sheet.setStyle(GH_BLINK[id].cells[i],'border-bottom',GH_BLINK_PROP.onstyle);
    }
    if ( id == 0 ) {
        GH_BLINK[id].offtimer = setTimeout(ghBlinkOff0,GH_BLINK[id].interval);
    } else {
        GH_BLINK[id].offtimer = setTimeout(ghBlinkOff1,GH_BLINK[id].interval);
    }
}
function ghBlinkOn0() {
    ghBlinkOn(0);
}
function ghBlinkOn1() {
    ghBlinkOn(1);
}
function ghBlinkOff(id) {
    for ( var i=0;i<GH_BLINK[id].cells.length;i++) {
	GH_TABLE[id].sheet.setStyle(GH_BLINK[id].cells[i],'border-bottom',GH_BLINK_PROP.offstyle);
    }
    if ( GH_BLINK[id].updatecount > GH_BLINK[id].updatemax ) {
	ghUpdateBlinkCells(id);
	GH_BLINK[id].updatecount = 0;
    } else {
	GH_BLINK[id].updatecount++;
    }
    if ( id == 0 ) {    
        GH_BLINK[id].ontimer = setTimeout(ghBlinkOn0,GH_BLINK[id].interval);
    } else {
        GH_BLINK[id].ontimer = setTimeout(ghBlinkOn1,GH_BLINK[id].interval);
    }
}
function ghBlinkOff0() {
    ghBlinkOff(0);
}
function ghBlinkOff1() {
    ghBlinkOff(1);
}
function ghCreateNewTable(id) {

    var station = GH_DATA.way[id].station;
    var stlen = station.length / 2;
    GH_TABLE[id].data = [];
    GH_TABLE[id].rows = 2 + (stlen - 2) * 2;
    GH_TABLE[id].cols = 2;
    for ( var i=0,ilen=station.length;i<ilen;i=i+2) {
	if ( i == 0 || i == ilen-2 ) {
	    GH_TABLE[id].data.push( [ parseInt(station[i+1],10), station[i] ] );
	} else {
	    GH_TABLE[id].data.push( [ parseInt(station[i+1],10), station[i] ] );
	    GH_TABLE[id].data.push( [ parseInt(station[i+1],10), station[i] ] );
	}
    }
    GH_TABLE[id].sheet.setData(GH_TABLE[id].data);
    
    for ( var i=0;i<GH_TABLE[id].rows;i++) {
        if ( i == 0 || i == GH_TABLE[id].rows-1 ) {
            // NOP
        } else {
            if ( i % 2 ) {
                // NOP
            } else {
                GH_TABLE[id].sheet.setMerge("A" + i,1,2);
                GH_TABLE[id].sheet.setMerge("B" + i,1,2);
            }
        }

    }
    GH_TABLE[id].status = 0;
    
    if ( id == 0 ) {
        ghDrawDiagramAxis(id);
    }
}

function ghSelectStation(name) {
    for( var id = 0;id<GH_TABLE.length;id++ ) {
        if ( GH_TABLE[id].status > 0 ) {
            var selectedidx = -1;
            for ( var y=0;y<GH_TABLE[id].rows;y++) {
                var cellstation = GH_TABLE[id].sheet.getValueFromCoords(1,y);
                if ( cellstation == name ) {
                    selectedidx = y;
                    break;
                }
            }
            if ( selectedidx > -1 ) {
                GH_TABLE[id].sheet.updateSelectionFromCoords(0, selectedidx, GH_TABLE[id].cols-1, selectedidx);
            } else {
                GH_TABLE[id].sheet.resetSelection(false);
            }
        }
    }
    
};

function ghSelectUnit(name) {
    //console.log(name);
    // Unit name 
    // lineid _ trainid
    // 1330ICN_2012
    // 1330ICN_1521
    //
    for( var id = 0;id<GH_TABLE.length;id++ ) {
        if ( GH_TABLE[id].status > 0 ) {
            var selectedidx = -1;
            var a = name.split("_");
            var title = a[a.length-1];

            for ( var x=2;x<GH_TABLE[id].cols;x++) {
                var data = GH_TABLE[id].sheet.getHeader(x);
                if ( data == title ) {
                    selectedidx = x;
                    break;
                }
            }
            if ( selectedidx > -1 ) {
                GH_TABLE[id].sheet.updateSelectionFromCoords(selectedidx, 0, selectedidx, GH_TABLE[id].rows-1);
            } else {
                GH_TABLE[id].sheet.resetSelection(false);
            }
        }
    }

};

function ghWaitNewTableCreated(){
    var num = 1;
    // initialize GH_TABLE[j].status    = -1
    // station setup GH_TABLE[j].status = 0
    // data inserted GH_TABLE[j].status = 1
    
    for( var j = 0;j<GH_TABLE.length;j++ ) {
        if ( GH_TABLE[j].status == 0 ) {
            ghInsertUnitSortData(j);
            ghDrawDiagramChart(j);
	    ghShowLoader(false);
        }
	num = num * GH_TABLE[j].status;
    }
    if ( num < 1 ) setTimeout(ghWaitNewTableCreated, 1234);

}


/////////////////////////////
//
//  Broadcast Channel Function
//

function ghBroadcastSecondaryReceiveMessage(data) {
    if (data.type == 'INITCONNECTION_ACK') {
        if ( GH_BROADCAST.selfID < 0 ) {
            GH_BROADCAST.selfID = data.value.yourid;

            GH_DATA.lineid = data.value.lineid; // GH_FIELD_PROP.timetable.lineid, 10ES

            GH_DATA.name = data.value.name;  // GH_FIELD.name 
            GH_DATA.way = data.value.way;
            GH_URILIST = data.value.urilist;
        
            $('#gh_lineinformation').html(GH_DATA.name);
            $('#gh_displaylines').html(data.value.description);
            $('#gh_displaydirection_0').html(GH_DATA.way[0].direction);
            $('#gh_displaydirection_1').html(GH_DATA.way[1].direction);

            ghCreateNewTable(0);
            ghCreateNewTable(1);
            ghBroadcastSendRequestUnits(GH_DATA.lineid);
        }
    } else if (data.type == 'GETUNITS_ACK') {
	GH_MARKER = data.value.marker;
	GH_LOCOMOTIVE = data.value.locomotive;
	GH_UNITS = data.value.units;
	ghShowLoader(true);

	for( var i = 0,ilen=GH_UNITS.length;i<ilen;i++ ) {
	    // use Same line data
	    if ( GH_UNITS[i].lineid == GH_DATA.lineid ) {
		GH_DATA.units.push( GH_UNITS[i] );
	    } else {
                // Other line SKIP
	    }
	}
        ghWaitNewTableCreated();
    } else if (data.type == 'PICKSTATION') {
	ghSelectStation(data.value);
    } else if (data.type == 'PICKTRAIN') {
	ghSelectUnit(data.value);
    } else if (data.type == 'CURRENTTIME') {
	//  10:55:32 
	var t = data.value.time;
	var tt = t.split(":");
        $('#gh_displayclock').html(tt[0] + ":" + tt[1]);
        for( var j = 0;j<GH_BLINK.length;j++ ) {
            GH_BLINK[j].time = "" + tt[0] + tt[1];
            //GH_BLINK[j].speed = parseFloat(data.value.speed);
            GH_BLINK[j].updatecount = GH_BLINK[j].updatemax + 100; // Force Update
        }
        ghDrawDiagramCurrenttime(t);
        
        
    } else {
        // Not Implemented
    }
};

//
//  Broadcast Channel Function
//
/////////////////////////////

function ghShowLoader(flag) {
    if ( flag ) {
    	$('#gh_loader').addClass('active');
    } else {
    	$('#gh_loader').removeClass('active');
    }
}


function ghSettingModalOK() {

    return;
}    

//////////////////////////////
//
//  Excel
//
var margin = {top: 32, right: 40, bottom: 240, left: 40},
    width = $(window).width() - margin.left - margin.right,
    height = ( $(window).width() * 0.75 ) - margin.top - margin.bottom;

var TABLE_W = parseInt(width,10) + "px";
var TABLE_H = parseInt(height,10) + "px";

var GH_SHEET_OPTIONS_SIMPLE = {
    colHeaders: ['Km',GH_TABLE_PROP.stationstring],
    colWidths: [ 50, GH_TABLE_PROP.stationwidth],
    columns: [
	{ type: 'numeric', readOnly:true },
        { type: 'text', readOnly:true  }
    ],
    minDimensions:[0,0],
    tableOverflow:true,
    tableWidth: TABLE_W,
    tableHeight: TABLE_H,
    freezeColumns: 2,
    columnSorting:false,
    onchange: _ghOnchangeValue,
    onselection: _ghOnselectBuffer,
    allowInsertRow : false,
    allowManualInsertRow : false,
    allowDeleteRow : false,
    allowInsertColumn : true,
    allowDeleteColumn : false,
    updateTable:function(instance, cell, col, row, val, label, cellName) {
        // Odd row colours
        if (row % 2) {
	    //cell.style.backgroundColor = '#b0bec5'; blue-grey lighten-3
	    cell.style.backgroundColor = '#eceff1';
        } else {
	    // default
	}
    },
    contextMenu: function(obj, x, y, e) {
        var items = [];
        if (y == null && x > 1 ) {    
            // Rename column
            if (obj.options.allowRenameColumn == true) {
		if ( obj.getHeader(x) != GH_TABLE_PROP.stationstring ) {
                    items.push({
			title:obj.options.text.renameThisColumn,
			onclick:function() {
			    ghOnclickRenameColumn(x);
			}
                    });
		}
            }
            // Set Marker
	    if ( obj.getHeader(x) != GH_TABLE_PROP.stationstring ) {
                items.push({
		    title:"Set Marker",
		    onclick:function() {
			$('#gh_marker_trainid').val( obj.getHeader(x) );
			if ( $('#gh_marker_content').html() == "" ) {
			    ghMarkerPage(1);
			} else {
			    $("input[name='trainmarker']").each(function(index,elem) {
				$(this).prop("checked",false);
			    });
			};
			$('#gh_trainmarkermodal').modal('open');
		    }
                });
            }

            // Set Model
	    if ( obj.getHeader(x) != GH_TABLE_PROP.stationstring ) {
                items.push({
		    title:"Set Model",
		    onclick:function() {
			$('#gh_model_trainid').val( obj.getHeader(x) );
			var tid = ghGetUnitIndexFromTrainID( obj.getHeader(x) );
			if ( tid < 0 ) {
			    var loco = "default";
			} else {
			    var loco = GH_DATA.units[tid].locomotive;
			}
			$("input[name='train3dmodel']").each(function(index,elem) {
			    if ( $(this).val() == loco ) {
				$(this).prop("checked",true);
			    } else {
				$(this).prop("checked",false);
			    }
			});
			$('#gh_trainmodelmodal').modal('open');
		    }
                });
            }

        }       
        return items;
    }
}

///////////////////////////////////////////////////
function ghOnclickTimeDownload(id) {
    GH_TABLE[id].sheet.download();
}
function ghCreateDefaultUnitData(id,data,col) {
    
    
}
function ghOnclickUnitUpdate() {
    var ret = [];
    for ( var id=0;id<2;id++) {
        for ( var x=2;x<GH_TABLE[id].cols;x++) {
            var title = GH_TABLE[id].sheet.getHeader(x);
            if ( title == GH_TABLE_PROP.stationstring ) {
                // NOP
            } else {
                var aryidx = ghGetUnitIndexFromTrainID(title);
                GH_DATA.units[aryidx].timetable = ghCreateTimetableArray(id,x);
            }
	}
    }
    for ( var id=0;id<2;id++) {
        ghUpdateDiagramChart(id) ;
    }

    var data = { "name" : GH_DATA.name, "lineid" : GH_DATA.lineid, "way" : GH_DATA.way , "units": GH_DATA.units }; 
    ghBroadcastSendUpdateUnits(data);
}

function ghMarkerPage(n) {
    var currentid = -1;
    var currentindex = -1;
    // 0 <= index <= 13
    $("[name=markerpage]").each(function(index,elem) {
	if ( $(elem).attr("class") == "active" ) {
	    currentid = $(elem).attr("id");
	    currentindex = index;
	}
    });

    if ( n < -100 && currentindex == 1 ) {
	return; // NOP
    }
    if ( n > 100 && currentindex == 12 ) {
	return; // NOP
    }

    if ( n < -100 && currentindex > 1 ) {
	n = currentindex - 1;
    }
    if ( n > 100 && currentindex < 12 ) {
	n = currentindex + 1;
    }
    var nextindex = n;
    
    var uri = ghGetResourceUri( "marker/markerlist" + n + ".json" );
    $('#gh_marker_content').html("");
    $.ajax({
	dataType: "json",
	url: uri
    }).done(function(data) {

	var list = data.uri;
	var tid = ghGetUnitIndexFromTrainID( $('#gh_marker_trainid').val() );
	if ( tid < 0 ) {
	    var marker = "default";
	} else {
	    var marker = GH_DATA.units[tid].marker;
	}
	if ( marker == "default" ) {
	    var html = "<label><input name=\"trainmarker\" type=\"radio\" value=\"default\" checked /><span>default</label>";
	} else {
	    var html = "<label><input name=\"trainmarker\" type=\"radio\" value=\"default\" /><span>default</label>";
	}
	for ( var i=0,ilen=list.length;i<ilen;i++) {
	    var value = "marker/" + list[i] ;
	    var srcuri = ghGetResourceUri( "marker/" + list[i] );
	    if ( value == marker ) {
		html += "<label><input name=\"trainmarker\" type=\"radio\" value=\"" + value + "\" checked /><span><img src=\"" + srcuri  + "\"></span></label>";
	    } else {
		html += "<label><input name=\"trainmarker\" type=\"radio\" value=\"" + value + "\" /><span><img src=\"" + srcuri  + "\"></span></label>";
	    }
	}
	$('#gh_marker_content').html(html);
    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
	var msg = "marker list Cannot load " + type + " " + id + " " + file + "  ";
	msg += " XMLHttpRequest " + XMLHttpRequest.status ;
	msg += " textStatus " + textStatus ;
	console.log( msg );
	alert(GH_ERROR_MSG['markerlistcannotload']);
    });

    $("[name=markerpage]").each(function(index,elem) {
	if ( index == nextindex ) {
	    $(elem).attr("class","active");
	} else {
	    $(elem).attr("class","waves-effect");
	}
    });

    if ( nextindex == 1 ) $("#marker_page_prev").attr("class","disabled");
    if ( nextindex == 12 ) $("#marker_page_next").attr("class","disabled");

}

$(document).ready(function(){

    //  Materialize Initialize
    //var d = $(".dropdown-trigger").dropdown();
    
    $('#gh_settingmodal').modal();
    $('#gh_trainidmodal').modal();
    $('#gh_trainmarkermodal').modal();
    $('#gh_trainmodelmodal').modal();
    $('#gh_deletetrainconfirmmodal').modal();

    GH_TABS = $('.tabs').tabs({
	onShow : ghSelectCurrentTab
    });
    
    $('#gh_aboutmodal').modal();

    $( '#gh_updatebutton' ).click(function() {
	ghOnclickUnitUpdate();
    });
    
    GH_TABLE[0].sheet = $('#spreadsheet_0').jspreadsheet(GH_SHEET_OPTIONS_SIMPLE);
    GH_TABLE[1].sheet = $('#spreadsheet_1').jspreadsheet(GH_SHEET_OPTIONS_SIMPLE);
    
    ghInitializeDiagram();
    
    ghBroadcastSendInitConnection();

    ghSetAboutContent();

});

////////////////////////////////

if(window.BroadcastChannel){
    ghBroadcastSetup('secondary',ghBroadcastSecondaryReceiveMessage);
    //ghBroadcastSetup();
} else {
    console.log("Broadcast Channel Not Supported. \nThis application does not work your browser.");
    alert(GH_ERROR_MSG['broadcastnotsupport']);
}


////////////////////////////////////////
//
//   Avoid reload
//

// Called Modal Close
history.pushState(null, null, null);
//$(window).on("popstate", function (event) {
//  if (!event.originalEvent.state) {
//      //alert('popstate Attension re-load button, if wrong operation?');
//    history.pushState(null, null, null);
//    return;
//  }
//});

function ghSetAboutContent() {
    var data = "";
    data += GH_REV + '<BR>';
    data += '<BR>';
    data += window.navigator.userAgent + '<BR>';
    data += 'Plathome:' + navigator.platform + '<BR>';
    data += ' ' + jexcel.version().print() + '<BR>';
    data += 'jQuery :' + jQuery.fn.jquery + '<BR>';     
    $('#gh_aboutcontent').html(data);
};

window.addEventListener('beforeunload', function(e) {
    ghBroadcastClose();
    e.returnValue = 'Attension unload button';
}, false);

