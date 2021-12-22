//
//   geomaptime.html
//     |- ghGeoMapTime.js
//
//   Divert from ghRailTime.js
//
//    //
//    https://bossanova.uk/jexcel/v4/examples/tabs
//    //
var GH_DATA = null; // from master ghGeoMap.js
var GH_REV = '5.1';

var GH_TABLE = {}
var GH_CURRENT_TABLE_KEY = "";
//var GH_TABLE = {
//    sheet : null,
//    rows : 0,
//    cols : 0,
//    stationstep : 16,
//    stationstring : "Station",
//    stationwidth : 100,
//    data : [],
//    vorbeigehenidx : []
//}
var GH_TABLE_PROP = {
    stationstring : "Station",
    stationwidth : 100
}

// vorbeigehenidx start from 1,  same cell-name A1,A2...
// vorbeigehenidx[ 0 ] = start from 1 , integer
// vorbeigehenidx[ 1 ] = start from 1, integer ...

var COLNAME = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','AA','AB','AC','AD','AE','AF','AG','AH','AI','AJ','AK','AL','AM','AN','AO','AP','AQ','AR','AS','AT','AU','AV','AW','AX','AY','AZ','BA','BB','BC','BD','BE','BF','BG','BH','BI','BJ','BK','BL','BM','BN','BO','BP','BQ','BR','BS','BT','BU','BV','BW','BX','BY','BZ','CA','CB','CC','CD','CE','CF','CG','CH','CI','CJ','CK','CL','CM','CN','CO','CP','CQ','CR','CS','CT','CU','CV','CW','CX','CY','CZ','DA','DB','DC','DD','DE','DF','DG','DH','DI','DJ','DK','DL','DM','DN','DO','DP','DQ','DR','DS','DT','DU','DV','DW','DX','DY','DZ','EA','EB','EC','ED','EE','EF','EG','EH','EI','EJ','EK','EL','EM','EN','EO','EP','EQ','ER','ES','ET','EU','EV','EW','EX','EY','EZ','FA','FB','FC','FD','FE','FF','FG','FH','FI','FJ','FK','FL','FM','FN','FO','FP','FQ','FR','FS','FT','FU','FV','FW','FX','FY','FZ','GA','GB','GC','GD','GE','GF','GG','GH','GI','GJ','GK','GL','GM','GN','GO','GP','GQ','GR','GS','GT','GU','GV','GW','GX','GY','GZ'];


// Unit station data type
var GH_TYPE_ARRIVAL = 2;
var GH_TYPE_DEPATURE = 4;
var GH_TYPE_THROUGH = 7;


var GH_MSG_WS_NOT_VALID =  'Whitespace is not allowed !<BR>Not a valid  Train ID';
var GH_MSG_SAME_ID =  'Same ID already exist. !<BR>Please change other ID';
var GH_MSG_NOT_EDIT_COL =  'Can not edit this column !';
var GH_MSG_WRONG_TIME =  'Wrong time data !';
var GH_MSG_PREV_INCORRECT = 'The elapsed time from the previous stop is incorrect !';
var GH_MSG_NEXT_INCORRECT = 'The elapsed time from the next stop is incorrect !';
var GH_MSG_WRONG_COL = 'Select right column !';


//////////////////////////////
//
//  Excel
//
var margin = {top: 32, right: 40, bottom: 240, left: 40},
    width = $(window).width() - margin.left - margin.right,
    height = ( $(window).width() * 0.75 ) - margin.top - margin.bottom;

var TABLE_W = parseInt(width,10) + "px";
var TABLE_H = parseInt(height,10) + "px";

var GH_TABLE_OPTIONS = {
    colHeaders: [GH_TABLE_PROP.stationstring],
    colWidths: [GH_TABLE_PROP.stationwidth],
    columns: [
        { type: 'text', readOnly:true  }
    ],
    minDimensions:[0,0],
    tableOverflow:true,
    tableWidth: TABLE_W,
    tableHeight: TABLE_H,
    freezeColumns: 1,
    columnSorting:false,
    onchange: _ghOnchangeValue,
    onselection: _ghOnselectBuffer,
    allowInsertRow : false,
    allowManualInsertRow : false,
    allowDeleteRow : false,
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
 
        if (y == null && x > -1 ) {
            // Insert a new column
            if (obj.options.allowInsertColumn == true && x > 0 ) {
                items.push({
                    title:obj.options.text.insertANewColumnBefore,
                    onclick:function() {
                        obj.insertColumn(1, parseInt(x), 1);
			__ghAddCols();
                    }
                });
            }
            if (obj.options.allowInsertColumn == true) {
                items.push({
                    title:obj.options.text.insertANewColumnAfter,
                    onclick:function() {
                        obj.insertColumn(1, parseInt(x), 0);
			__ghAddCols();
                    }
                });
            }
            // Delete a column
            if (obj.options.allowDeleteColumn == true) {
		if ( obj.getHeader(x) != GH_TABLE_PROP.stationstring ) {
                    items.push({
			title:obj.options.text.deleteSelectedColumns,
			onclick:function() {
                            var title = obj.getHeader(x);
                            $('#gh_deletetrain').html( title );
                            $('#gh_deletetraincolumn').val( x );
                            $('#gh_deletetrainconfirmmodal').modal('open');                                 
                            
			}
                    });
		}
            }
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
	    // Line
            items.push({ type:'line' });
    
            // Copy
            items.push({
                title:obj.options.text.copy,
                shortcut:'Ctrl + C',
                onclick:function() {
                    obj.copy(true);
                }
            });
    
            // Paste
            if (navigator && navigator.clipboard) {
                items.push({
                    title:obj.options.text.paste,
                    shortcut:'Ctrl + V',
                    onclick:function() {
                        if (obj.selectedCell) {
                            navigator.clipboard.readText().then(function(text) {
                                if (text) {
                                    jexcel.current.paste(obj.selectedCell[0], obj.selectedCell[1], text);
                                }
                            });
                        }
                    }
                });
            }
    
            items.push({ type:'line' });

	    if ( obj.getHeader(x) != GH_TABLE_PROP.stationstring ) {
                var v = $("#gh_unitcalcminutes").val();
                var txt = "Add " + v + " minutes";
                items.push({
		    title:txt,
		    onclick:function() {
			ghOnclickAddTime(x,parseInt(v,10));
		    }
                });
            }
	    if ( obj.getHeader(x) != GH_TABLE_PROP.stationstring ) {
                var v = $("#gh_unitcalcminutes").val();
                var txt = "Subtract " + v + " minutes";
                items.push({
		    title:txt,
		    onclick:function() {
			ghOnclickSubtractTime(x,parseInt(v,10));
		    }
                });
            }
        }
        return items;
    }

}

var GH_TABLE_OPTIONS_SIMPLE = {
    colHeaders: [GH_TABLE_PROP.stationstring],
    colWidths: [GH_TABLE_PROP.stationwidth],
    columns: [
        { type: 'text', readOnly:true  }
    ],
    minDimensions:[0,0],
    tableOverflow:true,
    tableWidth: TABLE_W,
    tableHeight: TABLE_H,
    freezeColumns: 1,
    columnSorting:false,
    onchange: _ghOnchangeValue,
    onselection: _ghOnselectBuffer,
    allowInsertRow : false,
    allowManualInsertRow : false,
    allowDeleteRow : false,
    updateTable:function(instance, cell, col, row, val, label, cellName) {
        // Odd row colours
        if (row % 2) {
	    //cell.style.backgroundColor = '#b0bec5'; blue-grey lighten-3
	    cell.style.backgroundColor = '#eceff1';
        } else {
	    // default
	}
    }
}
var GH_TABLE_OPTIONS_YET = {
    colHeaders: [GH_TABLE_PROP.stationstring],
    colWidths: [GH_TABLE_PROP.stationwidth],
    columns: [
        { type: 'text', readOnly:true  }
    ],
    minDimensions:[0,0],
    tableOverflow:true,
    tableWidth: TABLE_W,
    tableHeight: TABLE_H,
    freezeColumns: 1,
    columnSorting:false,
    onchange: _ghOnchangeValue,
    onselection: _ghOnselectBuffer,
    allowInsertRow : false,
    allowManualInsertRow : false,
    allowDeleteRow : false,
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
 
        if (y == null && x > -1 ) {
            // Insert a new column
            if (obj.options.allowInsertColumn == true && x > 0 ) {
                items.push({
                    title:obj.options.text.insertANewColumnBefore,
                    onclick:function() {
                        obj.insertColumn(1, parseInt(x), 1);
			GH_TABLE.cols++;
                    }
                });
            }
            if (obj.options.allowInsertColumn == true) {
                items.push({
                    title:obj.options.text.insertANewColumnAfter,
                    onclick:function() {
                        obj.insertColumn(1, parseInt(x), 0);
			GH_TABLE.cols++;
                    }
                });
            }
            // Delete a column
            if (obj.options.allowDeleteColumn == true) {
		if ( obj.getHeader(x) != GH_TABLE_PROP.stationstring ) {
                    items.push({
			title:obj.options.text.deleteSelectedColumns,
			onclick:function() {
			    //var title = obj.getHeader(x);
                            //obj.deleteColumn(obj.getSelectedColumns().length ? undefined : parseInt(x));
			    //var id = ghGetUnitIndexFromTrainID(title);
			    //GH_DATA.units.splice(id,1);
			    //GH_TABLE.cols--;
                            
                            var title = obj.getHeader(x);
                            $('#gh_deletetrain').html( title );
                            $('#gh_deletetraincolumn').val( x );
                            $('#gh_deletetrainconfirmmodal').modal('open');                                 
                            
			}
                    });
		}
            }
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
	    // Line
            items.push({ type:'line' });
    
            // Copy
            items.push({
                title:obj.options.text.copy,
                shortcut:'Ctrl + C',
                onclick:function() {
                    obj.copy(true);
                }
            });
    
            // Paste
            if (navigator && navigator.clipboard) {
                items.push({
                    title:obj.options.text.paste,
                    shortcut:'Ctrl + V',
                    onclick:function() {
                        if (obj.selectedCell) {
                            navigator.clipboard.readText().then(function(text) {
                                if (text) {
                                    jexcel.current.paste(obj.selectedCell[0], obj.selectedCell[1], text);
                                }
                            });
                        }
                    }
                });
            }
    
            // Save
//            if (obj.options.allowExport) {
//                items.push({
//                    title: obj.options.text.saveAs,
//                    shortcut: 'Ctrl + S',
//                    onclick: function () {
//                        obj.download();
//                    }
//                });
//            }
	    // Line
            items.push({ type:'line' });


	    if ( obj.getHeader(x) != GH_TABLE_PROP.stationstring ) {
                var v = $("#gh_unitcalcminutes").val();
                var txt = "Add " + v + " minutes";
                items.push({
		    title:txt,
		    onclick:function() {
			ghOnclickAddTime(x,parseInt(v,10));
		    }
                });
            }
	    if ( obj.getHeader(x) != GH_TABLE_PROP.stationstring ) {
                var v = $("#gh_unitcalcminutes").val();
                var txt = "Subtract " + v + " minutes";
                items.push({
		    title:txt,
		    onclick:function() {
			ghOnclickSubtractTime(x,parseInt(v,10));
		    }
                });
            }


            // Add 5 min column
//	    if ( obj.getHeader(x) != GH_TABLE.stationstring ) {
//                items.push({
//		    title:"Add 5 minutes",
//		    onclick:function() {
//			ghOnclickAddTime(x,5);
//		    }
//                });
//            }
            // Add 12 min column
//	    if ( obj.getHeader(x) != GH_TABLE.stationstring ) {
//                items.push({
//		    title:"Add 12 minutes",
//		    onclick:function() {
//			ghOnclickAddTime(x,12);
//		    }
//                });
//            }
            // Add 60 min column
//	    if ( obj.getHeader(x) != GH_TABLE.stationstring ) {
//                items.push({
//		    title:"Add 60 minutes",
//		    onclick:function() {
//			ghOnclickAddTime(x,60);
//		    }
//                });
//            }

            // Subtract 5 min column
//	    if ( obj.getHeader(x) != GH_TABLE.stationstring ) {
//                items.push({
//		    title:"Subtract 5 minutes",
//		    onclick:function() {
//			ghOnclickAddTime(x,-5);
//		    }
//                });
//            }
            // Subtract 12 min column
//	    if ( obj.getHeader(x) != GH_TABLE.stationstring ) {
//                items.push({
//		    title:"Subtract 12 minutes",
//		    onclick:function() {
//			ghOnclickAddTime(x,-12);
//		    }
//                });
//            }
            // Subtract 60 min column
//	    if ( obj.getHeader(x) != GH_TABLE.stationstring ) {
//                items.push({
//		    title:"Subtract 60 minutes",
//		    onclick:function() {
//			ghOnclickAddTime(x,-60);
//		    }
//                });
//            }

	    // Line
//            items.push({ type:'line' });

//            items.push({
//                title: 'convert units data',
//                onclick: function () {
//                    ghConvertUnitsData();
//                }
//            });

        }
        return items;
    }
}
	    
//            items.push({
//                title: "Timetable Update",
//                onclick: function () {
//                    ghOnclickTimeUpdate();
//                }
//            });
 	    

///////////////////////////////////////////////////
function ghBaseName(str) {
   var base = new String(str).substring(str.lastIndexOf('/') + 1); 
    if(base.lastIndexOf(".") != -1)       
        base = base.substring(0, base.lastIndexOf("."));
   return base;
}

function ghDeleteTrainColumnModalOK() {
    var x = $('#gh_deletetraincolumn').val();
    var title = GH_TABLE[GH_CURRENT_TABLE_KEY].sheet.getHeader(x);
    GH_TABLE[GH_CURRENT_TABLE_KEY].sheet.deleteColumn(parseInt(x,10));            
    GH_TABLE[GH_CURRENT_TABLE_KEY].cols--;
}

function ghCheckTimeFormat(data) {

    if( isNaN(data) ) return false;

    var len = data.length;
    if ( len > 6 ) return false;

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
    } else if ( len == 4 ) {
	// HHMM -> HHMM
	str = "" + data;
    } else if ( len == 5 ) {
	// HHMMS -> HHMM0S
	//var a = data.substr(0,4);
	//var b = data.substr(4,1);	
	//str = "" + a + "0" + b;

	// HMMSS -> HHMMSS
	str = "0" + data;
    } else {
	// HHMMSS -> HHMMSS
	str = "" + data;
    }

    var h = parseInt(str.substr(0,2),10);
    var m = parseInt(str.substr(2,2),10);
    var s = parseInt(str.substr(4,2),10);

    if ( h < 0 || h > 23 ) return false;
    if ( m < 0 || m > 59 ) return false;
    if ( s < 0 || s > 59 ) return false;

    return true;
    
};
function ghCheckTimeFormat4DIGIT(data) {

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
    var sec = "";
    if ( len == 1 ) {
	// M -> 000M
	ret = "000" + str;
    } else if ( len == 2 ) {
	// MM -> 00MM
	ret = "00" + str;
    } else if ( len == 3 ) {
	// HMM -> 0HMM
	ret = "0" + str;
    } else if ( len == 4 ) {
	// HHMM -> HHMM
	ret = str.substr(0,4);
    } else if ( len == 5 ) {
	// HMMSS -> 0HMM
	ret = "0" + str.substr(0,3);
	sec = str.substr(3,2);
    } else {
	// HHMMSS -> HHMM
	ret = str.substr(0,4);
	sec = str.substr(4,2);
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
    if ( sec == "" ) {
	return "" + h + m;
    } else {
	return "" + h + m + sec;
    }

}
function ghAddTimeStr4DIGIT(str,min) {

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
function __ghAddCols() {
    GH_TABLE[GH_CURRENT_TABLE_KEY].cols++;
}
function ghOnclickAddTime(x,minute) {

    var col = GH_TABLE[GH_CURRENT_TABLE_KEY].sheet.getColumnData(x);

    for ( var y=0;y<col.length;y++) {
	if ( col[y] != "" ) {
	    col[y] = ghAddTimeStr(col[y],minute);
	}
    }
    
    // avoid     onchange: _ghOnchangeValue Event
    if ( minute > 0 ) {
	for ( var y=col.length-1;y>-1;y--) {
	    if ( col[y] != "" ) {
		GH_TABLE[GH_CURRENT_TABLE_KEY].sheet.setValueFromCoords(x,y,col[y]);
	    }
	}
    } else {
	for ( var y=0;y<col.length;y++) {
	    if ( col[y] != "" ) {
		GH_TABLE[GH_CURRENT_TABLE_KEY].sheet.setValueFromCoords(x,y,col[y]);
	    }
	}
    }
}
function ghOnclickSubtractTime(x,minute) {
    if ( minute > 0 ) {
        minute = -1 * minute;
    }
    ghOnclickAddTime(x,minute);
}

function ghCheckDuplicateID(title) {
    for ( var key in GH_TABLE ) {
	for ( var x=1;x<GH_TABLE[key].cols;x++) {
	    var t = GH_TABLE[key].sheet.getHeader(x);
	    if ( t == title ) return true;
	}
    }
    return false;
}
function ghRenameTrainIDModalOK(){
    var data = $("#gh_trainid").val();
    var col = $("#gh_trainid_column").val();
    var prevdata = $("#gh_trainid_prev").val();

    if (/\s/.test(data)) {
	M.toast({html: GH_MSG_WS_NOT_VALID})
    } else {
	if ( data != prevdata ) {
	    if ( ghCheckDuplicateID(data) ) {
		M.toast({html: GH_MSG_SAME_ID})
	    } else {
		GH_TABLE[GH_CURRENT_TABLE_KEY].sheet.setHeader(col,data);
	    }
	}
    }
    
}

function ghOnclickRenameColumn(x) {
    var title = GH_TABLE[GH_CURRENT_TABLE_KEY].sheet.getHeader(x);
    if ( title == GH_TABLE_PROP.stationstring ) {
	M.toast({html: GH_MSG_NOT_EDIT_COL})
	return;
    }

    $('#gh_trainid').val(title);
    $('#gh_trainid_prev').val(title);
    $('#gh_trainid_column').val(x);
    $('#gh_trainidmodal').modal('open');

}
function ghGetPreviousTimeData(x,y,key) {
    var ret = null;
    for ( var i=parseInt(y,10)-1;i>-1;i--) {
        var dat = GH_TABLE[key].sheet.getValueFromCoords(x,i);
	if ( dat != "" ) {
	    ret = dat;
	    break;
	}
    }
    return ret;
};
function ghGetNextTimeData(x,y,key) {
    var ret = null;
    for ( var i=parseInt(y,10)+1;i<GH_TABLE.rows;i++) {
        var dat = GH_TABLE[key].sheet.getValueFromCoords(x,i);
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

    if ( x < 1 ) return; // No Check
    if ( value == "" ) return; // No Check
    
    for ( var i=1;i<GH_TABLE[GH_CURRENT_TABLE_KEY].vorbeigehenidx.length;i=i+2) {
        // check pass through point
        var rownum = parseInt(y,10) + 1;
        if ( rownum == GH_TABLE[GH_CURRENT_TABLE_KEY].vorbeigehenidx[i] ) {
            GH_TABLE[GH_CURRENT_TABLE_KEY].sheet.setValueFromCoords(x,y,"");
            M.toast({html: GH_MSG_NOT_EDIT_COL})
            return;
        };
    }
    
    
    var title = GH_TABLE[GH_CURRENT_TABLE_KEY].sheet.getHeader(x);
    if ( title == GH_TABLE_PROP.stationstring ) {
	if ( value != GH_BUFFER.value ) GH_TABLE[GH_CURRENT_TABLE_KEY].sheet.setValueFromCoords(x,y,GH_BUFFER.value);
	M.toast({html: GH_MSG_NOT_EDIT_COL})
	return;
    }

    if ( ! ghCheckTimeFormat(value) ) {
	if ( value != GH_BUFFER.value ) GH_TABLE[GH_CURRENT_TABLE_KEY].sheet.setValueFromCoords(x,y,GH_BUFFER.value);
	//console.log(value);
	M.toast({html: GH_MSG_WRONG_TIME})
	return;
    }

    var prev = ghGetPreviousTimeData(x,y,GH_CURRENT_TABLE_KEY);
    if ( prev == null ) {
	// OK first time
    } else {
	var ret = ghElapsedTimeData(prev,value);
	if ( ret < 0 ) {
	    if ( value != GH_BUFFER.value ) GH_TABLE[GH_CURRENT_TABLE_KEY].sheet.setValueFromCoords(x,y,GH_BUFFER.value);
	    M.toast({html: GH_MSG_PREV_INCORRECT})
	    return;
	} else {
	    // OK
	}
    }

    var next = ghGetNextTimeData(x,y,GH_CURRENT_TABLE_KEY);
    if ( next == null ) {
	// OK last time
    } else {
	var ret = ghElapsedTimeData(value,next);
	if ( ret < 0 ) {
	    if ( value != GH_BUFFER.value ) GH_TABLE[GH_CURRENT_TABLE_KEY].sheet.setValueFromCoords(x,y,GH_BUFFER.value);
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
    GH_BUFFER.x1 = x1;
    GH_BUFFER.y1 = y1;
    GH_BUFFER.x2 = x2;
    GH_BUFFER.y2 = y2;
    if ( x1 == x2 && y1 == y2 ) {
	GH_BUFFER.value = GH_TABLE[GH_CURRENT_TABLE_KEY].sheet.getValueFromCoords(x1,y1);
    } else if ( x1 == x2 && y2 - y1 == 1 ) {
	// Station Columns
	GH_BUFFER.value = GH_TABLE[GH_CURRENT_TABLE_KEY].sheet.getValueFromCoords(x1,y1);
    } else {
	GH_BUFFER.value = "";
    }
}





//////////////////////////////////////////////////////////////////////

/////////////////////////////
//
//  Broadcast Channel Function
//

function ghBroadcastSecondaryReceiveMessage(data) {
    if (data.type == 'INITCONNECTION_ACK') {
        if ( GH_BROADCAST.selfID < 0 ) {
            GH_BROADCAST.selfID = data.value.yourid;
	    ghBroadcastGetLineData();
        } else {
	    // NOP
	}
    } else if (data.type == 'GETLINEDATA_ACK') {
	GH_DATA = data.value;
        console.log(GH_DATA);
	//ghCreateNewTable();
	var b = ghBaseName(GH_DATA.file);
	//var n = b + "_" + GH_DATA.name + ".timejson";
	var n = b + ".timejson";
	$('#gh_timefilename').val(n);
	$("#gh_linename").val(b);
        $('#gh_linejsonname').html(GH_DATA.file);

	GH_TABLE = {};
	var html = "<ul id=\"table-tabs\" class=\"tabs tabs-fixed-width\">";
	for ( var key in GH_DATA.stations ) {
	    var numstr = "#table-tab-" + key;
	    html += "<li class=\"tab\"><a href=\"" + numstr + "\">" + key + "</a></li>";
	}
	html += "</ul>";
	for ( var key in GH_DATA.stations ) {
	    var numstr = "table-tab-" + key;
	    var spdstr = "spreadsheet-" + key;
	    html += "<div id=\"" + numstr + "\" class=\"col s12\"><div id=\"" + spdstr + "\"></div></div>";

	    GH_TABLE[key] = {
		sheet : null,
		rows : 0,
		cols : 0,
		data : [],
		vorbeigehenidx : []
	    }
	}
	$('#tabscontainer').append(html);
	setTimeout(ghSetupTabSheets,1000);
    } else {
        // Not Implemented
    }
};
//
//  Broadcast Channel Function
//
/////////////////////////////


function ghSelectCurrentTab(e) {
    // e = DOM object
    var istr = e.id.split("-");
    var key = istr[2];
    GH_CURRENT_TABLE_KEY = key;
}
function ghSetupTabSheets() {
    $('.tabs').tabs({
	onShow : ghSelectCurrentTab
    });

    var n = 0;
    var startkey = "";
    for ( var key in GH_DATA.stations ) {
	var spdstr = "spreadsheet-" + key;
	GH_CURRENT_TABLE_KEY = key;
	if ( n == 0 ) startkey = key;
	GH_TABLE[key].sheet = $( '#' + spdstr ).jspreadsheet(GH_TABLE_OPTIONS);
	ghCreateNewTable(key);
	n++;
    }
    $('.tabs').tabs('select', startkey);
    GH_CURRENT_TABLE_KEY = startkey;
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
function ghCreateISOTimeFormat(d,str) {
    if( isNaN(str) ) return "0T00:00:00";
    
    var day = parseInt(d,10);
    if( isNaN(day) ) day = 0;
    
    var len = str.length;
    day = "" + day + "T";
    
    if ( len < 1 || len > 6 ) {
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
    } else if ( len == 4 ) {
	// HHMM
        ret = day + "" + str.substr(0,2) + ":" + str.substr(2,2) + ":00";
    } else if ( len == 5 ) {
	// HHMMS -> HHMM0S
        //ret = day + "" + str.substr(0,2) + ":" + str.substr(2,2) + ":0" + str.substr(4,1) ;

	// HMMSS -> 0HHMMSS
	ret = day + "0" + str.substr(0,1) + ":" + str.substr(1,2) + ":" + str.substr(3,2) ;
    } else {
	// HHMMSS
        ret = day + "" + str.substr(0,2) + ":" + str.substr(2,2) + ":" + str.substr(4,2) ;
    }
    return ret;
}
function ghCreateISOTimeFormat4DIGIT(d,str) {
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

function ghCreateNewTable(key) {
    var stations = GH_DATA.stations[key];
    var len = stations.length;
    GH_TABLE[key].data = [];
    //GH_TABLE.rows = 2 + (len - 2) * 2;
    GH_TABLE[key].cols = 1;
    GH_TABLE[key].rows = 1;
    GH_TABLE[key].vorbeigehenidx = [];
    for ( var i=0;i<len;i++) {
	if ( i == 0 || i == len-1 ) {
	    GH_TABLE[key].data.push( [ stations[i][2] ] );
            GH_TABLE[key].rows ++;
	} else {
            if ( stations[i][3] == "V" ) {
                // check pass through point
                GH_TABLE[key].vorbeigehenidx.push(GH_TABLE[key].rows);
                GH_TABLE[key].vorbeigehenidx.push(GH_TABLE[key].rows+1);
            }            
            GH_TABLE[key].data.push( [ stations[i][2] ] );
            GH_TABLE[key].data.push( [ stations[i][2] ] );
            GH_TABLE[key].rows = GH_TABLE[key].rows + 2;

	}
    }
    GH_TABLE[key].sheet.setData(GH_TABLE[key].data);

    for ( var i=0;i<GH_TABLE[key].rows;i++) {
        if ( i == 0 || i == GH_TABLE[key].rows-1 ) {
            // NOP
        } else {
            if ( i % 2 ) {
                // NOP
            } else {
                GH_TABLE[key].sheet.setMerge("A" + i,1,2);
            }
        }

    }
    
    // Pass through point change font-color
    for ( var i=0;i<GH_TABLE[key].vorbeigehenidx.length;i++) {
        var sheetparam = "A" + GH_TABLE[key].vorbeigehenidx[i];
        var c = GH_TABLE[key].sheet.getCell(sheetparam);
        c.style.color = '#daa520';
    }
}

function ghGetStationStatus(yidx,current,previous,key) {
    for ( var i=0;i<GH_TABLE[key].vorbeigehenidx.length;i++) {
        if ( GH_TABLE[key].vorbeigehenidx[i] == yidx ) {
            return GH_TYPE_THROUGH;
        }
    }
    if ( previous == "START" ) {
        return GH_TYPE_DEPATURE;
    }
    if ( current == previous ) {
        return GH_TYPE_DEPATURE;
    } else {
        return GH_TYPE_ARRIVAL;
    }
    
}
function ghConvertUnitsData() {

    if ( GH_TABLE.cols < 1 ) {
        alert("no data");
	return;
    }
    var today = new Date();
    var result = {
	"property": {
            "rev" : GH_REV,
            "timestamp" : today.toUTCString(),
        },
	"lineid" : $("#gh_linename").val(),
	"geometry": GH_DATA.geometry,
	"units":{}
    };

    for ( var key in GH_TABLE ) {
	result.units[key] = [];
	for ( var x=1;x<GH_TABLE[key].cols;x++) {
	    var u = {
		"marker":"default",
		"locomotive":"default",
		"gltf":null,
		"route": key,
		"geometry": GH_DATA.route[key],
		"trainid":GH_TABLE[key].sheet.getHeader(x),
		"timetable":[]
	    };
	    var data = GH_TABLE[key].sheet.getColumnData(x);
            var sta = "";
            var stapre = "START";
	    var startsec = -1;
	    for ( var y=0,ylen=data.length;y<ylen;y++) {
		var val = data[y];
		if ( val != "" ) {
		    if ( startsec < 0 ) {
			startsec = ghCalcPointTime( ghCreateISOTimeFormat(0,val));
		    }
		    sta = GH_TABLE[key].sheet.getValueFromCoords(0,y);
		    if ( y > 0 && sta == "" ) {
			sta = GH_TABLE[key].sheet.getValueFromCoords(0,y-1);
		    }
		    var sec = ghCalcPointTime( ghCreateISOTimeFormat(0,val) );
		    if ( sec < startsec ) {
			val = ghCreateISOTimeFormat(1,val);
		    } else {
			val = ghCreateISOTimeFormat(0,val);
		    }  
		    u.timetable.push( val );
		    u.timetable.push(sta);
                    u.timetable.push( ghGetStationStatus(y+1,sta,stapre,key) );
                    stapre = sta;
		}
	    }
	    result.units[key].push(u);
	}
    }

    var ret = JSON.stringify(result);
    var outfilename =  $('#gh_timefilename').val() + ".units";
    var download = document.createElement("a");
    document.body.appendChild(download);
    download.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(ret));
    download.setAttribute('download', outfilename);    
    download.click();
    download.remove();

}

function ghDownloadTimetable() {

    var result = {
	"file" : GH_DATA.file,
	"route" : {}
    }

    for ( var key in GH_DATA.route ) {
	result.route[key] = [];
	for ( var x=1;x<GH_TABLE[key].cols;x++) {
	    var line = {
		"name" : GH_TABLE[key].sheet.getHeader(x),
		"data" : GH_TABLE[key].sheet.getColumnData(x)
	    }
	    result.route[key].push( line );
	}
    }
    
    var ret = JSON.stringify(result);

    var outfilename =  $('#gh_timefilename').val();

    var download = document.createElement("a");
    document.body.appendChild(download);
    download.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(ret));
    download.setAttribute('download', outfilename);    
    download.click();
    download.remove();

    $('#gh_timefilemodal').modal('close');

}

function ghUploadTimeJSON(data) {

    var files = data.files;
    var reader = new FileReader();
    reader.readAsText(files[0]);
    reader.onload = function(e) {
        var v = JSON.parse(e.target.result);
	if ( v.file == 	GH_DATA.file ) {
            // NOP
        } else {
            alert("Attension other line data file used");
        }            
            
	for ( var key in v.route ) {
            var startidx = GH_TABLE[key].cols;
	    var r = v.route[key];
            for ( var i=0,ilen=v.route[key].length;i<ilen;i++) {
		GH_TABLE[key].sheet.insertColumn(r[i].data,startidx+i,false,null);
		GH_TABLE[key].sheet.setHeader(startidx+i,r[i].name);
		GH_TABLE[key].cols++;
            }
	}

	$('#gh_timefilemodal').modal('close');
    } 

}

$(document).ready(function(){

    $('#gh_timefilemodal').modal();
    $('#gh_trainidmodal').modal({
	onOpenEnd : function() {
	    GH_TABLE[GH_CURRENT_TABLE_KEY].sheet.resetSelection();
	    $('#gh_trainid').focus();
	    $('#gh_trainid').select();
	}
    });
    $('#gh_convertunitmodal').modal();
    $('#gh_settingmodal').modal();
    $('#gh_deletetrainconfirmmodal').modal();
    
    $('#gh_aboutmodal').modal();

    ghBroadcastSendInitConnection();

    $('#gh_trainid').keypress(function (e) {
	var key = e.keyCode || e.charCode || 0;
	if (key == 13) {
	    $('#gh_trainidmodal').modal('close');
	    ghRenameTrainIDModalOK();
	}
    });

    //ghSetAboutContent();

});

if(window.BroadcastChannel){
    ghBroadcastSetup('secondary',ghBroadcastSecondaryReceiveMessage);
} else {
    console.log("Broadcast Channel Not Supported. \nThis application does not work your browser.");
}
