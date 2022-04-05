// node module to handle scan data

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


exports.addval = function( obj ) {
    // obj [ p1index, p2index, .., pnidex, value ]
    
}    

exports.indextest = function() {
    if ( !scanobj.parameters.length ) {
        console.log( "indextest() : no parameters defined" );
        return;
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
            console.log( `i ${i} j ${j} remainder ${remainder} % - ` + JSON.stringify(obj) );
            obj.unshift( remainder % scanobj.param_offsets[j] );
            remainder -= obj[0] * scanobj.param_offsets[j];
        }
        console.log( `${i} ` + JSON.stringify(obj) );
    }
}

// *** private ***
  
var scanobj = {};

compute_offsets = function() {
    // compute multipliers for each parameter
    scanobj.param_offsets = [ 0 ];
    for ( var i = 1; i < scanobj.parameters.length; ++i ) {
        scanobj.param_offsets.push( scanobj.parameters[i-1].val.length );
    }
}

index = function( obj ) {
    // computes index of obj
    if ( obj.length != scanobj.param_offsets.length ) {
        console.error( `index(): obj.length ${obj.length} does not match scanobj.param_offsets.length ${scanobj.param_offsets.length}` );
        process.exit(-1);
    }
    var result = 0;
    for ( var i = 0; i < obj.length; i++ ) {
        result += obj[i] * scanobj.param_offsets[i];
    }
    return result;
}

        
