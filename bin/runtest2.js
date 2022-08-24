
const runner = require( "./runner.js" );
const JSONfn  = require( './jsonfn.min.js' );

console.log( JSON.stringify( runner.global(), null, 2 ) );

runner.setglobal(
    {
        workers            : 2
        ,debug             : true
        ,idle              : () => console.log( '--> workers are idle' )
        ,interval_timer_ms : 5000
        ,interval_message  : ( globals ) => { console.log( `--> jobs running ${globals.running} queued ${globals.queue.length} complete ${globals.complete.length}`); }
    });

console.log( JSON.stringify( runner.global(), null, 2 ) );

runner.init( "foxs",
             {
                 type    : "foxs"
                 ,pdb    : "1HEL.pdb"
                 ,dat    : "lyzexp.dat"
                 ,min_c1 : .99
                 ,max_c1 : .99
             }
           );

runner.init( "crysol",
             {
                 type                 : "crysol"
                 ,pdb                 : "1HEL.pdb"
                 ,dat                 : "lyzexp.dat"
                 ,harmonics           : 18
                 ,fibgrid             : 200
                 ,maxsval             : 1.2
                 ,qpoints             : 150
                 ,explicit_hydrogens  : "N"
                 ,fit_exp_curve       : "Y"
                 ,ra                  : 1.5
                 ,vol                 : 17667
                 ,drho                : 0.02
             }
           );

runner.init( "sleep3",
             {
                 type    : "sleep"
                 ,pdb    : ""
                 ,time   : 3
             }
           );

runner.init( "sleep5",
             {
                 type    : "sleep"
                 ,pdb    : ""
                 ,time   : 5
             }
           );

runner.init( "sleep2",
             {
                 type    : "sleep"
                 ,pdb    : ""
                 ,time   : 2
             }
           );

runner.init( "ls",
             {
                 type       : "ls"
                 ,pdb       : ""
                 ,long      : ""
                 ,recursive : ""
             }
           );

console.log( runner.dump() );

runner.run( "crysol", (c,n,e) => console.log( `--> ${c} : ${n} : ${e}` ) );

// runner.run( "foxs", (c,n,e) => console.log( `--> ${c} : ${n} : ${e}` ) );

if ( 0 ) {
    runner.run( "sleep5", (c,n,e) => console.log( `--> ${c} : ${n} : ${e}` ) );
    runner.run( "sleep3", (c,n,e) => console.log( `--> ${c} : ${n} : ${e}` ) );
    runner.run( "sleep2", (c,n,e) => console.log( `--> ${c} : ${n} : ${e}` ) );
    runner.run( "ls", (c,n,e) => console.log( `--> ${c} : ${n} : ${e}` ) );
}

// run N jobs of varying length wait for groups to complete or every n secs

// when a group completes, display its results
// when all groups complete, call exit routine

