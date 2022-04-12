
const scandata = require( "./scandata.js" );

// set any "variables" in object

// scandata.set( "title", "test scan" );

// arbitrary 

scandata.addparam(
    {
        name      : "contrast_hydration"
        ,namehtml : "&#916;&#961; [e/&#8491;<sup>3</sup>]"
        ,val      : [ .1, .2, .3 ]
        ,format   : (x) => x.toFixed(3)
    }
);

scandata.addparam(
    {
        name       : "atomic_radius"
        ,namehtml  : "Ra [&#8491;]"
        ,val       : [ 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7 ]
    }
);
scandata.addparam(
    {
        name      : "excluded_volume"
        ,namehtml : "Vol [&#8491;<sup>3</sup>]"
        ,val      : [ 10, 20, 30, 50 ]
    }
);
/*
scandata.addparam(
    {
        name : "c1"
        ,val : [ 3, 4, 5 ]
    }
);
*/

scandata.defaults( "multisaxshub",
                   {
                       title : "CRYSOL chi^2 scan data"
                       ,titlehtml : 'CRYSOL <i style="font-family:georgia">&#935;</i><sup>2</sup> scan data'
                   } );

scandata.list();
scandata.fillints();
scandata.list();
scandata.indextest();
scandata.write( "testfile" );

// console.log( JSON.stringify( scandata.indices(), null, 2 ) );
