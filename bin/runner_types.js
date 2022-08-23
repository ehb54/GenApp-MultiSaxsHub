// ----------------------------------------------------------------------------------------------------------
// runner_types.js
// ----------------------------------------------------------------------------------------------------------
// description:
// ----------------------------------------------------------------------------------------------------------
// supported runner types, e.g. crysol, etc.
// ----------------------------------------------------------------------------------------------------------

exports.types = 
      {
          crysol : {
              interactive : true
              ,exec       : "/opt/genapp/multisaxshubdev/bin/crysolcmd"
              ,params : {
                  _presets: {
                      " Plot the fit [ Y / N ] ................. <          Yes >: " : "_EOF"
                      ," Enter your option ...................... <            0 >: " : "\n"
                  }
                  ,pdb                 : " Brookhaven file name ................... <         .pdb >: "
                  ,harmonics           : "  Maximum order of  harmonics ........... <           15 >: "
                  ,fibgrid             : "  Order of Fibonacci grid ............... <           18 >: "
                  ,maxsval             : " Maximum s value ........................ <        1.000 >: "
                  ,qpoints             : " Number of points ....................... <          101 >: "
                  ,explicit_hydrogens  : " Account for explicit hydrogens? [ Y / N ] <           No >: "
                  ,fit_exp_curve       : "  Fit the experimental curve [ Y / N ] .. <          Yes >: "
                  ,exp_curve_dat       : " Enter data file ........................ <         .dat >: "
                  ,background_subtract : " Subtract constant ...................... <           no >: "
                  ,angular_units       : " 2 *  sin(theta)/lambda [1/nm]  (4) ..... <            1 >: "
                  ,drho                : " Electron density of the solvent, e/A**3  <        .3340 >: "
              }
          }
          ,foxs : {
              interactive : false
              ,exec       : "/opt/genapp/multisaxshubdev/bin/foxs"
              ,params : {
                  min_c1 : {
                      option : "--min_c1"
                  }
                  ,max_c1 : {
                      option : "--max_c1"
                  }
              }
          }
          ,pepsisaxs : {
              interactive : false
              ,exec       : "./pepsisaxs"
              ,params : {
                  dro : {
                      option : "--dro"
                  }
              }
          }
          ,sleep : {
              interactive : false
              ,exec       : "sleep"
              ,params : {
                  time : {
                      option : ""
                  }
              }
          }
          ,ls : {
              interactive : false
              ,exec       : "ls123"
              ,params : {
                  long : {
                      option : "-l"
                  }
                  ,recursive : {
                      option : "-R"
                  }
              }
          }
      };
