// node module to handle scan data

const fs = require( 'fs' );

// *** public ***

exports.set = function( k, v ) {
    scanobj[k]=v;
}

exports.addparam = function( name, v ) {
    // add a parameter vector value
    if ( scanobj.data && scanobj.data.length ) {
        scanobj.data = [];
    }
    scanobj.parameters = scanobj.parameters || [];
    scanobj.parameters.push( { name : name
                               ,val : v } );
    compute_offsets();
}

exports.list = function() {
    console.log( JSON.stringify( scanobj, null, 2 ) );
}

exports.setdata = function( obj, val ) {
    // obj [ p1index, p2index, .., pnidex ]
    if ( obj.length != scanobj.param_offsets.length ) {
        console.error( `index(): obj.length ${obj.length} does not match scanobj.param_offsets.length ${scanobj.param_offsets.length}` );
        process.exit(-1);
    }
    scanobj.data = scanobj.data || [];
    scanobj.data[ index(obj) ] = val;
}    

exports.data = function( obj ) {
    // obj [ p1index, p2index, .., pnidex ]
    if ( obj.length != scanobj.param_offsets.length ) {
        console.error( `index(): obj.length ${obj.length} does not match scanobj.param_offsets.length ${scanobj.param_offsets.length}` );
        process.exit(-1);
    }
    return scanobj.data[ index(obj) ];
}    

exports.indextest = function() {
    if ( !scanobj.parameters.length ) {
        console.error( "indextest() : no parameters defined" );
        return false;
    }

    var total_pts = scanobj.parameters[0].val.length;
    for ( var i = 1; i < scanobj.parameters.length; ++i ) {
        total_pts *= scanobj.parameters[i].val.length;
    }

    console.log( `indextest(): total points ${total_pts}` );

    for ( var i = 0; i < total_pts; ++i ) {
        var obj = [];
        var remainder = i;
        for ( var j = scanobj.parameters.length - 1; j >= 0; --j ) {
            obj.unshift( j ? Math.floor( remainder / scanobj.param_offsets[j] ) : remainder );
            remainder = remainder % scanobj.param_offsets[j];
        }
        if ( i != index(obj) ) {
            console.error( `error: ${i} --> ` + JSON.stringify(obj) + ' --> ' + index(obj) );
            return false;
        }
    }
    console.log( 'indextest(): all mappings ok' );
    return true;
}

exports.write = function ( filename ) {
    try {
        fs.writeFileSync( filename, JSON.stringify( scanobj ) );
        return true;
    } catch( err ) {
        console.error( err );
        return false;
    }
}

exports.read = function ( filename ) {
    try {
        scanobj = JSON.parse(fs.readFileSync( filename ));
        return true;
    } catch( err ) {
        console.error( err );
        return false;
    }
}

exports.plot2d = function( obj ) {
    // return 2d plot data for selected indices
    if ( obj.length != 2 ) {
        console.error( "plot2d() : requires an array of two indices" );
        process.exit(-1);
    }
    var result = {};
    result.x = [];
    result.y = [];
    result.v = [];

    for ( var i = 0; i < scanobj.parameters[obj[0]].val.length; ++i ) {
        for ( var j = 0; j < scanobj.parameters[obj[1]].val.length; ++j ) {
            result.x.push( scanobj.parameters[obj[0]].val[i] );
            result.y.push( scanobj.parameters[obj[1]].val[j] );
            // result.v.push( scanobj.data[ index( [
        }
    }
    console.log( JSON.stringify( result, null, 2 ) );
}    

// *** private ***
  
var scanobj = {};

compute_offsets = function() {
    // compute multipliers for each parameter
    scanobj.param_offsets = [ 0 ];
    if ( scanobj.parameters.length == 1 ) {
        return;
    }
    scanobj.param_offsets.push( scanobj.parameters[0].val.length );
    if ( scanobj.parameters.length == 2 ) {
        return;
    }
    for ( var i = 2; i < scanobj.parameters.length; ++i ) {
        scanobj.param_offsets.push( scanobj.parameters[i-1].val.length * scanobj.param_offsets[i-1] );
    }
}

index = function( obj ) {
    // computes index of obj
    if ( obj.length != scanobj.param_offsets.length ) {
        console.error( `index(): obj.length ${obj.length} does not match scanobj.param_offsets.length ${scanobj.param_offsets.length}` );
        process.exit(-1);
    }
    var result = obj[0];
    for ( var i = 1; i < obj.length; i++ ) {
        // could check to make sure index is in range
        if ( obj[i] < 0 || obj[i] >= scanobj.parameters[i].val.length ) {
        console.error( `index() parameter ${i} value ${obj[i]} out of range max ${scanobj.parameters[i].val.length}` );
            process.exit(-1);
        }
        result += obj[i] * scanobj.param_offsets[i];
    }
    return result;
}
