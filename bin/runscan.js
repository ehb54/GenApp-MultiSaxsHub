
const scandata = require( "./scandata.js" );

scandata.set( "title", "test scan" );
scandata.addparam( "drho", [ 1, 2, 3 ] );
scandata.addparam( "eV", [ 1, 2 ] );
scandata.list();
scandata.indextest();


