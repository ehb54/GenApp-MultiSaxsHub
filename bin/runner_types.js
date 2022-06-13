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
              ,exec       : "./crysol"
              ,params : {
                  dro : {
                      input : "blah"
                      ,desc  : "dro desc"
                  }
              }
          }
          ,foxs : {
              interactive : false
              ,exec       : "./foxs"
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
              ,exec       : "ls"
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
