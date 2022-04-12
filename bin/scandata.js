// ----------------------------------------------------------------------------------------------------------
// scandata.js
// ----------------------------------------------------------------------------------------------------------
// background
// ----------------------------------------------------------------------------------------------------------
// manages n-d data for plotly plotting
// ----------------------------------------------------------------------------------------------------------
// summary of data structures
// ----------------------------------------------------------------------------------------------------------
// scanobj - private - all data
// ----------------------------------------------------------------------------------------------------------
// summary of public methods
// ----------------------------------------------------------------------------------------------------------
// addparam( name, vals [, format ])  - initializes a parameter - inputs: name (String), vals (Array of Numbers), format (Function, optional)
// set( key, val )                    - set a toplevel value of scanobj - inputs: key (String), val (whatever)
// list()                             - JSON.stringify's the scanobj to console.out
// for the below functions: obj can be either a number (pos in data) an Array (indices to params)
// setdata( obj, val )                - sets the plot data for the given obj
// data( obj )                        - return the data value for the given obj
// indexvalues( obj )                 - return an array of the parameters values for the obj
// indices( obj )                     - return an array of indices for the obj
// indextest()                        - various testing sanity checks
// write( filename )                  - writes the scanobj to the file (includes functions)
// read( filename )                   - read the scanobj from the file (includes functions)
// defaults( name, additional )       - sets various defaults and optional overrides in the additional object
// contours( axes )                   - axes array of 2 indices for the two indices for the plot.
//                                    - Generates plotly contour subplots for every parameter value not specified in the axes, returns as one plot object
// fillints()                         - fills data with integers for testing
// csv()                              - returns a csv-formatted strin) of data


// example usage:
// ----------------------------------------------------------------------------------------------------------
// scenario 1 - generate contour plots for a 3d set of data using 3 
// ----------------------------------------------------------------------------------------------------------
// scandata.addparam( "d_rho", "d_rho", [ .1, .2, .3 ], (x) => x.toFixed(2) ); // becomes parameter 0
// scandata.addparam( "eV", "eV", [ 1, 2, 3 ], (x) => x.toFixed(0) );       // becomes parameter 1
// scandata.addparam( "Vol", "Vol", [ 10, 20, 30, 40 ] );                    // becomes parameter 2
// scandata.defaults( "multisaxshub", { title : "CRYSOL Chi^2 Scan Data" } );
// loop of scandata.setdata( obj, val ):
// plotlyobj = scandata.contour( [1, 2] ); // plots eV vs Vol for each d_rho
// ----------------------------------------------------------------------------------------------------------



// node module to handle scan data

const fs     = require( 'fs' );
const JSONfn = require( './jsonfn.min.js' );

// *** public ***

exports.set = function( k, v ) {
    scanobj[k]=v;
}

exports.addparam = function( obj ) {
    // add a parameter vector value
    if ( scanobj.data && scanobj.data.length ) {
        scanobj.data = [];
    }
    scanobj.name2index = scanobj.name2index || {};
    scanobj.parameters = scanobj.parameters || [];

    if ( typeof obj !== 'object' ) {
        console.error( "addparam() object parameter required" );
        process.exit(-1);
    }

    if ( !obj.name ) {
        console.error( "addparam() obj.name must be defined" );
        process.exit(-1);
    }

    if ( !obj.val || !Array.isArray( obj.val ) ) {
        console.error( "addparam() obj.val must be defined and be an array" );
        process.exit(-1);
    }

    if ( obj.format && typeof obj.format !== 'function' ) {
        console.error( "addparam() obj.format provided but not a function " );
        process.exit(-1);
    }

    if ( obj.name in scanobj.name2index ) {
        console.warn( `addparam(): replacing previously assigned parameter name ${obj.name}` );
        scanobj.parameters[scanobj.name2index[name]].namehtml = obj.namehtml ? obj.namehtml : obj.name
        scanobj.parameters[scanobj.name2index[name]].val      = obj.val;
        scanobj.parameters[scanobj.name2index[name]].format   = obj.format ? obj.format : (x) => x;
    } else {        
        scanobj.parameters.push(
            {
                name      : obj.name
                ,namehtml : obj.namehtml ? obj.namehtml : obj.name
                ,val      : obj.val
                ,format   : obj.format ? obj.format : (x) => x
            }
        );
    }
    compute_offsets();
}

exports.list = function() {
    console.log( JSON.stringify( JSON.parse( JSONfn.stringify( scanobj ) ), null, 2 ) );
}

exports.setdata = function( obj, val ) {
    // obj [ p1index, p2index, .., pnidex ]
    if ( typeof obj === 'number' ) {
        obj = index2obj( obj );
    }
    if ( obj.length != scanobj.param_offsets.length ) {
        console.error( `setdata(): obj.length ${obj.length} does not match scanobj.param_offsets.length ${scanobj.param_offsets.length}` );
        process.exit(-1);
    }
    scanobj.data = scanobj.data || [];
    scanobj.data[ index(obj) ] = val;
}    

exports.data = function( obj ) {
    if ( typeof obj === 'undefined' ) {
        return scanobj.data;
    }
    if ( typeof obj === 'number' ) {
        obj = index2obj( obj );
    }
    // obj [ p1index, p2index, .., pnidex ]
    if ( obj.length != scanobj.param_offsets.length ) {
        console.error( `data(): obj.length ${obj.length} does not match scanobj.param_offsets.length ${scanobj.param_offsets.length}` );
        process.exit(-1);
    }
    return scanobj.data[ index(obj) ];
}    

exports.indexvalues = function( obj ) {
    if ( typeof obj === 'undefined' ) {
        let res = [];
        for ( var i = 0; i < scanobj.datapoints; ++i ) {
            res.push( exports.indexvalues( i ) );
        }
        return res;
    }
    if ( typeof obj === 'number' ) {
        obj = index2obj( obj );
    }
    // obj [ p1index, p2index, .., pnidex ]
    if ( obj.length != scanobj.param_offsets.length ) {
        console.error( `indexvalues(): obj.length ${obj.length} does not match scanobj.param_offsets.length ${scanobj.param_offsets.length}` );
        process.exit(-1);
    }
    let res = [];
    for ( let i = 0; i < obj.length; ++i ) {
        res.push( scanobj.parameters[i].val[obj[i]] );
    }
        
    return res;
}

exports.indices = function( n ) {
    if ( typeof n === 'undefined' ) {
        let res = [];
        for ( let i = 0; i < scanobj.datapoints; ++i ) {
            res.push( exports.indices( i ) );
        }
        return res;
    }
    if ( typeof n !== 'number' ) {
        console.error( `indices(): requires a number or empty parameter` );
        process.exit(-1);
    }
        
    return index2obj( n );
}

exports.indextest = function() {
    if ( !scanobj.parameters.length ) {
        console.error( "indextest() : no parameters defined" );
        return false;
    }

    console.log( `indextest(): total points ${scanobj.datapoints}` );

    for ( let i = 0; i < scanobj.datapoints; ++i ) {
        const obj = index2obj( i );
        if ( i != index(obj) ) {
            console.error( `error: ${i} --> ` + JSON.stringify(obj) + ' --> ' + index(obj) );
            return false;
        }
        console.log( `indexvalues for ${i} ` + JSON.stringify(exports.indexvalues(i)) );
    }

    console.log( 'indextest(): all mappings ok' );
    return true;
}

exports.write = function ( filename ) {
    try {
        fs.writeFileSync( filename, JSONfn.stringify( scanobj ) );
        return true;
    } catch( err ) {
        console.error( err );
        return false;
    }
}

exports.read = function ( filename ) {
    try {
        scanobj = JSONfn.parse(fs.readFileSync( filename ));
        return true;
    } catch( err ) {
        console.error( err );
        return false;
    }
}

exports.defaults = function( name, additional ) {
    switch ( name ) {
    case "multisaxshub" :
        scanobj.plotgapfractionx = 0.20;
        scanobj.plotgapfractiony = 0.16;
        scanobj.plotsperrow      = 3;
        scanobj.plotrowheight    = 300;
        scanobj.dataname         = 'Chi^2';
        scanobj.datanamehtml     = '<i style="font-family:georgia">&#935;</i><sup>2</sup>';
        break;
    default:
        console.log( `defaults( ${name} ) : '${name}' unknown style` );
        process.exit(-1);
        break;
    }

    if ( additional ) {
        if ( typeof additional == 'object' ) {
            for ( let i in additional ) {
                if ( additional.hasOwnProperty( i ) ) {
                    console.log( `----> adding property ${i}` );
                    scanobj[i] = additional[i];
                }
            }
        } else {
            console.log( `defaults( ${name}, additional ) : additional data must be an object` );
            process.exit(-1);
        }
    }
}

exports.contours = function( obj ) {
    // return contour plot data
    // specifiy the names or indices of two parameters
    
    if ( obj.length != 2 ) {
        console.error( `contours() : argument array length ${obj.length} is not two` );
        process.exit(-1);
    }

    obj = obj.map( x => x in scanobj.name2index ? scanobj.name2index[x] : x );

    if ( !obj.every( x => typeof x === 'number' && x >= 0 && x < scanobj.parameters.length ) ) {
        console.error( 'contours() : argument array values do not provide valid indices ' + JSON.stringify( obj ) );
        process.exit(-1);
    }

    if ( obj[0] == obj[1] ) {
        console.error( 'contours() : argument array values have duplicate indices ' + JSON.stringify( obj ) );
        process.exit(-1);
    }
        
    console.log( "coutours ok - so far " + JSON.stringify( obj ) );

    const axes = obj;
    // now we need to loop through all indices not in axes

    let fixed_axes       = [];
    let fixed_axes_index = [];
    for ( let i = 0; i < scanobj.parameters.length; ++i ) {
        if ( axes.includes(i) ) {
            continue;
        }
        fixed_axes      .push( [...Array(scanobj.parameters[i].val.length).keys() ] );
        fixed_axes_index.push( i );
    }

    let cart = cartesian.apply(this, fixed_axes);

    if ( cart.length == 0 ) {
        console.error( 'contours(): zero plots!' );
        process.exit(-1);
    }

    // debugging
    // cart = cart.slice( 0, 2 );

    console.log( "fixed_axes\n" + JSON.stringify( fixed_axes, null, 2 ) );
    console.log( "fixed_axes_index\n" + JSON.stringify( fixed_axes_index, null, 2 ) );
    console.log( "cart\n" + JSON.stringify( cart, null, 2 ) );

    // --> get start/end/size values for all plots
    // min/max
    const contour_start = Math.min(...scanobj.data);
    const contour_end   = Math.max(...scanobj.data);
    const contour_size  = (contour_end - contour_start ) / 10;

    // --> figure out layout domains

    let domains   = {};

    const plotsperrow = Math.min( scanobj.plotsperrow ? scanobj.plotsperrow  : 3, cart.length );
    const gapfracx    = scanobj.plotgapfractionx ? scanobj.plotgapfractionx  : 0.20;
    const gapfracy    = scanobj.plotgapfractiony ? scanobj.plotgapfractiony  : 0.10;  
    const plotrows    = Math.ceil( cart.length / plotsperrow );

    /// compute the basic domains for a row

    {
        domains.x = [];
        
        const plotdomainwidth = 1 / ( ( plotsperrow - 1 ) * ( 1 + gapfracx ) + 1 );
        const gap             = plotdomainwidth * gapfracx;

        for ( let i = 0; i < plotsperrow; ++i ) {
            domains.x.push( [i * (plotdomainwidth + gap), i * (plotdomainwidth + gap) + plotdomainwidth ] );
        }
        domains.x = domains.x.map( x => [ Number( x[0].toFixed(3) ), Number( x[1].toFixed(3) ) ] );
        // console.log( `epr ${plotsperrow} plotdomainwidth ${plotdomainwidth} gap ${gap}` );
        // console.log( JSON.stringify( domains, null, 2 ) );
        // console.log( JSON.stringify( domains.x.map( x => x[1] - x[0] ), null, 2 ) );
    }
        
    {
        domains.y = [];
        
        const plotdomainheight = 1 / ( ( plotrows - 1 ) * ( 1 + gapfracy ) + 1 );
        const gap              = plotdomainheight * gapfracy;

        for ( let i = 0; i < plotrows; ++i ) {
            for ( let j = 0; j < plotsperrow; ++j ) {
                domains.y.push( [i * (plotdomainheight + gap), i * (plotdomainheight + gap) + plotdomainheight ] );
            }
        }
        domains.y = domains.y.map( x => [ Number( x[0].toFixed(3) ), Number( x[1].toFixed(3) ) ] );
        domains.y = domains.y.reverse();
        // console.log( `epr ${plotrows} plotdomainheight ${plotdomainheight} gap ${gap}` );
        // console.log( JSON.stringify( domains, null, 2 ) );
        // console.log( JSON.stringify( domains.x.map( x => x[1] - x[0] ), null, 2 ) );
    }

    let result           = {};
    result.data          = [];
    result.layout        =
        {
            title        : scanobj.titlehtml ? scanobj.titlehtml : scanobj.title
            ,annotations : []
        };

    if ( plotrows > 1 ) {
        result.layout.height = plotrows * ( scanobj.plotrowheight ? scanobj.plotrowheight : 300 );
    }
    
    for ( let p = 0; p < cart.length; ++p ) {
        let point = [];
        if ( typeof cart[p] === 'object' ) {
            for ( let i = 0; i < cart[p].length; ++i ) {
                point[ fixed_axes_index[ i ] ] = cart[p][i];
            }
        } else {
            point[ fixed_axes_index[ 0 ] ] = cart[p];
        }
        // console.log( `point ${p} values ` + JSON.stringify( point ) );

        const pp1 = p + 1

        let this_data = 
            {
                xaxis          : `x${pp1}`
                ,yaxis         : `y${pp1}`
                ,name          : fixed_axes_index.reduce( (a, i) => a + scanobj.parameters[ i ].namehtml + "=" + scanobj.parameters[ i ].format( scanobj.parameters[ i ].val[ point[ i ] ] ) + "<br>", "" )
                ,type          : "contour"
                ,x             : scanobj.parameters[axes[0]].val
                ,y             : scanobj.parameters[axes[1]].val
                ,z             : []
                ,contours : {
                    coloring    : "heatmap"
                    ,showlabels : true
                    ,start      : contour_start
                    ,end        : contour_end
                    ,size       : contour_size
                    ,labelfont  : {
                        color : "white"
                    }
                }
                ,colorscale    : "Jet"
                ,showscale     : p == cart.length - 1 ? true : false
                ,colorbar      : {
                    title       : (scanobj.datanamehtml || scanobj.dataname ) && p == cart.length - 1 ? (scanobj.datanamehtml || scanobj.dataname ) : ''
                    ,titleside  : "top"
                }
                ,hovertemplate :
                    scanobj.parameters[axes[0]].namehtml + ' = %{x}<br>'
                    + scanobj.parameters[axes[1]].namehtml + ' = %{y}<br>'
                    + ( scanobj.datanamehtml || scanobj.dataname ? scanobj.datanamehtml || scanobj.dataname : 'z' ) + ' = %{z}'
            }
        ;
        
        result.layout[ `xaxis${pp1}` ] =
            {
                title   : {
                    text      : scanobj.parameters[axes[0]].namehtml
                    ,standoff : -5
                }
                ,anchor : `y${pp1}`
                ,domain : domains.x[p % plotsperrow]
                ,visible : p >= cart.length - plotsperrow ? true : false
            }
        ;
            
        result.layout[ `yaxis${pp1}` ] =
            {
                title           : p % plotsperrow == 0 ?
                    {
                        text      : scanobj.parameters[axes[1]].namehtml
                        ,standoff : -5
                    } : false
                ,anchor         : `x${pp1}`
                ,domain         : domains.y[p]
                ,automargin     : true
                ,visible        : p % plotsperrow == 0 ? true : false
                // doesn't work well ,ticklabelposition : "inside top"
            }
        ;
            
        // subplot titles
        // https://github.com/plotly/plotly.js/issues/2746
        // needs recent version of plotly (2.11.1 known to work)
            
        result.layout.annotations.push(
            {
                text       : fixed_axes_index.reduce( (a, i) => a + scanobj.parameters[ i ].namehtml + "=" + scanobj.parameters[ i ].format( scanobj.parameters[ i ].val[ point[ i ] ] ) + "<br>", "" )
                ,x         : 0
                ,xref      : `x${pp1} domain`
                ,y         : 1 + .1 * fixed_axes_index.length
                ,yref      : `y${pp1} domain`
                ,showarrow : false
            }
        );
        
        for ( let i = 0; i < scanobj.parameters[axes[0]].val.length; ++i ) {
            for ( let j = 0; j < scanobj.parameters[axes[1]].val.length; ++j ) {
                point[ axes[0] ] = i;
                point[ axes[1] ] = j;
                console.log( `--> point ${p} values ` + JSON.stringify( point ) );
                this_data.z[i]    = this_data.z[i] || [];
                this_data.z[i][j] = scanobj.data[ index( point ) ] 
            }
        }

        result.data.push( this_data );
    }

    // console.log( JSON.stringify( result.layout, null, 2 ) );
    // process.exit(-1);

    return result;
}    

exports.fillints = function() {
    // fill data with integers
    scanobj.data = scanobj.data || [];
    for ( let i = 0; i < scanobj.datapoints; ++i ) {
        scanobj.data[i] = i;
    }
}    

exports.csv = function() {
    let res = '';

    for ( let i = 0; i < scanobj.parameters.length; ++i ) {
        res += scanobj.parameters[i].name + ',';
    }
    res += ( scanobj.dataname ? scanobj.dataname : 'data' ) + '\n';

    for ( let i = 0; i < scanobj.datapoints; ++i ) {
        let indices = exports.indexvalues( i );
        res += indices.map(String).join( ',' ) + ',' + scanobj.data[i] + '\n';
    }
    return res;
}

// *** private ***
  
let scanobj = {};

const countOccurrences = (arr, val) => arr.reduce((a, v) => (v === val ? a + 1 : a), 0);

compute_offsets = function() {
    // compute multipliers for each parameter & the number of datapoints & map parameters:name to index position
    scanobj.name2index = {};
    for ( let i = 0; i < scanobj.parameters.length; ++i ) {
        scanobj.name2index[ scanobj.parameters[i].name ] = i;
    }
    scanobj.datapoints = scanobj.parameters[0].val.length;
    scanobj.param_offsets = [ 0 ];
    if ( scanobj.parameters.length == 1 ) {
        return;
    }
    scanobj.param_offsets.push( scanobj.parameters[0].val.length );
    scanobj.datapoints *= scanobj.parameters[1].val.length;
    if ( scanobj.parameters.length == 2 ) {
        return;
    }
    for ( let i = 2; i < scanobj.parameters.length; ++i ) {
        scanobj.param_offsets.push( scanobj.parameters[i-1].val.length * scanobj.param_offsets[i-1] );
        scanobj.datapoints *= scanobj.parameters[i].val.length;
    }
}

index = function( obj ) {
    // computes index of obj
    if ( obj.length != scanobj.param_offsets.length ) {
        console.error( `index(): obj.length ${obj.length} does not match scanobj.param_offsets.length ${scanobj.param_offsets.length}` );
        process.exit(-1);
    }
    let result = obj[0];
    for ( let i = 1; i < obj.length; i++ ) {
        // could check to make sure index is in range
        if ( obj[i] < 0 || obj[i] >= scanobj.parameters[i].val.length ) {
        console.error( `index() parameter ${i} value ${obj[i]} out of range max ${scanobj.parameters[i].val.length}` );
            process.exit(-1);
        }
        result += obj[i] * scanobj.param_offsets[i];
    }
    return result;
}

index2obj = function( i ) {
    let obj = [];
    let remainder = i;
    for ( let j = scanobj.parameters.length - 1; j >= 0; --j ) {
        obj.unshift( j ? Math.floor( remainder / scanobj.param_offsets[j] ) : remainder );
        remainder = remainder % scanobj.param_offsets[j];
    }
    return obj;
}

// thanks https://stackoverflow.com/users/613198/rsp https://stackoverflow.com/questions/12303989/cartesian-product-of-multiple-arrays-in-javascript
const cartesian = (...a) => a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
