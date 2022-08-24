// ----------------------------------------------------------------------------------------------------------
// runner_types.js
// ----------------------------------------------------------------------------------------------------------
// description:
// ----------------------------------------------------------------------------------------------------------
// supported runner types, e.g. crysol, etc.
// ----------------------------------------------------------------------------------------------------------

// n.b. interactive params are used as regex and need proper escaping

exports.types = 
      {
          crysol : {
              interactive : true
              ,exec       : "/opt/genapp/multisaxshubdev/bin/crysolcmd"
              ,params : {
                  pdb                 : " Brookhaven file name \\.+ < \\s*\\S+ >: "
                  ,harmonics           : "  Maximum order of  harmonics \\.+ < \\s*\\S+ >: "
                  ,fibgrid             : "  Order of Fibonacci grid \\.+ < \\s*\\S+ >: "
                  ,maxsval             : " Maximum s value \\.+ < \\s*\\S+ >: "
                  ,qpoints             : " Number of points \\.+ < \\s*\\S+ >: "
                  ,explicit_hydrogens  : " Account for explicit hydrogens.* < \\s*\\S+ >: "
                  ,fit_exp_curve       : "  Fit the experimental curve \\[ Y / N \\] \\.+ < \\s*\\S+ >: "
                  ,dat                 : " Enter data file \\.+ < \\s*\\S+ >: "
                  ,background_subtract : " Subtract constant \\.+ < \\s*\\S+ >: "
                  ,angular_units       : " 2 \\*  sin\\(theta\\)/lambda \\[1/nm\\]  \\(4\\) \\.+ < \\s*\\S+ >: "
                  ,drho                : " ((Minimum|Maximum) contrast in the shell|Contrast of the solvation shell) \\.+ < \\s*\\S+ >: "
                  ,solvent_density     : " Electron density of the solvent, e/A\\*\\*3  < \\s*\\S+ >: "
                  ,ra                  : " ((Minimum|Maximum) radius of atomic group|Average atomic radius) \\.+ < \\s*\\S+ >: "
                  ,vol                 : " ((Minimum|Maximum) excluded volume|Excluded Volume) \\.+ < \\s*\\S+ >: "
              }
              ,presets: {
                  " Plot the fit \\[ Y / N \\] \\.+ < \\s*\\S+ >: " : "n"
                  ," Another set of parameters \\[ Y / N \\] \\.+ < \\s*\\S+ >: " : [ "y", "n" ]
                  ," Minimize again with new limits \\[ Y / N \\] < \\s*\\S+ >: " : "y"
                  ," Enter your option \\.+ < \\s*\\S+ >: " : ""
                  ," Smax in the fitting range \\.+ < \\s*\\S+ >: " : ""
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
