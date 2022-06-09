// ----------------------------------------------------------------------------------------------------------
// runner.js
// ----------------------------------------------------------------------------------------------------------
// background
// ----------------------------------------------------------------------------------------------------------
// handler for running cli programs
// ----------------------------------------------------------------------------------------------------------

// *** private ***

const fs                                   = require('fs');
const util                                 = require('util');
const promisify                            = util.promisify;
const p_exec                               = promisify( require( 'child_process' ).exec ) ;
const { PerformanceObserver, performance } = require('perf_hooks');
const JSONfn                               = require( './jsonfn.min.js' );
const types                                = require( './runner_types.js' ).types;

let   data = {}; // main structure 

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

    check_running( "init", name );
    
    data[ name ] = obj;

    check_type( "init", name );
}

exports.set = function( name, obj ) {
    console.log( `setup( ${name} )` );
    // update params etc

    check_name( "run", name );

    if ( obj.type && !(obj.type in types) ) {
        console.error( `set( ${name} ) unsupported type ${obj.type}` );
        process.exit(-1);
    }

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
    // data[name].running = true;
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

check_running = function( func, name ) {
    if ( data[name] && data[name].running ) {
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

    // build up command

    let cmd =
        // executable
        type.exec +
        // parameters
        Object.keys( data[name] )
        .reduce( ( accum, val ) => 
                 type.params[val] && type.params[val].option ?
                 `${accum} ${type.params[val].option} ${data[name][val]}` : accum
                 ,'' )
        // pdb file
        + ` ${data[name].pdb}`
        // optional dat file
        + ( data[name].dat ? ` ${data[name].dat}` : '' )
    ;
    
    console.log( cmd );
    process.exit();
}
