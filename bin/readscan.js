
const scandata = require( "./scandata.js" );

// set any "variables" in object

scandata.read( "testfile" );
scandata.list();
scandata.indextest();
// scandata.plot2d( [-1,-1,0] );

console.log( scandata.csv() );

// scandata.defaults( "multisaxshub" );
console.log( JSON.stringify( scandata.contours( [ 'contrast_hydration', 'excluded_volume' ] ) ) );
// console.log( JSON.stringify( scandata.contours( [ 'contrast_hydration', 'excluded_volume' ] ), null, 2 ) );

