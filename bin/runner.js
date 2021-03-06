// ----------------------------------------------------------------------------------------------------------
// runner.js
// ----------------------------------------------------------------------------------------------------------
// background
// ----------------------------------------------------------------------------------------------------------
// handler for running cli programs
// ----------------------------------------------------------------------------------------------------------

// *** private ***

const fs      = require( 'fs' );
const util    = require( 'util' );
const spawn   = require( 'child_process' ).spawn;
const JSONfn  = require( './jsonfn.min.js' );
const types   = require( './runner_types.js' ).types;

let   data    = {}; // main structure 
let   timers  = {}; // because bigint doesn't pass JSON.stringify, could modifiy JSONfn to support
let   jobs    = {}; // keep data clean
let   globals = // global values
    {
        workers                    : 3
        ,running                   : 0
        ,complete                  : []
        ,queue                     : []
        ,debug                     : false
        ,interval_message          : () => { console.log( `jobs running ${globals.running} queued ${globals.queue.length} complete ${globals.complete.length}`); }  // define as function to call on interval during running
        //                         ^^ exposed as (global,data,jobs) => {}
        ,interval_timer_ms         : 0      // set to milliseconds for repeat calls, zero value is disabled
    };

// *** public ***

exports.setglobal = function( obj ) {
    globals = { ...globals, ...obj };
    return globals;
}

exports.global = function() {
    return globals;
}

exports.init = function( name, obj ) {
    debug( `init( ${name} )` );
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
    debug( `setup( ${name} )` );
    // update params etc

    check_name( "set", name );

    if ( obj.type && !(obj.type in types) ) {
        console.error( `set( ${name} ) unsupported type ${obj.type}` );
        process.exit(-1);
    }

    check_params( "set", name, obj );

    check_running( "set", name );

    data[name] = { ...data[name], ...obj };

    check_type( "init", name );
}

exports.run = function( name, cb ) {
    debug( `run( ${name} )` );
    // run program, possibly interactively
    // when started or complete or error, call cb

    check_name( "run", name );
    check_running( "run", name );

    globals.queue.push( { name, cb } );

    run_next();
}

exports.get = function( name, obj ) {
    debug( `get( ${name} )` );
    // get various results
}

exports.dump = function() {
    debug( `dump()` );
    return JSONfn.stringify( data, null, 2 );
}

// *** private ***

run_next = function() {
    debug( 'run_next()' );
    
    if ( globals.interval_timer_ms > 0 &&
         typeof globals.interval_timer_id === 'undefined' &&
         typeof globals.interval_message  === 'function' ) {
        console.log( "--> set interval started" );
        globals.interval_timer_id = setInterval( globals.interval_message, globals.interval_timer_ms, globals, data, jobs );
    }

    if ( !globals.queue.length ) {
        if ( globals.running > 0 ) {
            debug( 'run_next() - jobs running' );
            return;
        }
        if ( typeof globals.interval_timer_id !== 'undefined' ) {
            console.log( "--> clear interval called" );
            clearInterval( globals.interval_timer_id );
        }

        debug( 'run_next() - queue empty' );
        if ( typeof globals.idle === 'function' ) {
            debug( 'run_next() - calling idle()' );
            return globals.idle();
        }
        debug( 'run_next() - silent return' );
        return;
    }

    if ( globals.running < globals.workers ) {
        ++globals.running;

        const job  = globals.queue.shift();
        const type = types[data[job.name].type];

        if ( job.cb && typeof job.cb === 'function' ) {
            job.cb( 'start', job.name, '' );
        }

        debug( JSONfn.stringify( type, null, 2 ) );

        type.interactive ? run_interactive( job.name, type, job.cb ) : run_args( job.name, type, job.cb );
    }
}

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
    if ( globals.queue.filter( ( v ) => v.name === name ).length ) {
        console.error( `${func}( ${name} ) is queued, ${func} disallowed` );
        json_dump( "current queue", globals.queue );
        process.exit(-1);
    }
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

run_interactive = function( name, type, cb ) {
    debug( `run_interactive( ${name} )` );
}

run_args = function( name, type, cb ) {
    debug( `run_args( ${name} )` );

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


    globals.debug && debug( JSONfn.stringify( args, null, 2 ) );

    data[name]._running         = true;

    jobs[name]                 = spawn( type.exec, args );

    timers[name]               = timers[name] || {};
    timers[name].starttime     = process.hrtime.bigint();

    jobs[name].stdout.on('data', (d) => {
        debug( `job ${name} stdout caught` );
        data[name]._stdout = data[name]._stdout || '';
        data[name]._stdout += d;
    });
    
    jobs[name].stderr.on('data', (d) => {
        debug( `job ${name} stderr caught` );
        data[name]._stderr = data[name].stderr || '';
        data[name]._stderr += d;
    });
    
    jobs[name].on('close', (code) => {
        timers[name].endtime     = process.hrtime.bigint();
        data[name]._exitcode     = code;
        data[name]._duration     = Number( timers[name].endtime - timers[name].starttime ) * 1e-9;
        data[name]._running      = false;

        --globals.running;
        globals.complete.push( name );

        debug( `job ${name} closed code ${code} duration ${data[name].duration}` );
        json_dump( `data[${name}]`, data[name] );
        debug( data[name]._stdout );
        if ( cb && typeof cb === 'function' ) {
            cb( 'end', name, code );
        }
        run_next();
    });

    jobs[name].on('error', (err) => {
        debug( `job ${name} running ${type.exec} emitted an error : ${err}` );
        if ( cb && typeof cb === 'function' ) {
            return cb( 'error', name, err );
        }
        process.exit(-1);
    });
}

json_dump = function( msg, obj ) {
    debug( `${msg}\n` + JSONfn.stringify( obj, null, 2 ) );
}

debug = function( msg ) {
    globals.debug && debug( msg );
}
