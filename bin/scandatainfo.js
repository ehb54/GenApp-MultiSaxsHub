#! /usr/local/bin/node 

const scandata = require( "./scandata.js" );

const notes = `usage: ${process.argv[0]} scanfile

reads scanfile and prints summary info
`;

const scanfile = process.argv[2];
if ( !scanfile ) {
    console.log( notes );
    process.exit(-1);
}
    
console.log( `scanfile ${scanfile}` );

scandata.read( scanfile );
scandata.list();
console.log( scandata.valuereport() );

