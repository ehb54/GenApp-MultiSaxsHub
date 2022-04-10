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
    scanobj.name2index = scanobj.name2index || {};
    scanobj.parameters = scanobj.parameters || [];

    if ( name in scanobj.name2index ) {
        console.warn( `addparam(): replacing previously assigned parameter name ${name}` );
        scanobj.parameters[scanobj.name2index[name]].val = v;
    } else {        
        scanobj.parameters.push( { name : name
                                   ,val : v } );
    }
    compute_offsets();
}

exports.list = function() {
    console.log( JSON.stringify( scanobj, null, 2 ) );
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
    // modify - obj [ -1, pos, pos, -1, pos ] etc where -1's are the selected indices
    
    if ( obj.length != scanobj.parameters.length ) {
        console.error( `plot2d() : argument array length ${obj.length} does not match scanobj.parameters.length ${scanobj.parameters.length}` );
        process.exit(-1);
    }

    if ( countOccurrences(obj, -1) != 2 ) {
        console.error( `plot2d() : argument array must contain exactly 2 -1 values as positional markers of the plotted indices` );
        process.exit(-1);
    }
        
    let axes  = [];
    for ( let i = 0; i < obj.length; ++i ) {
        if ( obj[i] == -1 ) {
            axes.push( i );
        }
    }

    let result = {};
    result.xlabel = scanobj.parameters[axes[0]].name;
    result.ylabel = scanobj.parameters[axes[1]].name;

    result.x = [];
    result.y = [];
    result.v = [];

    for ( let i = 0; i < scanobj.parameters[axes[0]].val.length; ++i ) {
        for ( let j = 0; j < scanobj.parameters[axes[1]].val.length; ++j ) {
            result.x.push( scanobj.parameters[axes[0]].val[i] );
            result.y.push( scanobj.parameters[axes[1]].val[j] );
            obj[axes[0]] = i;
            obj[axes[1]] = j;
            result.v.push( scanobj.data[ index( obj ) ] );
        }
    }
    console.log( JSON.stringify( result, null, 2 ) );
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
    cart = cart.slice( 0, 2 );

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

    const plotsperrow = scanobj.plotsperrow      ? scanobj.plotsperrow       : 3;
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
            title        : scanobj.title
            ,annotations : []
        };

    if ( plotrows > 1 ) {
        result.layout.height = scanobj.plotrowheight ? scanobj.plotrowheight * plotrows : 300 * plotrows;
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
        console.log( `point ${p} values ` + JSON.stringify( point ) );

        let pp1 = p + 1

        let this_data = 
            {
                xaxis     : `x${pp1}`
                ,yaxis    : `y${pp1}`
                ,name     : `my legend<br>name<br>${pp1}`
                ,type     : "contour"
                ,x        : scanobj.parameters[axes[0]].val
                ,y        : scanobj.parameters[axes[1]].val
                ,z        : []
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
                ,showscale  : p == cart.length - 1 ? true : false
                ,colorscale : "Jet"
            }
        ;
        
        result.layout[ `xaxis${pp1}` ] =
            {
                title   : {
                    text      : scanobj.parameters[axes[0]].name
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
                        text      : scanobj.parameters[axes[1]].name
                        ,standoff : -5
                    } : false
                ,anchor         : `x${pp1}`
                ,domain         : domains.y[p]
                ,automargin     : true
                ,visible        : p % plotsperrow == 0 ? true : false
                // doesn't work well ,ticklabelposition : "inside top"
            }
        ;
            
        if ( 1 ) {
            // attempt at subplot titles
            // https://github.com/plotly/plotly.js/issues/2746
            // might need newer version of plotly
            
            result.layout.annotations.push(
                {
                    text       : `plot ${pp1}<br> `
                    ,x         : 2
                    // ,ay        : -10
                    ,xref      : `x${pp1}`
                    // ,xref      : `x${pp1} domain`
                    ,y         : 30
                    ,yref      : `y${pp1}`
                    ,showarrow : false
                }
            );
        }
        
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
