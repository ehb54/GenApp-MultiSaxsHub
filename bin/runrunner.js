
const runner = require( "./runner.js" );

runner.init( "test",
             {
                 type    : "foxs"
                 ,pdb    : "1HEL.pdb"
                 ,dat    : "lyzexp.dat"
                 ,min_c1 : .99
                 ,max_c1 : .99
             }
           );

console.log( runner.dump() );
runner.run( "test" );

runner.set( "test",
             {
                 dat     : "lyzexp2.dat"
                 ,type   : "crysol"
                 ,min_c1 : 1.0
                 ,max_c1 : 1.0
             }
           );

console.log( runner.dump() );
runner.run( "test" );

