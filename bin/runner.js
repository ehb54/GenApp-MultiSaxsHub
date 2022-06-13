// ----------------------------------------------------------------------------------------------------------
// runner.js
// ----------------------------------------------------------------------------------------------------------
// background
// ----------------------------------------------------------------------------------------------------------
// handler for running cli programs
// ----------------------------------------------------------------------------------------------------------

// *** private ***

const fs                                   = require( 'fs' );
const util                                 = require( 'util' );
const spawn                                = require( 'child_process' ).spawn;
const { PerformanceObserver, performance } = require( 'perf_hooks' );
const JSONfn                               = require( './jsonfn.min.js' );
const types                                = require( './runner_types.js' ).types;

let   data   = {}; // main structure 
let   timers = {}; // because bigint doesn't pass JSON.stringify, could modifiy JSONfn to support
let   jobs   = {}; // keep data clean

// *** public ***

exports.init = function( name, obj ) {
    console.log( `init( ${name} )` );
    // store any data in object

    if ( typeof name !== 'string' ) {
        console.error( `init( ${name} ) requires a name string` );
        process.exit(-1);
    }

    if ( !obj.type || typeof obj.type !== 'string' ) {
        console.error( `init( ${name} ) requires a type string` );
        process.exit(-1);
    }

    if ( !(obj.type in types) ) {
        console.error( `init( ${name} ) unsupported type ${obj.type}` );
        process.exit(-1);
    }

    check_params( "init", name, obj );

    check_running( "init", name );
    
    data[ name ] = obj;

    check_type( "init", name );
}

exports.set = function( name, obj ) {
    console.log( `setup( ${name} )` );
    // update params etc

    check_name( "set", name );

    if ( obj.type && !(obj.type in types) ) {
        console.error( `set( ${name} ) unsupported type ${obj.type}` );
        process.exit(-1);
    }

    check_params( "set", name, obj );

    check_running( "set", name );

    data[name] = {...data[name],...obj};

    check_type( "init", name );
}

exports.run = function( name, obj ) {
    console.log( `run( ${name} )` );
    // run program, possibly interactively

    check_name( "run", name );
    check_running( "run", name );

    const type = types[data[name].type];
    console.log( JSON.stringify( type, null, 2 ) );

    type.interactive ? run_interactive( name, type ) : run_args( name, type );
}

exports.get = function( name, obj ) {
    console.log( `get( ${name} )` );
    // get various results
}

exports.dump = function() {
    console.log( `dump()` );
    return JSON.stringify( data, null, 2 );
}


// *** private ***

check_name = function( func, name ) {
    if ( typeof name !== 'string' ) {
        console.error( `${func}( ${name} ) requires a name string` );
        process.exit(-1);
    }

    if ( !(name in data) ) {
        console.error( `${func}( ${name} ) ${name} has not been init()d` );
        process.exit(-1);
    }
}    

check_params = function( func, name, obj ) {
    const badparams = Object.keys( obj ).filter( ( k ) => /^_/.test( k ) );
    if ( badparams.length ) {
        console.error( `${func}(${name}) invalid property names ` + badparams.join( ' ' ) );
        process.exit(-1);
    }
}    

check_running = function( func, name ) {
    if ( data[name] && data[name]._running ) {
        console.error( `${func}( ${name} ) is running, ${func} disallowed` );
        process.exit(-1);
    }
}

run_interactive = function( name, type ) {
    console.log( `run_interactive( ${name} )` );
    
}

check_type = function( func, name ) {
    const req_types = [ "exec", "params" ];
    const type      = types[data[name].type];

    req_types.forEach( e => {
        if ( !types[data[name].type][e] ) {
            console.error( `${func}() invalid type ${data[name].type}. type does not have a ${e} key` );
            process.exit(-1);
        } } );

}        

run_args = function( name, type ) {
    console.log( `run_args( ${name} )` );

    // spawn style command

    let args =
        ( 
            // parameters
            Object.keys( data[name] )
                .reduce( ( accum, val ) => 
                         type.params[val] && typeof type.params[val].option != 'undefined' ?
                         `${accum} ${type.params[val].option} ${data[name][val]}` : accum
                         ,'' )
            // pdb file
                + ` ${data[name].pdb}`
            // optional dat file
                + ( data[name].dat ? ` ${data[name].dat}` : '' )
        ).split( /\s+/ ).filter( token => token != '' );


    console.log( JSON.stringify( args, null, 2 ) );

    data[name]._running         = true;

    jobs[name]                 = spawn( type.exec, args );

    timers[name]               = timers[name] || {};
    timers[name].starttime     = process.hrtime.bigint();

    jobs[name].stdout.on('data', (d) => {
        console.log( `job ${name} stdout caught` );
        data[name]._stdout = data[name]._stdout || '';
        data[name]._stdout += d;
    });
    
    jobs[name].stderr.on('data', (d) => {
        console.log( `job ${name} stderr caught` );
        data[name]._stderr = data[name].stderr || '';
        data[name]._stderr += d;
    });
    
    jobs[name].on('close', (code) => {
        timers[name].endtime     = process.hrtime.bigint();
        data[name]._exitcode     = code;
        data[name]._duration     = Number( timers[name].endtime - timers[name].starttime ) * 1e-9;
        data[name]._running      = false;

        console.log( `job ${name} closed code ${code} duration ${data[name].duration}` );
        json_dump( `data[${name}]`, data[name] );
        console.log( data[name]._stdout );
    });

    jobs[name].on('error', (err) => {
        console.log( `job ${name} running ${type.exec} emitted an error : ${err}` );
        process.exit(-1);
    });
}

json_dump = function( msg, obj ) {
    console.log( `${msg}\n` + JSON.stringify( obj, null, 2 ) );
}
