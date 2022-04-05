
const scandata = require( "./scandata.js" );

// set any "variables" in object

scandata.set( "title", "test scan" );

// arbitrary 

scandata.addparam( "drho", [ .1, 2.2, .3 ] );
scandata.addparam( "eV", [ 5, 7 ] );
scandata.addparam( "Vol", [ 10, 20, 30, 50 ] );
scandata.setdata( [0,1,3], "hi" );
scandata.list();
scandata.indextest();
scandata.write( "testfile" );



