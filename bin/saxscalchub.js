#! /usr/local/bin/node 
//  usage 
//  ./build_command_line_executable_from_json.js [input_from_ui]
//  data_file = data_table.json
// Unicode used
/*
  Angstrom = \u212B
  less equal = \u2264
  superscript -1 = <sup>-1</sup> 
*/
var fs = require( 'fs' );
var dgram = require('dgram');

const util = require('util');
promisify = util.promisify;
const p_exec = promisify( require( 'child_process' ).exec ) ;
const exec = require( 'child_process' ).exec;
const yaml = require( 'js-yaml' );
const scandata = require( "./scandata.js" );

const { PerformanceObserver, performance } = require('perf_hooks');

var input_from_ui = process.argv[ 2 ];

var req = JSON.parse( input_from_ui );

const modulename = req._application;
const runname = req.runname;
//var table = JSON.parse( fs.readFileSync( './data_table.json' ) );

var x, key, opt, pref, argm, pdb, pdbshort, raw_expdata, raw_expdatashort, expdata, expdatashort;

var raw_data_exp;

var qmin_calc, qmax_calc;

var runmode = "calc"; // if only pdb is given, "fit" if expdata is given optionally.

var upd_ip = req._udphost;
var udp_port = req._udpport;

// send_udpmsg( { _textarea : 'original input:\n' + JSON.stringify( req, null, 2 ) + '\n' });

// if ( req.constant_subtractions && typeof req.set_constant_subtractions_FoXS === 'undefined' ) {
//     req.set_constant_subtractions_FoXS = "on";
//     if ( typeof req.const_subtractions_FoXS === 'undefined' ) {
//         req.constant_subtractions_FoXS = "0.2";
//     }
// }

// send_udpmsg( { _textarea : 'after cs adj:\n' + JSON.stringify( req, null, 2 ) + '\n' });

//msg._uuid = req._uuid;

var runlogfile = req._base_directory + "/" + runname + '/' + modulename + "_" + runname + "_" + req._base_directory.split('/').pop() + ".txt";
var runlogfile_2 = req._base_directory + "/" + runname + '/' + modulename + "_" + runname  +  "_" + req._base_directory.split('/').pop() + "_2.txt";

// fix to track FoXS background subtraction from global setting

if ( "multi_model_pdb" in req ) {
    if  (!( "choose_all_models" in req )) {
        req.choose_first_model = "on"; 
    };
};

// Data structure of iq object for each method
// obj = { "data" : [plot_calc, plot_exp], "layout": {"title": , "xaxis": , "yaxis": } }
// plot_calc = { "x": [array], "y": [array], "error_y"(optional):[array]           } 
// change of x; iq_template.data[0].x = new array
// change of y; iq_template.data[0].y = new array


//Define Iq file suffix w/o and w/t experimental data
/*
  CRYSOL: Not sure of the contents in fit file... need to investigate
  "int" file = A line header(string) + q[1/A], Iq_calc in solution, Iq_calc in vacuo, Iq_solvent, Iq of border layer
  "fit" file = A line header(string) + q, Iq_exp, Some delta, Iq_calc
  FoXS  :
  "dat" file = Two line header(#) + q, Iq, error 
  "fit" file = Three line header(#) + q(from expdata), Iq_exp, error, Iq_calc
  Pepsi-SAXS: 
  "out" file =  A line header(#) + q, Iq_calc, Iat, Iev, Ihs
  "fit" file = A line header(#) + q(expdata), I_exp, dI_exp, Iq_fit
  SASTBX: It requires to read both files if expdata file used.
  "iq" file = A line header(#) + q, Iq_totoal, I_A, I_C, I_B
  "fit" file = A line header(#) + q(expdata), Iq_fit
*/

var plotfiles = {
    "EXPR" : {
        "calc":{
            "filename": "expdatashort"
            ,"header"  : 1    // number of header lines
            ,"contents" : {
                "q" : 1
                ,"Iq": 2 // Second column for Iq
                ,"Iq_error": 3
            }
        }
        ,"fit":{
            "filename": "expdatashort"
            ,"header"  : 1    // number of header lines
            ,"contents" : {
                "q" : 1
                ,"Iq": 2 // Second column for Iq
                ,"Iq_error": 3
            }
        }
        ,"scan":{
            "filename": "expdatashort"
            ,"header"  : 1    // number of header lines
            ,"contents" : {
                "q" : 1
                ,"Iq": 2 // Second column for Iq
                ,"Iq_error": 3
            }
        }
    }
    ,"RAW_EXPR" : {
        "calc":{
            "filename": "raw_expdatashort"
            ,"header"  : 1    // number of header lines
            ,"contents" : {
                "q" : 1
                ,"Iq": 2 // Second column for Iq
                ,"Iq_error": 3
            }
        }
        ,"fit":{
            "filename": "raw_expdatashort"
            ,"header"  : 1    // number of header lines
            ,"contents" : {
                "q" : 1
                ,"Iq": 2 // Second column for Iq
                ,"Iq_error": 3
            }
        }
        ,"scan":{
            "filename": "raw_expdatashort"
            ,"header"  : 1    // number of header lines
            ,"contents" : {
                "q" : 1
                ,"Iq": 2 // Second column for Iq
                ,"Iq_error": 3
            }
        }
    }
    ,"CRYSOL" : {
        "calc":{ 
            "filename": "outfile_CRYSOL_int"
            ,"header"  : 1    // number of header lines
            ,"contents" : {
                "q" : 1
                ,"Iq": 2 // Second column for Iq 
            }
        }
        ,"fit":{
            "filename":  "outfile_CRYSOL_fit"
            ,"header" : 1
            ,"contents" : {
                "q" : 1
                ,"Iq": 4  
                //                             ,"Iq_error": 3 
            }
        }
        ,"scan":{
            "filename":  "outfile_CRYSOL_txt"
            ,"header" : 1
            ,"contents" : {
            }
        }
    }
    ,"FoXS" : {
        "calc":{
            "filename": "outfile_FoXS_dat1"
            ,"header"  : 2
            ,"contents" : {
                "q" : 1
                ,"Iq": 2 
                //                             ,"Iq_error": 3
            }
        }
        ,"fit":{
            "filename":  "outfile_FoXS_fit"
            ,"header" : 3
            ,"contents" : {
                "q" : 1
                ,"Iq": 4
                //                             ,"Iq_error": 3
            }
        }
    }
    ,"Pepsi_SAXS" : {
        "calc":{
            "filename": "outfile_Pepsi_SAXS_out"
            ,"header"  : 1
            ,"contents" : {
                "q" : 1
                ,"Iq": 2
                //                             ,"Iq_error": 3
            }
        }
        ,"fit":{
            "filename":  "outfile_Pepsi_SAXS_fit"
            ,"header" : 1
            ,"contents" : {
                "q" : 1
                ,"Iq": 4
            }
        } 
    }
    ,"SASTBX" : {
        "calc":{
            "filename": "outfile_SASTBX_iq"
            ,"header"  : 1
            ,"contents" : {
                "q" : 1
                ,"Iq": 2
            } 
        }
        ,"fit":{
            "filename":  "outfile_SASTBX_fit"
            ,"header" : 1 
            ,"contents" : {
                "q" : 1
                ,"Iq": 2
            }
        } 
    }
    ,"SasCalc" : {
    }
    ,"WAXSiS" : {
        "calc":{
            "filename": "outfile_WAXSiS_calc"
            ,"header"  : 4
            ,"contents" : {
                "q" : 1
                ,"Iq": 2
                //                             ,"Iq_error": 3
            }
        }
        ,"fit":{
            "filename":  "outfile_WAXSiS_fit"
            ,"header" : 1
            ,"contents" : {
                "q" : 1
                ,"Iq": 2
            }
        }
    }
    ,"SoftWAXS" : {
    }
    ,"AXES" : {
    }

};

var chi2_3d = {
    "CRYSOL"      : {}
    ,"FoXS"       : {}
    ,"Pepsi_SAXS" : {}
    ,"SASTBX"     : {}
    ,"SasCalc"    : {}
    ,"WAXSiS"     : {}
    ,"SoftWAXS"   : {}
    ,"AXES"       : {}
};

var iq_obj = {
    "EXPR"        : {}
    ,"RAW_EXPR"   : {}
    ,"CRYSOL"     : {}
    ,"FoXS"       : {}
    ,"Pepsi_SAXS" : {}
    ,"SASTBX"     : {}
    ,"SasCalc"    : {}
    ,"WAXSiS"     : {}
    ,"SoftWAXS"   : {}
    ,"AXES"       : {}
};  

var iq_obj_residual = { 
    "CRYSOL"      : {}
    ,"FoXS"       : {}
    ,"Pepsi_SAXS" : {}
    ,"SASTBX"     : {}
    ,"SasCalc"    : {}
    ,"WAXSiS"     : {}
    ,"SoftWAXS"   : {}
    ,"AXES"       : {}
}

var color_table = {
    "EXPR": "rgb(0,0,0)" //black 
    ,"RAW_EXPR": "rgb(0,0,0)" //black
    ,"CRYSOL": "rgb(148,0,211)" //Violet
    ,"FoXS" : "rgb(255,0,0)" //red
    ,"Pepsi_SAXS" : "rgb(0,0,255)" //blue
    ,"SASTBX" : "rgb(0,255,255)" // cyan
    ,"SasCalc" : "rgb(0,255,0)" // green
    ,"WAXSiS" : "rgb(255,127,0)" // orange
    ,"SoftWAXS" : "rgb(75,0,130)" // indigo
    ,"AXES"     : "rgb(192,192,192)" // gray

}
var trace_marker =    {
    "x":
    []
    ,"y":
    []
    ,"error_y": {
        "array": []
        ,"visible":"false"
        ,"color": "rgb(0, 0, 0)"
        ,"thickness": 1.2
        ,"width": 5.5
        ,"opacity": 1
    }
    ,"name" : "Marker"
    ,"mode" : "markers"
    ,"marker" : {
        color: "rgb(17, 157, 255)"
        ,size:5 
        ,line: {
            color: "rgb(0, 0, 0)"
            ,width: 1
        }
    }
};

var trace_linemarker = {
    "x":
    []
    ,"y":
    []
    ,"error_y": {
        "array": []
        ,"visible":"false"
    }
    ,"name": "Line + Markers"
    ,"mode" : "lines+markers"
    ,"marker" : {
        "color" : "rgb(0, 0, 0)"
        ,"size": 8
    }
    ,"line" : {
        "color" : "rgb(0, 0, 0)"
        ,"width" : 5
    }
};

var trace_line =  {
    "x":
    []
    ,"y":
    []
    ,"error_y": {
        "array": []
        ,"visible":false
    }
    ,"xaxis": "x"
    ,"yaxis": "y"
    //                ,"legendgroup" : ""
    ,"name" : "Lines"
    ,"mode" : "lines"
    ,"line" : {
        "color" : "rgb(0, 0, 0)"
        ,"width" : 5 
    }
    ,"showlegend": true 
};

var sub_tracebar =  { 
    "x":
    []
    ,"y":
    []
    ,"text": []
    ,"textfont": {
        "color": "#ffffff"    
    } 
    ,"textposition": "auto"
    
    ,"error_y": {
        "array": []
        ,"visible":false
    }
    ,"xaxis": "x2"
    ,"yaxis": "y2"
    ,"type" : "bar"
    ,"bargap" : 1.5
};

var samplelayout = {
    "data"    :[]
    ,"layout" : {
        "title"  : "Place holder for Plotly, not real data!!!! "
        ,"xaxis" : {
            //                  "type": "log"
            "title"     : "q[\u212B<sup>-1</sup>]"
            //                  "title": "&Mu;"
            ,"autorange": "true"
        }
        ,"yaxis" : {
            "type"     : "log"
            ,"title"    : "Iq[A.U]"
            //                  ,"range": [-3.9,0.5]
            ,"autorange": "true"
        }
        ,"shapes" : [ 
            {
                "type"     : "rect"
                ,"xref"     : "x"
                ,"yref"     : "paper"
                ,"x0"       : 0
                ,"x1"       : 0.5
                ,"y0"       : 0
                ,"y1"       : 1
                ,"fillcolor": '#d3d3d3'
                ,"opacity"  : 0.5
                ,"line"     : {
                    "width" : 0
                }  
            }
        ]
    }
};

var sub_layout = {
    "data" :[]
    ,"layout" : {
        "title" : "Place holder for Plotly, not real data!!!! "
        ,"legend": {
            "x": 0.87
            ,"y": 1.0 
            //                   ,"orientation": "h"
        }
        ,"xaxis" : {
            //                  "type": "log",
            "title": "q[\u212B<sup>-1</sup>]"
            //                  "title": "q[1/Å]"
            ,"autorange": "true"
            ,"domain": [0, 0.55]
        }
        ,"yaxis" : {
            "type": "log"
            ,"title": "Iq[A.U]"
            //                  ,"range": [-3.9,0.5]
            ,"autorange": "true"
            ,"domain": [0.0, 0.5]
        }
        ,"xaxis2" : {
            "domain": [0.60, 0.85]
        }
        ,"yaxis2" : {
            "anchor": "x2"
            ,"title": "Reduced chi-square"
        }
        ,"xaxis3" : {
            "domain": [0.0, 0.55]
            ,"autorange": "true"
            ,"title": "q[\u212B<sup>-1</sup>]"
        }
        ,"yaxis3" : {
            "anchor": "x3"
            ,"title": "(Icalc -Iexp)/Iexp_error"
            ,"titlefont": {
                "size": 12 
            } 
            ,"domain": [0.7, 1.2]
        }
        ,"shapes" : [
            {
                "type"     : "rect"
                ,"xref"     : "x"
                ,"yref"     : "paper"
                ,"x0"       : 0
                ,"x1"       : 0.5
                ,"y0"       : 0
                ,"y1"       : 1
                ,"fillcolor": '#d3d3d3'
                ,"opacity"  : 0.5
                ,"line"     : {
                    "width" : 0
                }
            }
        ]
    }
};

var iq_template =  { 
    "data" : [
        {
            "x": 
            ["0.0001", "1", "10", "100"]
            ,"y": 
            [1, 0.1, 0.01, 0.001]
            ,"error_y": {
                "array": [0, 0.07, 0.007, 0.0007]
                ,"visible":"true"
            }
            ,"mode" : "lines+markers"
            ,"marker" : {
                "color" : "rgb(128, 0, 128)"
                ,"size": 8
            }
            ,"line" : {
                "color" : "rgb(128, 0, 128)"
                ,"width": 5
            }
        }
    ],
    "layout" : {
        "title" : "Place holder for Plotly, not real data!!!! "
        ,"xaxis" : {
            "type": "log"
            ,"title": "q"
        }
        ,"yaxis" : {
            "type": "log"
            ,"title": "Iq"
            ,"range": [-3.9,0.5]
            ,"autorange": "false"
        }
    }
};

var plot3d_template = {
    "data" : [
        //            {
        //             "z": [0]
        //            ,"x": [0]
        //            ,"y": [0]
        //            ,"type": "contour"
        //            ,"xaxis": "x1"
        //            ,"yaxis": "y1"
        //            }
    ]
    ,"layout": {
        "title": "Chi scan from CRYSOL"
    }
};

var angular_units = {
    "CRYSOL" : { "0" : "0", "1" : "1", "2" : "2", "3" : "3", "4" : "4" } 
    ,"FoXS"  : { "0" : "1", "1" : "2", "2" : "3", "3" : "2", "4" : "3" } 
    ,"Pepsi_SAXS" : { "0" : "0", "1" : "1", "2" : "2", "3" : "3", "4" : "4" }
    ,"WAXSiS"  : { "0" : "-curve_q_unit A -scatt_convention q", "1" : "-curve_q_unit A -scatt_convention q", "2" : "-curve_q_unit nm -scatt_convention q", "3" : "-curve_q_unit A -scatt_convention s", "4" : "-curve_q_unit A -scatt_convention s" }
    /* Place holder for future 
       ,"SASTBX"  : [0,1,2,3,4]
       ,"SasCalc" : [0,1,2,3,4]
       ,"SoftWAXS" : [0,1,2,3,4]
       ,"AXES"  : [0,1,2,3,4]
    */
};

var table = {
    "CRYSOL" :
    {
        "executable" : "crysol_scanner"
        //             ,"scanner" : "crysol_scanner.js"
        ,"input" : {
            "runname" : {
                "type" : "text"
                ,"required" : "true"
            } 
            ,"pdb" :    { 
                "type" : "file"
                ,"number_of_files" : 1
                ,"required" : "true"
            }
            ,"experimental_curve" : {
                "type" : "file"
                ,"number_of_files" : 1000000 
                ,"required" : "optional"
            }
        }

        ,"output": 
        {
            "stderr" : {   
                "role"   : "output"
                ,"id"    : "output_crysol_stderr"
                ,"type" : "file"
                ,"label" : "CRYSOL stderr file"
            }
            ,"stdout" : {   
                "role"   : "output"
                ,"id"    : "output_crysol_stdout"
                ,"type" : "file"
                ,"label" : "CRYSOL stdout file."                
            }
            ,"sav" : {
                "role"   : "output"
                ,"id"    : "output_crysol_sav"
                ,"label" : "CRYSOL output containing the amplitudes among other necessary information to evaluate the intensities curves"
                ,"type" : "file"
            }
            ,"log" : {
                "role"   : "output"
                ,"id"    : "output_crysol_log"
                ,"type" : "file"
                ,"label" : "CRYSOL output containing the screen output and the detailed warning messages."
            }
            ,"flm" : {
                "role"   : "output"
                ,"id"    : "output_crysol_flm"
                ,"type" : "file"
                ,"label" : "CRYSOL output Containing the multipole coefficients Flm which describe the particle envelope."
            }
            ,"int" : {
                "role"   : "output"
                ,"id"    : "output_crysol_int"
                ,"type" : "file"
                ,"label" : "CRYSOL output with Scattering profiles"
            }
            ,"fit" : {
                "role"   : "output"
                ,"id"    : "output_crysol_fit"
                ,"type" : "file"
                ,"label" : "Contains the fit to the experimental data in inverse angstroms."
            }

            ,"alm" : {
                "role"   : "output"
                ,"id"    : "output_crysol_alm"
                ,"type" : "file"
                ,"label" : "Sum of the scattering amplitudes for atoms, excluded volume and border for rigid body modelling later "
            }
            ,"zip" : {
                "role"   : "output"
                ,"id"    : "output_crysol_zip"
                ,"type" : "file"
                ,"label" : "zip file containg csv files of chi^2 from Scan mode run"
            }
            ,"scan" : {
                "role"   : "output"
                ,"id"    : "output_crysol_scan"
                ,"type" : "file"
                ,"label" : "use only for chi^2 3d or contour plots"
            }
        } 

        ,"options" : 
        {
            //                     "choose_all_models" : {
            //                          "prefix_full" : {} 
            //                          ,"prefix_short" : {}
            //                          ,"type" : "integer"
            //                          ,"info" : "Choose all MODELS if multi-frame PDB given"
            //                          }
            "choose_first_model" : {
                "prefix_full" : " -nmr 1"
                ,"prefix_short" : " -nmr 1"
                ,"type" : "checkbox"
                ,"info" : "Choose first model only"
            }
            ,"qmax" : {
                "prefix_full" : "-sm"
                ,"prefix_short" : "-sm"
                ,"type" : "float"
                ,"info" : "Maximum scattering vector in inverse angstroms (max = 1.0 A^-1)"
            }
            ,"number_of_points" : {
                "prefix_full" : "-ns"
                ,"prefix_short" : "-ns"
                ,"type" : "integer"
                ,"info" : "Number of points in the theoretical curve (max = 5000)"
            }
            ,"angular_units" : {
                "prefix_full" : "-un"
                ,"prefix_short" : "-un"
                ,"type" : "listbox"
                ,"min" : 1
                ,"max" : 4
                ,"default" : 1
                ,"info" : "Rewrite here "
            }
            ,"constant_subtractions" : {
                "prefix_full" : "-cst"
                ,"prefix_short" : "-cst"
                ,"type" : "checkbox"
                ,"info" : "Constant subtraction. No value is required"
            }
            ,"explicit_hydrogen" : {
                "prefix_full" : "-eh"
                ,"prefix_short" : "-eh"
                ,"type" : "checkbox"
                ,"info" : "Account for explicit hydrogens. No value is required."
            }
            ,"maxharmonics" : {
                "prefix_full" : "-lm"
                ,"prefix_short" : "-lm"
                ,"type" : "integer"
                ,"min" : 1
                ,"default" : 15
                ,"max" : 50 
                ,"info" : "Maximum number of harmonics "
            }
            ,"fibonacci_grid" : {
                "prefix_full" : "-fb"
                ,"prefix_short" : "-fb"
                ,"type" : "integer"
                ,"min" : 10
                ,"default" : 17
                ,"max" : 18
                ,"info" : "Order of Fibonacci grid "
            }
            ,"solvation_density" : {
                "prefix_full" : "-dns"
                ,"prefix_short" : "-dns"
                ,"type" : "float"
                ,"info" : "Solvent density (e/A^3). Default value is the electron density of pure water."
            }
            ,"optional_outputs" : {
                "prefix_full" : "-kp"
                ,"prefix_short" : "-kp"
                ,"type" : "checkbox"
                ,"info" : "Creates optional output files. No value is required"
            }
            ,"write_error" : {
                "prefix_full" : "-err"
                ,"prefix_short" : "-err"
                ,"type" : "checkbox"
                ,"info" : "Write experimental errors to the .fit file (Y or N)."
            }
            ,"read_old_pdb" : {
                "prefix_full" : "-old"
                ,"prefix_short" : "-old"
                ,"type" : "checkbox"
                ,"info" : "Read a PDB file with an old atom naming (pre 2008). No value is required."
            }
            //                      ,"select_conformers" : {
            //                          "prefix_full" : "-nmr"
            //                          ,"prefix_short" : "-nmr"
            //                          ,"type" : "integer"
            //                          ,"info" : "Sequential number of a model or an NMR conformer to process."
            //                          }
            ,"chain_id" : {
                "prefix_full" : "-cid"
                ,"prefix_short" : "-cid"
                ,"type" : "character"
                ,"info" : "Compute theoretical scattering only for certain chain identifier(s)."
            }
            ,"contrast_hydration" : {
                "prefix_full" : "-dro"
                ,"prefix_short" : "-dro"
                ,"type" : "float"
                ,"unit" : "[ e/Angstrom^3 ]"
                ,"info" : "Contrast of hydration shell (e/A^3)"
            }
            ,"scan_contrast_hydration_low" : {
                "prefix_full" : ""
                ,"prefix_short" : ""
                ,"type" : "float"
                ,"info" : "low value of Contrast of hydration shell (e/A^3)"
            }
            ,"contrast_hydration_high" : {
                "prefix_full" : ""
                ,"prefix_short" : ""
                ,"type" : "float"
                ,"info" : "high value of Contrast of hydration shell (e/A^3)"
            }
            ,"contrast_hydration_points" : {
                "prefix_full" : ""
                ,"prefix_short" : ""
                ,"type" : "float"
                ,"info" : "# of points to scan Contrast of hydration shell (e/A^3)"
            }
            ,"contrast_hydration_interval" : {
                "prefix_full" : ""
                ,"prefix_short" : ""
                ,"type" : "float"
                ,"info" : "interval to scan Contrast of hydration shell (e/A^3)"
            }
            ,"atomic_radius" : {
                "prefix_full" : ""
                ,"prefix_short" : ""
                ,"type" : "float"
                ,"unit" : "[ Angstrom ]"
                ,"info" : "atomic radius (A)"
            }
            ,"scan_atomic_radius_low" : {
                "prefix_full" : ""
                ,"prefix_short" : ""
                ,"type" : "float"
                ,"info" : "low value of atomic radius(A)"
            }
            ,"atomic_radius_high" : {
                "prefix_full" : ""
                ,"prefix_short" : ""
                ,"type" : "float"
                ,"info" : "high value of atomic radius"
            }
            ,"atomic_radius_points" : {
                "prefix_full" : ""
                ,"prefix_short" : ""
                ,"type" : "float"
                ,"info" : "# of points to scan atomic radius"
            }
            ,"atomic_radius_interval" : {
                "prefix_full" : ""
                ,"prefix_short" : ""
                ,"type" : "float"
                ,"info" : "interval to scan atomic radius"
            }
            ,"excluded_volume" : {
                "prefix_full" : ""
                ,"prefix_short" : ""
                ,"type" : "float"
                ,"unit" : "[ Angstrom^3 ]"
                ,"info" : "excluded_volume (A^3)"
            }
            ,"scan_excluded_volume_low" : {
                "prefix_full" : ""
                ,"prefix_short" : ""
                ,"type" : "float"
                ,"info" : "low value of excluded volume(A^3)"
            }
            ,"excluded_volume_high" : {
                "prefix_full" : ""
                ,"prefix_short" : ""
                ,"type" : "float"
                ,"info" : "high value of excluded volume(A^3)"
            }
            ,"excluded_volume_points" : {
                "prefix_full" : ""
                ,"prefix_short" : ""
                ,"type" : "float"
                ,"info" : "# of points to scan excluded volume"
            }
            ,"excluded_volume_interval" : {
                "prefix_full" : ""
                ,"prefix_short" : ""
                ,"type" : "float"
                ,"info" : "interval to scan excluded volume"
            }
        }
        ,"scan" :
        {
            "contrast_hydration_mode" : {
                "prefix_full" : "-dro"
                ,"prefix_short" : "-dro"
                ,"type" : "float"
                ,"unit" : "[ e/Angstrom^3 ]"
                ,"info" : "Contrast of hydration shell (e/A^3)"
            }
            ,"atomic_radius_mode" : {
                "prefix_full" : ""
                ,"prefix_short" : ""
                ,"type" : "float"
                ,"unit" : "[ Angstrom ]"
                ,"info" : "atomic radius (A)"
            }
            ,"excluded_volume_mode" : {
                "prefix_full" : ""
                ,"prefix_short" : ""
                ,"type" : "float"
                ,"unit" : "[ Angstrom^3 ]"
                ,"info" : "excluded_volume (A^3)"
            }

            ,"nscans" : 0
            
        }
    }

    ,"FoXS" : 
    { 
        "executable" : "foxs"
        //           ,"scanner" : "foxs_scanner"
        ,"input" : 
        {
            "pdb"  : { 
                "type" : "file"
                ,"number_of_files" : "unlimited"
                ,"required" : "true"
            }
            ,"experimental_curve" : {
                "type" : "file"
                ,"number_of_files" : "unlimited"
                ,"required" : "true"
            }
        }
        ,"output" :
        {
            "stderr" : {
                "role"   : "output"
                ,"id"    : "output_FoXS_stderr"
                ,"type" : "file"
                ,"label" : "FoXS stderr file"
            }
            ,"stdout" : {
                "role"   : "output"
                ,"id"    : "output_FoXS_stdout"
                ,"type" : "file"
                ,"label" : "FoXS stdout file."                                                
            }
            ,"fit" : {
                "role"   : "output"
                ,"id"    : "output_FoXS_fit"
                ,"type" : "file"
                ,"label" : "Contains the fit to the experimental data in inverse angstroms."
            }
            ,"dat1" : {
                "role"   : "output"
                ,"id"    : "output_FoXS_dat1"
                ,"type" : "file"
                ,"label" : "Contains the prediction from input pdb "
            }
            ,"dat2" : {
                "role"   : "output"
                ,"id"    : "output_FoXS_dat2"
                ,"type" : "file"
                ,"label" : "Contains the intensities"
            }
        }
        ,"options" :
        {
            "choose_all_models" : {
                "prefix_full" : "-m 3"
                ,"prefix_short" : "-m 3"
                ,"type" : "checkbox"
                ,"info" : "Choose all MODELS if multi-frame PDB given"
            }
            ,"choose_first_model" : {
                "prefix_full" : "-m 1 "
                ,"prefix_short" : "-m 1 "
                ,"type" : "checkbox"
                ,"info" : "Choose first model only"
            }
            ,"qmax"  : {
                "prefix_full" : "--max_q"
                ,"prefix_short" : "-q"
                ,"type" : "float"
                ,"default" : 0.5
                ,"info" : "In inverse Angstroms"
            }
            ,"number_of_points"  : {
                "prefix_full" : "--profile_size"
                ,"prefix_short" : "-s"
                ,"type" : "integer"
                ,"default" : 500 
                ,"info" : "Number of points in the scattering curve (only applicable if experimental data is not provided)"
            }
            ,"angular_units"  : {
                "prefix_full" : "--units"
                ,"prefix_short" : "-u"
                ,"type" : "listbox"
                ,"default" : 1
                ,"info" : "1 - unknown --> determine automatically (default), 2 - q values are in 1/A, 3 - q values are in 1/nm"
            }
            ,"constant_subtractions_FoXS" : {
                "prefix_full" : "--background_q"
                ,"prefix_short" : "-b"
                ,"type" : "float"
                ,"default" : 0
                ,"info" : "background adjustment, not used by default. if enabled, recommended q value is 0.2"
            }
            ,"explicit_hydrogen"  : {
                "prefix_full" : "--hydrogens"
                ,"prefix_short" : "-h"
                ,"type" : "checkbox"
                ,"info" : "explicitly consider hydrogens in PDB files"
            }
            ,"min_c1"  : {
                "prefix_full" : "--min_c1"
                ,"prefix_short" : "--min_c1"
                ,"type" : "float"
                ,"default" : 0.99 
                ,"info" : "min c1 value"
            }
            ,"max_c1"  : {
                "prefix_full" : "--max_c1"
                ,"prefix_short" : "--max_c1"
                ,"type" : "float"
                ,"default" : 1.05    
                ,"info" : "max c1 value"
            }
            ,"min_c2"  : {
                "prefix_full" : "--min_c2"
                ,"prefix_short" : "--min_c2"
                ,"type" : "float"
                ,"default" : -2.00    
                ,"info" : "min c2 value"
            }
            ,"max_c2"  : {
                "prefix_full" : "--max_c2"
                ,"prefix_short" : "--max_c2"
                ,"type" : "float"
                ,"default" : 4.00    
                ,"info" : "max c2 value"
            }
            ,"fast_ca"  : {
                "prefix_full" : "--residues"
                ,"prefix_short" : "-r"
                ,"type" : "checkbox"
                ,"info" : "fast coarse grained calculation using CA atoms only"
            }
            ,"offset_FoXS"  : {
                "prefix_full" : "--offset"
                ,"prefix_short" : "--offset"
                ,"type" : "checkbox"
                ,"info" : "use offset in fitting"
            }
            ,"partial_profile"  : {
                "prefix_full" : "--write-partial-profile"
                ,"prefix_short" : "-p"
                ,"type" : "checkbox"
                ,"info" : "write partial profile file"
            }
            ,"multi_model_pdb_FoXS"  : {
                "prefix_full" : "--multi-model-pdb"
                ,"prefix_short" : "-m"
                ,"type" : "integer"
                ,"default" : 1
                ,"info" : "1 - read the first MODEL only (default), 2 - read each MODEL into a separate, structure, 3 - read all models into a single structure"
            }
            ,"volatility_ratio"  : {
                "prefix_full" : "--volatility_ratio"
                ,"prefix_short" : "-v"
                ,"type" : "checkbox"
                ,"info" : "calculate volatility ratio score"
            }

            ,"score_log"  : {
                "prefix_full" : "--score_log"
                ,"prefix_short" : "-l"
                ,"type" : "checkbox"
                ,"info" : "use log(intensity) in fitting and scoring"
            }

            ,"gnuplot_script"  : {
                "prefix_full" : "--gnuplot_script"
                ,"prefix_short" : "-g"
                ,"type" : "checkbox"
                ,"info" : "print gnuplot script for gnuplot viewing"
            }

            ,"version"  : {
                "prefix_full" : "--version"
                ,"prefix_short" : "--version"
                ,"type" : "checkbox"
                ,"info" : "Version info"
            }
        }
        ,"scan" :
        {
            "nscans" : 0
        }
    }

    ,"Pepsi_SAXS" :
    {
        "executable" : "pepsisaxs"
        //           ,"scanner" : "pepsisaxs_scanner"
        ,"input" :
        {
            "pdb"  : {
                "type" : "file"
                ,"number_of_files" : 1
                ,"required" : "true"
            }
            ,"experimental_curve" : {
                "type" : "file"
                ,"number_of_files" : 1 
                ,"required" : "true"
            }
        }
        ,"output" :
        {
            "stderr" : {
                "role"   : "output"
                ,"id"    : "output_Pepsi_SAXS_stderr"
                ,"type" : "file"
                ,"label" : "FoXS stderr file"
            }
            ,"stdout" : {
                "role"   : "output"
                ,"id"    : "output_Pepsi_SAXS_stdout"
                ,"type" : "file"
                ,"label" : "FoXS stdout file."  
            }
            ,"log" : {
                "role"   : "output"
                ,"id"    : "output_Pepsi_SAXS_log"
                ,"type" : "file"
                ,"label" : "Pepsi-Saxs output Containing the screen output and the detailed warning messages."
            }
            ,"fit" : {
                "role"   : "output"
                ,"id"    : "output_Pepsi_SAXS_fit"
                ,"type" : "file"
                ,"label" : "Pepsi-Saxs output Containing the fit to the experimental data in inverse angstroms."
            }
            ,"out" : {
                "role"   : "output"
                ,"id"    : "output_Pepsi_SAXS_out"
                ,"type" : "file"
                ,"label" : "Pepsi-Saxs output Containing the predicted model."
            }
        }
        ,"options" :
        {
            "qmax"  : {
                "prefix_full" : "--maximum_scattering_vector"
                ,"prefix_short" : "-ms"
                ,"type" : "float"
                ,"max" : 1.0
                ,"default" : 0.5
                ,"min" : 0.01
                ,"info" : "In inverse Angstroms (max = 1.0 {A^-1}) (only applicable if experimental data is not provided.)"
            }
            ,"number_of_points"  : {
                "prefix_full" : "--number_of_points"
                ,"prefix_short" : "-ns"
                ,"type" : "integer"
                ,"max" : 5000
                ,"default" : 101
                ,"min" : 10
                ,"info" : "Number of points in the scattering curve (only applicable if experimental data is not provided), default 101, max 5000"
            }
            ,"angular_units"  : {
                "prefix_full" : "--angular_units"
                ,"prefix_short" : "-au"
                ,"type" : "listbox"
                ,"info" : "Same with crysol. Default is chosen automatically."
            }
            ,"constant_subtractions" : {
                "prefix_full" : "--cst"
                ,"prefix_short" : "-cst"
                ,"type" : "checkbox"
                ,"info" : "Substract a constant factor if experimental data contains a systematic error"
            }
            ,"explicit_hydrogen"  : {
                "prefix_full" : "--hyd"
                ,"prefix_short" : "-hyd"
                ,"type" : "checkbox"
                ,"info" : "Using explicit hydrogens, not recommended for standard residues"
            }
            ,"output_path"  : {
                "prefix_full" : "--output"
                ,"prefix_short" : "-o"
                ,"type" : "character"
                ,"info" : "Output scattering curve path"
            }
            ,"expansion_order"  : {
                "prefix_full" : "--nCoeff"
                ,"prefix_short" : "-n"
                ,"type" : "integer"
                ,"info" : "Number of coefficients in the expansion order of spherical harmonics"
            }
            ,"log_json"  : {
                "prefix_full" : "--json"
                ,"prefix_short" : "-json"
                ,"type" : "checkbox"
                ,"info" : "Output the log file in the JSON format"
            }
            ,"negative_contrast"  : {
                "prefix_full" : "--neg"
                ,"prefix_short" : "-neg"
                ,"type" : "checkbox"
                ,"info" : "Allowing negative contrast of the hydration shell upon fitting"
            }
            ,"fast_hydration"  : {
                "prefix_full" : "--fast"
                ,"prefix_short" : "-fast"
                ,"type" : "checkbox"
                ,"info" : "A coarser representation of the hydration shell"
            }
            ,"no_smearing"  : {
                "prefix_full" : "--noSmearing"
                ,"prefix_short" : "--noSmearing"
                ,"type" : "checkbox"
                ,"info" : "Disables the data smearing"
            }
            ,"dro"  : {
                "prefix_full" : "--dro"
                ,"prefix_short" : "--dro"
                ,"type" : "float"
                ,"default" : 5
                ,"info" : "Hydration shell contrast (in % of the bulk value), default is 5%."
            }
            ,"fluc"  : {
                "prefix_full" : "--fluc"
                ,"prefix_short" : "--fluc"
                ,"type" : "checkbox"
                ,"info" : "Enable fluctuations"
            }
            ,"modes"  : {
                "prefix_full" : "--modes"
                ,"prefix_short" : "--modes"
                ,"type" : "integer"
                ,"min"        : 5
                ,"default"    : 5
                ,"max"        : 75
                ,"info" : "Number of low frequency modes"
            }
            ,"cov_scaling"  : {
                "prefix_full" : "--covScaling"
                ,"prefix_short" : "--covScaling"
                ,"type" : "float"
                ,"default" : 1
                ,"info" : "Scaling of covalent interactions"
            }
            ,"cutoff"  : {
                "prefix_full" : "--cutoff"
                ,"prefix_short" : "-c"
                ,"type" : "float"
                ,"default" : 5
                ,"info" : "Interactions cutoff distance in angstroms, 5 by default"
            }
            ,"display_log"  : {
                "prefix_full" : "--changelog"
                ,"prefix_short" : "-log"
                ,"type" : "none"
                ,"info" : "Displays ChangeLog information and exits."
            }
            ,"version"  : {
                "prefix_full" : "--version"
                ,"prefix_short" : "--version"
                ,"type" : "none"
                ,"info" : "Displays version information and exits"
            }
        }
        ,"scan" :
        {       
            "nscans" : 0
        }
    }
    ,"SASTBX" :
    {
        "executable" : "sastbx"
        //           ,"docker"    : ""
        ,"input" :
        {
            "pdb" : {
                "type" : "file"
                ,"number_of_files" : 1
                ,"required" : "true"
            }
            ,"experimental_curve" : {
                "type" : "file"
                ,"number_of_files" : 1000000
                ,"required" : "false"
            }
            ,"pdblist" : {
                "type" : "file"
                ,"number_of_files" : 1
                ,"required" : "false"
            }
        }
        ,"output" :
        {
            "stderr" : {
                "role"   : "output"
                ,"id"    : "output_SASTBX_stderr"
                ,"type" : "file"
                ,"label" : "SASTBX stderr file"
            }
            ,"stdout" : {
                "role"   : "output"
                ,"id"    : "output_SASTBX_stdout"
                ,"type" : "file"
                ,"label" : "SASTBX stdout file."
            }
            ,"iq" : {
                "role"   : "output"
                ,"id"    : "output_SASTBX_iq"
                ,"type" : "file"
                ,"label" : "SASTBX output I(q) file from input pdb by Debye model."
            }
            ,"json" : {
                "role"   : "output"
                ,"id"    : "output_SASTBX_json"
                ,"type" : "file"
                ,"label" : "SASTBX output I(q) file (JSON format)."
            }
            ,"fit" : {
                "role"   : "output"
                ,"id"    : "output_SASTBX_fit"
                ,"type" : "file"
                ,"label" : "SASTBX output I(q) file containing the fit to the experimental data"
            }
        }
        ,"options" :
        {
            "qmax"  : {
                "prefix_full" : "q_stop="
                ,"prefix_short" : "q_stop="
                ,"type" : "float"
                ,"default" : 0.5 
                ,"info" : "Maximum q"
            }
            ,"qmin"  : {
                "prefix_full" : "q_start="
                ,"prefix_short" : "q_start="
                ,"type" : "float"
                ,"default" : 0.0
                ,"info" : "minimum q"
            }
            ,"number_of_points" : {
                "prefix_full" : "n_step="
                ,"prefix_short" : "n_step="
                ,"type" : "integer"
                ,"default" : 51
                ,"info" : "Number of points in the theoretical curve"
            }

        }
        ,"scan" :
        {       
            "nscans" : 0

        }
    } 
    ,"sascalc_hub" :
    {
        "executable" : "sascalc_hub"
        //           ,"docker"    : ""
        ,"input" :
        {

        }
        ,"output" :
        {
            "stderr" : {
                "role"   : "output"
                ,"id"    : "output_sascalc_hub_stderr"
                ,"type" : "file"
                ,"label" : "SasCalc stderr file"
            }
            ,"stdout" : {
                "role"   : "output"
                ,"id"    : "output_sascalc_hub_stdout"
                ,"type" : "file"
                ,"label" : "SasCalc stdout file."  
            }
        }
        ,"options" :
        {

        }
        ,"scan" :
        {       
            "nscans" : 0
        }
    }
    
    ,"WAXSiS" :
    {
        "executable" : "waxsis"
        //         put docker image
        //           ,"docker"    : "genapp_alphamultisaxshub:Calculations-waxsis"
        ,"docker"    : "genapp_alphamultisaxshub:Calculations-waxsis_0827_2"
        ,"vprefix"   : "/genappdata/container_mounts/sas/rundata/multisaxshubdev/"
        ,"input" :
        {
            "pdb"  : {
                "type" : "file"
                ,"number_of_files" : 1
                ,"required" : "true"
            }
            ,"experimental_curve" : {
                "type" : "file"
                ,"number_of_files" : 1
                ,"required" : "true"
            }
        }
        ,"output" :
        {
            "stderr" : {
                "role"   : "output"
                ,"id"    : "output_WAXSiS_stderr"
                ,"type" : "file"
                ,"label" : "WAXSiS stderr file"
            }
            ,"stdout" : {
                "role"   : "output"
                ,"id"    : "output_WAXSiS_stdout"
                ,"type" : "file"
                ,"label" : "WAXSiS stdout file." 
            } 
            ,"log" : {
                "role"   : "output"
                ,"id"    : "output_WAXSiS_log"
                ,"type" : "file"
                ,"label" : "WAXSiS output Containing the screen output and the detailed warning messages."
            }
            ,"fit" : {
                "role"   : "output"
                ,"id"    : "output_WAXSiS_fit"
                ,"type" : "file"
                ,"label" : "WAXSiS output Containing the fit to the experimental data in inverse angstroms."
            }
            ,"calc" : {
                "role"   : "output"
                ,"id"    : "output_WAXSiS_calc"
                ,"type" : "file"
                ,"label" : "WAXSiS output Containing the predicted model."
            }
        }
        ,"options" :
        {
            "qmax"  : {
                "prefix_full" : "-q"
                ,"prefix_short" : "-q"
                ,"type" : "float"
                ,"default" : 0.5
                ,"info" : "Maximum q"
            }
            ,"number_of_points" : {
                "prefix_full" : "-nq"
                ,"prefix_short" : "-nq"
                ,"type" : "integer"
                ,"default" : 501
                ,"info" : "Number of points in the theoretical curve"
            }
            ,"angular_units" : {
                "prefix_full" : " "
                ,"prefix_short" : " "
                ,"type" : "listbox"
                ,"min" : 1
                ,"max" : 4
                ,"default" : 1
                ,"info" : "Rewrite here "
            }
            ,"constant_subtractions" : {
                "prefix_full" : "-constant_subtractions yes"
                ,"prefix_short" : "-constant_subtractions yes"
                ,"type" : "checkbox"
                ,"info" : "Constant subtraction during fitting "
            }
            ,"buffer_subtractions" : {
                "prefix_full" : "-buffer_subtract"
                ,"prefix_short" : "-buffer_subtract"
                ,"type" : "listbox"
                ,"default" : 1
                ,"min": 1
                ,"max": 2
                ,"info" : "Buffer subtraction, 1 = Total buffer scattering subtracted, 2 = Buffer scattering reduced by solute volume"
            }
            ,"ligands" : {
                "prefix_full" : "-ligand"
                ,"prefix_short" : "-ligand"
                ,"type" : "listbox"
                ,"min" : 1
                ,"max" : 3
                ,"default" : 1
                ,"info" : "1 = Keep ligands, try to remove crystallization agents, 2 = Keep both ligands and crystallization agents , 3= Remove all "
            }
            //                         1 = remove_cryst_agents; Keep ligands, try to remove crystallization agents
            //                         2 = keep_all; Keep both ligands and crystallization agents
            //                         3 = remove_all; removed all ligands (that is, HETATM lines), but kept crystal water 
            ,"replace_selen" : {
                "prefix_full" : "-replace_selen"
                ,"prefix_short" : "-replace_selen"
                ,"type" :"listbox"
                ,"min" : 1
                ,"max" : 2
                ,"default" : 1       
                ,"info" : "1 ~ yes: Replace selenomethionine with methionine, 2 ~ no: Do not replace"
            }
            ,"convergence" : {
                "prefix_full" : "-convergence"
                ,"prefix_short" : "-convergence"
                ,"type" : "listbox"
                ,"min" : 1
                ,"max" : 3
                ,"default" : 2
                ,"info" : "1 = Quick, 2 = Normal , 3 = Thorough "
            }
            ,"solvent_density"  : {
                "prefix_full" : "-solvent_density"
                ,"prefix_short" : "-solvent_density"
                ,"type" : "float"
                ,"default" : 0.334
                ,"min": 0.100 
                ,"max": 0.500
                ,"info" : "specify the solvent density( e/A^3 ) : Note the unit in WAXSiS server is e/nm^3. Code need to be changed"
            }
            ,"envelope_dist"  : {
                "prefix_full" : "-envelope_dist"
                ,"prefix_short" : "-envelope_dist"
                ,"type" : "float"
                ,"default" : 7.0
                ,"min": 3.0
                ,"max": 8.0
                ,"info" : "Specify the envelope distance ( Å )"
            }
            ,"random_seed"  : {
                "prefix_full" : "-random_seed"
                ,"prefix_short" : "-random_seed"
                ,"type" : "listbox"
                ,"min" : 1
                ,"max" : 2
                ,"default" : 1
                ,"info" : "1 ~ yes: Use new random seed for initial velocities then results vary slightly. 2 ~  no: results are reproducible"
            }

        }
        ,"scan" :
        {   
            "nscans" : 0
        }
    }
    
    ,"SoftWAXS" :
    {
        "executable" : "softwaxs"
        //           ,"docker"    : ""
        ,"input" :
        {

        }
        ,"output" :
        {
            "stderr" : {
                "role"   : "output"
                ,"id"    : "output_SoftWAXS_stderr"
                ,"type" : "file"
                ,"label" : "SoftWAXS stderr file"
            }
            ,"stdout" : {
                "role"   : "output"
                ,"id"    : "output_SoftWAXS_stdout"
                ,"type" : "file"
                ,"label" : "SoftWAXS stdout file."  
            }
        }
        ,"options" :
        {

        }
        ,"scan" :
        {   
            "nscans" : 0
        }
    }
    
    ,"AXES" :
    {
        "executable" : "axes"
        //           ,"docker"    : ""
        ,"input" :
        {

        }
        ,"output" :
        {
            "stderr" : {
                "role"   : "output"
                ,"id"    : "output_AXES_stderr"
                ,"type" : "file"
                ,"label" : "AXES stderr file"
            }
            ,"stdout" : {
                "role"   : "output"
                ,"id"    : "output_AXES_stdout"
                ,"type" : "file"
                ,"label" : "AXES stdout file."  
            }
        }
        ,"options" :
        {

        }
        ,"scan" :
        {   
            "nscans" : 0
        }
    }

};             

var cmds = {};   // exec <options, flags>  for each method
var runcmds = {}; // full sequence of command-line commands including files & directory preparation 
var res = {}; // standard output objects to be written in _textarea 
var files = {}; // output file name objects from each method
var cmds_users = {}; // Command-line commands for users to reproduce by themselves 

//Get executables for each commands

const cmdpath = __dirname + '/';
const sastbx_path = cmdpath + 'sastbx_ubuntu_commandline/build/'
//const sastbx_bin = sastbx_path + "bin/"

const docker_run_path = '/genapp/run';
const docker_bin_path = '/genapp/bin';

for ( x in req ) {
    var new_x = x.replace(/select_all-/g,'')
    if (new_x in table) {
        cmds[ new_x ] = '';
        cmds_users[ new_x ] = '';
        if (new_x == 'SASTBX') {
            cmds[ new_x ] += ". " + sastbx_path + "setpaths_all.sh && ";
            cmds_users[ new_x ] += cmds[ new_x ];
        };
        if ( "docker" in table[ x ] ) {
            if ( table[ x ].docker.length != 0 ) {
                cmds[ new_x ] += docker_bin_path + "/" +table[ new_x ].executable;
                
            } else {
                cmds[ new_x ] += cmdpath+table[ new_x ].executable;
            };
        } else {
            cmds[ new_x ] += cmdpath+table[ new_x ].executable;
        };
        cmds_users[ new_x ] += table[ new_x ].executable;
    };
};

// Add input files to command-line commands

//const string_expdata = "set_experimental_curve-experimental_curve";

const string_expdata = "experimental_curve";
const string_pdb = "pdb"; 

// required pdb allowing multiple pdbs

pdb = req[ string_pdb ].join( " " );

var pdbshort = pdb.split('/').slice(-1).pop();

// optional experimental data allowing multiple exp data files

var expdata_sastbx_short, raw_expdata_sastbx_short;

var prefix_req = [];
for ( x in req ) {
    prefix_req.push( x.split('_').slice(0,1).toString() );
};

expdata = "";
expdatashort = "";
expdata_sastbx_short = "";
raw_expdata = "";
raw_expdatashort = "";
raw_expdata_sastbx_short = ""; 
if ( string_expdata in req ) {
    raw_expdata += req[ string_expdata ].join( " " );
    raw_expdatashort = raw_expdata.split('/').slice(-1).pop();
    raw_expdata_sastbx_short = raw_expdatashort.split('.').slice(0,-1) + ".qis";   

    expdatashort = "tmp_" + raw_expdatashort;
    expdata_sastbx_short = "tmp_" + raw_expdata_sastbx_short;

    if ( prefix_req.includes( "scan" ) ) {
        runmode = "scan";
    } else  { 
        runmode = "fit";
    };
};

//console.log(expdata,expdatashort);

for ( x in cmds ) {
    if ( x == "CRYSOL" ){
        cmds[ x ] += " " +  "'" + JSON.stringify( req ) + "'";
        cmds_users[ x ] += JSON.stringify( req );
    } else {
        if ( x == "SASTBX" ) {
            cmds[ x ] += " structure=" + pdbshort;
            if ( string_expdata in req ) {
                cmds[ x ] += " experimental_data=" + expdata_sastbx_short;
                cmds_users[ x ] += " experimental_data=" + expdata_sastbx_short;
            };
        } else if ( x == "WAXSiS" ) {
            cmds[ x ] += " -s " + pdbshort;
            cmds_users[ x ] += " " + pdbshort;
            if ( string_expdata in req ) {
                cmds[ x ] += " -expfile " + expdatashort;
                cmds_users[ x ] += " -expfile " + expdatashort;
            };
        } else {
            cmds[ x ] += " " + pdbshort;
            cmds[ x ] += " " + expdatashort;
            cmds_users[ x ] += " " + pdbshort;
            cmds_users[ x ] += " " + expdatashort;
        }
    };
};

// Number_of_points should include the initial point, q = 0. FoXS convention of number_of_points = n + 1. 
// E.g. if number_of_points = 2, FoXS generates a profile with 3 points including q = 0, qmax/2, qmax while the others with 2 points of q = 0 and qmax. 
// Follow CRYSOL convention.

// Adding options with arguments

for ( x in cmds ) { 
    if (  x != 'CRYSOL' ){
        for ( opt in table[ x ]["options"] ) {

            if ( opt in req ) {
                if ( table[ x ][ "options" ] [ opt ] [ "type" ] != "listbox" ) {
                    cmds[ x ] += " " + table[ x ][ "options" ][ opt ][ "prefix_full" ];
                    cmds_users[ x ] += " " + table[ x ][ "options" ][ opt ][ "prefix_full" ];
                    argm = "" 
                    if ( table[ x ][ "options" ] [ opt ] [ "type" ] != "checkbox" ) {
                        if ( opt == "number_of_points" && x == 'FoXS' ) {
                            argm += parseInt( req[ opt ] ) - 1;
                        } else {
                            argm += req[ opt ]
                        };
                    };

                    if ( x == "SASTBX" ) {
                        cmds[ x ] += argm;
                        cmds_users[ x ] += argm;
                    } else {
                        cmds[ x ] += " " + argm;
                        cmds_users[ x ] += " " + argm;
                    };
                } else {
                    if ( req[ opt ] != 0) {
                        cmds[ x ] += " " + table[ x ][ "options" ][ opt ][ "prefix_full" ];
                        cmds_users[ x ] += " " + table[ x ][ "options" ][ opt ][ "prefix_full" ];
                        argm = ""
                        if ( opt == "angular_units" ) {
                            argm += angular_units[ x ][ req[ opt ] ]; 
                        } else {
                            argm += req[ opt ];
                        };
                        if ( x == "SASTBX" ) {
                            cmds[ x ] += argm;
                            cmds_users[ x ] += argm;
                        } else {
                            cmds[ x ] += " " + argm;
                            cmds_users[ x ] += " " + argm;
                        };
                    }; 
                };
            }; 
        };
    };
};


// Write command-line commands for each cmds
for ( x in cmds ) {
    runcmds[ x ] = "cd " + runname + " && rm -rf " + x + " ; mkdir " + x +" && cd " + x + "  && cp ../../" + pdbshort + " . && " ;
    //     runcmds[ x ] = "cd " + x + "  && cp ../" + pdbshort + " . && " ;
    if (string_expdata in req) {
        runcmds[ x ] += "cp ../../" + expdatashort + " . && " ;
        runcmds[ x ] += "cp ../../" + raw_expdatashort + " . && " ;
        if ( x == "SASTBX" ) {
            runcmds[ x ] += "sed '1d' " + expdatashort + " > " + expdata_sastbx_short + " && " ;
        }
    };

    
    // TO run in docker container
    // old docker bits
    //             runcmds[ x ] += "docker cp " + pdbshort + " " + table[ x ].docker + ":" + docker_run_path + ". && ";
    //runcmds[ x ] += "docker exec -it " + table[ x ].docker + " bash -c " + "'" + cmds[ x ]  + " -go '" + " > " + x + ".stdout  2> " + x + ".stderr"
    //     if (string_expdata in req) {
    //                 runcmds[ x ] += "docker cp " + expdatashort + " " + table[ x ].docker + ":" + docker_run_path + ". && ";
    //      };
    // If a container is running
    //             runcmds[ x ] += "docker exec -i " + table[ x ].docker + " " + cmds[ x ]  + " -go " + " > " + x + ".stdout  2> " + x + ".stderr";
    //               runcmds[ x ] += " " + table[ x ].docker + " " + cmds[ x ]  + " -go " + " > " + x + ".stdout  2> " + x + ".stderr";
    // runcmds[ x ] += " && docker rm " + container_name;                  
    
    if ( "docker" in table[ x ] ) {
        if ( table[ x ].docker.length != 0 ) {
            var container_name = "tmp_" + x + req._uuid; 
            runcmds[ x ] +=
                "ssh host docker run -i "
                + "--rm "
                + "--name "
                + container_name
                + " -v " + table[ x ].vprefix
                + req._base_directory.replace( /^.*\/results/, 'results' ) + "/" + runname + "/" + x + ":" + docker_run_path
                + " --user www-data:www-data "
                + table[ x ].docker + " "
                + cmds[ x ]
                + " -go "
                + "> " + x + ".stdout "
                + "2> " + x + ".stderr"
            ;
        } else {
            runcmds[ x ] +=  cmds[ x ]  + " > " + x + ".stdout  2> " + x + ".stderr";
        };
    } else {
        runcmds[ x ] +=  cmds[ x ]  + " > " + x + ".stdout  2> " + x + ".stderr";
    };
    
};

// Prepare log at _textarea
if ( "WAXSiS" in cmds ) {
    send_udpmsg( { _textarea : "\nDocker commands:\n " + runcmds[ "WAXSiS" ] + " \n" });
};

res._textarea = "\nRun Command Setup:\n ";
res._textarea += JSON.stringify( runcmds, null, 2 ) + "\n";

//send_udpmsg( { _textarea : "\nRun commands:\n " + JSON.stringify( runcmds, null, 2 ) + " \n" });

res._textarea += "Command Lines:\n "
res._textarea += JSON.stringify(cmds, null, 2) + "\n";

res._textarea += "\n JSON input parameters:\n "
res._textarea += JSON.stringify(req, null, 2) +  "\n";

// function to find output files from each method with number of lines > 0

function udp_outfile( x ) {
    var output = {}; // use for UDP messaging
    files.x = fs.readdirSync(  runname + '/' + x + '/' );
    try {
        if ( x != 'FoXS' ) {
            files.x.forEach ( function ( file ) {
                var suffix = file.split('.').pop();
                if ( suffix in table[ x ][ "output" ]) {
                    var text = fs.readFileSync( runname + '/' + x + "/" + file);
                    var lines = text.toString().split('\n').length - 1;
                    if ( lines != 0 ) {
                        //var xkey = 'outfile_' + x + '_' + suffix;
                        //var xvalue = req._base_directory + '/' + x  + '/' + file;
                        res[ 'outfile_' + x + '_' + suffix ] = req._base_directory + '/' + runname + '/' + x  + '/' + file;
                        output[ 'outfile_' + x + '_' + suffix ] = req._base_directory + '/' + runname + '/' + x  + '/' + file;
                        //res._textarea += 'outfile_' + x + '_' + suffix + "\n";
                    };
                };
            });
        } else {
            files.x.forEach ( function ( file ) {
                var suffix = file.split('.').pop();
                var suffix_dat = suffix;
                if ( suffix == 'dat') {
                    if ( pdbshort + '.dat' == file) {           // FoXS theoretical Iq files has nameing convention; pdbname + '.dat'
                        suffix_dat = 'dat1';
                    } else if  ( file == expdatashort ) {
                        suffix_dat = ' ';
                    } else {
                        suffix_dat = 'dat2';
                    }
                };
                if ( suffix_dat in table[ x ][ "output" ]) {
                    var text = fs.readFileSync( runname + '/' + x + "/" + file)
                    var lines = text.toString().split('\n').length - 1;
                    if ( lines != 0 ) {
                        //var xkey = 'outfile_' + x + '_' + suffix_dat;
                        //var xvalue = req._base_directory + '/' + x  + '/' + file;
                        res[ 'outfile_' + x + '_' + suffix_dat ] = req._base_directory + '/' + runname + '/' + x  + '/' + file;
                        output[ 'outfile_' + x + '_' + suffix_dat ] = req._base_directory + '/' + runname + '/' + x  + '/' + file;
                        //res._textarea += 'outfile_' + x + '_' + suffix_dat + "\n";
                    };
                };
            });
        }; 
        
    } catch(err) {
        results[ x ] = 'Error during writing output files of '+  x  + ' : ' + err.message;
    }
    return output;
}

// Generate a zip file of rea._base_directory excluding input files in each method directory
async function write_zip(err) {
    var zipdir = '';
    var output = {};
    for ( x in cmds ) {
        zipdir += runname + '/' + x + " ";
        var rm_cmd = "rm -rf " + './' + runname + '/' + x + '/' + pdbshort;
        var rm_pdb = './' + runname + '/' + x + '/' + pdbshort;
        if (expdatashort.length != 0) {
            //    rm_cmd += " && rm -rf " + './' + x + '/' + expdatashort + raw_expdatashort;
        };
        //exec( rm_cmd );
        fs.unlink( rm_pdb, function(err) {
            if (err) throw err;
        });
    };

    var zipname = req._base_directory;
    zipname = req._base_directory + "/" + runname + '/' + zipname.split('/').pop() + "_" + runname + ".zip";
    const zipcmd = "zip -r " + zipname + " " + zipdir + " " +  runlogfile.split('/').pop() ;
    //    res._textarea += zipcmd + "\n";

    //    exec(zipcmd,(err,stdout,stderr) => {
    //        if (err) {
    //            res._textarea += "Error in zipping output file :" + err.message + "\n";
    //        }
    //    });

    await p_exec( zipcmd );

    res.outfile_zip = zipname;
    output.outfile_zip = zipname;
    return output;
}

// Write log file for run 
function save_logfile(){
    var logtext = {};
    var patt = /^_/;
    logtext[ "Title" ] = "Job logs of " + modulename + " of run name " + runname;
    logtext[ "Activated Programs" ] = [];
    for ( x in runcmds ) {
        logtext[ "Activated Programs" ].push(x) ;
        logtext[ x ] = {};
        logtext[ x ][ "Run commands" ] = cmds_users[ x ]  + " > " + x + ".stdout  2> " + x + ".stderr";
    };

    logtext[ "Options" ] = {};
    for ( y in req ){
        if (!patt.test( y )){
            logtext[ "Options" ][ y ] = req[ y ];
        };
    };
    
    logtext_yaml =  yaml.dump(logtext, {
        //'styles': {
        //     '!!null': 'canonical'
        // }
        'sortKeys': false        // sort object keys
    });

    fs.writeFile(runlogfile, logtext_yaml, function(err){
        if(err){
            res._textarea += "Error in writing job log file : " + err.message + "\n"; 
        }
    });

    res.log_multisaxshub = runlogfile;
    var output = {};
    output.log_multisaxshub = runlogfile;
    return output
}   

// Write log file for run
function save_logfile_2(){
    var logtext = {};
    var patt = /^_/;
    logtext[ "Title" ] = "Job logs of " + modulename + " of run name " + runname;
    logtext[ "Activated Programs" ] = [];

    for ( x in runcmds ) {
        logtext[ "Activated Programs" ].push(x) ;
        logtext[ x ] = {};
        logtext[ x ][ "Run commands" ] = cmds_users[ x ]  + " > " + x + ".stdout  2> " + x + ".stderr";
        logtext[ x ][ "Options" ] = {};
        for ( opt in req ){
            if ( opt in table[ x ]["options"] ) {
                if (!patt.test( opt ) ){

                    logtext[ x ][ "Options" ][ opt ] = req[ opt ] + " ==> ";
                    var opt_from_table = "";
                    opt_from_table += table[ x ][ "options" ][ opt ][ "prefix_full" ];

                    var opt_mapped = " ";
                    if ( table[ x ][ "options" ] [ opt ] [ "type" ] != "checkbox" ) {
                        opt_mapped += req[ opt ];
                    };

                    if ( opt == "angular_units"){
                        opt_mapped = angular_units[ x ][ req[ opt ] ];
                    }; 
                    
                    if ( x == "SASTBX"){ 
                        opt_from_table += opt_mapped;
                    } else {
                        opt_from_table += " " + opt_mapped;
                    }; 
                    logtext[ x ][ "Options" ][ opt ] += opt_from_table; 
                };
            };
        };
    };

    logtext_yaml =  yaml.dump(logtext, {
        'styles': {
            '!!null': 'canonical'
        }
        ,'sortKeys': false        // sort object keys
    });

    fs.writeFile(runlogfile_2, logtext_yaml, function(err){
        if(err){
            res._textarea += "Error in writing job log file : " + err.message + "\n";
        }
    });

    res.log_multisaxshub_2 = runlogfile_2;
    var output = {};
    output.log_multisaxshub_2 = runlogfile_2;
    return output
}

// UDP messaging
function send_udpmsg( obj ) {
    obj._uuid = req._uuid;
    const udp_client = dgram.createSocket('udp4');
    const txt = JSON.stringify( obj );
    udp_client.send( txt,0, txt.length, req._udpport, req._udphost, ( err ) => {
        if (err) throw err;
        udp_client.close();
    });
}

function readfile(x,output) {

    var tmprunmode = runmode;
    if ( tmprunmode == "calc" || tmprunmode == "fit" ) {
        var file_id = plotfiles[ x ][ tmprunmode ][ "filename" ];
        const f = output[ file_id ];
        try {
            var data = fs.readFileSync(f);
            var result = data.toString().split('\n');
        } catch(error){ 
            var result = "Error in reading " + f
        };
    } else {
        result = '';
    } 
    return result;
}

function readfile_exp(input) {
    try {
        var data = fs.readFileSync(input);
        var result = data.toString().split('\n');
    } catch(error){
        res._textarea += "Error in reading " + input + "\n";
        throw error.message;
    } return result;
}

function generate_expdata_qmin(input) {
    return new Promise ( ( resolve, reject ) => {
        var result = "";
        try {
            //        var stream = fs.createWriteStream ( expdatashort );
            var f = fs.openSync( expdatashort, 'w' );

            var end = input.length - 1;
            var qmin = parseFloat( req[ "qmin" ] ) - 0.00001;
            var qmax = parseFloat( req[ "qmax" ] ) + 0.00001;

            for ( var i=0; i<end; i++ ) {
                var txtstring = input[ i ].toString().replace( /^\s*/,"" );
                var patt = /\D{1,3}/g;
                var txttrim = txtstring.replace(/\s+/g,'').replace(/\h+/g,'').replace(/\./g,'').replace(/(e|E)(\-|\+)/g,'');
                if ( patt.exec(txttrim) != null ) {
                    //                stream.write( input[i]+"\n"  );
                    fs.writeSync(f, input[i] + "\n");
                } else if ( txtstring !== null && txtstring !== '' ) {
                    var txtline = input[ i ].toString().replace( /^\s*/,"" ).split( /\s+/ );
                    var q = parseFloat( txtline[ 0 ] );
                    if ( q > qmin && q < qmax ) {
                        fs.writeSync(f, input[i] + "\n");
                        //                    stream.write( input[i]+"\n" );
                    };
                };           
            }; resolve ( result );
        } catch(error){
            res._textarea += "Error in writing " + expdatashort + "\n";
            reject( error.message );
        };
    }); 
}

function readfile_scan( x, output ){
    return new Promise ( (resolve, reject) => {
        const f = output[  'outfile_' + x + '_' + "scan" ];
        //        const f = output[  'outfile_' + x + '_' + "log" ];
        try {
            var data = fs.readFileSync(f);
            var result = data.toString().split("\n");
            resolve( result );
            //            return result;
        } catch(error) { 
            reject( "Error in reading scan file" ) 
            //            result += error.message;
        };
    });
}
function getJSON_scan( x, chi2_data ){
    return new Promise ( (resolve, reject) => {
        var result = "";
        var total_maps = 3;
        try {
            var count_xy = 0;
            var count_line = 0;
            res._textarea += "CHI2 file length: " + chi2_data.length + "\n";
            var patt = /\D{1,3}/g;
            
            var ncolumn = 0;
            var scansets = 0;

            for( var i = 0; i < chi2_data.length  ; i++ ) {
                var txtstring = chi2_data[i].toString().replace( /^\s*/,"" );
                if ( txtstring.length > 0 ) {
                    count_line += 1;
                    if ( count_line == 1 ) {
                        var ncolumn = chi2_data[i].split(',').length;
                    };
                };
                var txtline = chi2_data[i].split( "," );
                if ( patt.exec( txtline[0].replace(/\./g,'') ) != null )  {
                    res._textarea += "#### Header ? :" + txtline + "\n";
                    scansets += 1;
                };
            };
            //            res._textarea += "CHI2 file length: " + count_line + " & " + ncolumn + "\n";

            var scan_dim = 1;
            if ( ncolumn > 2 ) {
                scan_dim = 2;
            };

            if ( scan_dim == 1 ) {
                //                res._textarea += "#### THis is 1D profile: " +  "\n";
                result += get_1d_scandata(x, count_line, chi2_data);
            } else if ( scan_dim == 2 ) {
                //                res._textarea += "#### THis is 2D profile: \n"
                if ( scansets == 1 ) {
                    var xdomain = [ [0, 1] ];
                } else if ( scansets == 3 ) {
                    var xdomain = [ [ 0, 0.28 ], [ 0.37, 0.65 ], [ 0.72, 1.0 ] ];
                }; 
                //                res._textarea += "#### # of scan sets : " + scansets + "\n";
                result += get_2d_scandata(x, count_line, xdomain, chi2_data);
                //                res._textarea += "#### # of After get_2d_scan \n";
            };
            
            resolve( result );
        }  catch ( error ) {  
            reject (error.message);
        };
    });
}

function get_1d_scandata( x, count_line, chi2_data ) {
    var result = '';
    try {
        count_xy = 0;
        for( var i = 0; i < count_line  ; i++ ) {
            var txtstring = chi2_data[i].toString().replace( /^\s*/,"" );
            var patt = /\D{1,3}/g;
            var txtline = chi2_data[i].split( "," );

            if ( patt.exec( txtline[0].replace(/\./g,'') ) != null ) {
                count_xy += 1;
                if ( count_xy > 1 ) {
                    chi2_3d[ x ][ "data" ].push( new_data );
                };
                var new_data = {};
                new_data= JSON.parse(JSON.stringify( trace_marker ));

                var xtitle = txtline[0].toString();
                
                xtitle += " " + table[ x ][ "options" ][ xtitle ][ "unit" ];
                ytitle = "Chi";
                chi2_3d[ x ][ "layout" ][ "title" ] = "Chi scan from " + x;
                chi2_3d[ x ][ "layout" ][ "xaxis" ][ "title" ] = xtitle;
                chi2_3d[ x ][ "layout" ][ "yaxis" ][ "title" ] = ytitle;
                delete chi2_3d[ x ][ "layout" ][ "yaxis" ][ "type" ]; 
                //                    res._textarea += "LINE " + i + " is header\n";
            } else { //if ( txtstring !== null && txtstring !== '' && patt.exec(txttrim) == null ){
                //                       res._textarea += txtline[ 0 ] + " " + txtline[ 1 ]   + "\n";
                var xnew = parseFloat(txtline[ 0 ] );
                new_data[ "x" ].push( xnew );
                var ynew ;
                if ( txtline[ 1 ] == "NaN" ) {
                    ynew = Math.sqrt(1000.0) ;
                } else {
                    ynew =  Math.sqrt( parseFloat( txtline[ 1 ] ) ) ;   // fill y 
                }
                new_data[ "y" ].push ( ynew );
                //                    res._textarea += "\n" + i  + xnew + " " + ynew + "\n";
                if ( i == count_line - 1) {
                    delete new_data[ "error_y" ];
                    new_data["marker"][ "size" ]  = 15;              
                    chi2_3d[ x ][ "data" ].push( new_data );
                    var ymax = 0;
                    for ( var k = 0; k < new_data[ "y" ].length; k++ ) {
                        if ( ymax < new_data[ "y" ][ k ] ) {
                            ymax = new_data[ "y" ][ k ] ;
                        };
                    };
                    if ( ymax > 999.0 ) {
                        chi2_3d[ x ][ "layout" ][ "yaxis" ][ "autorange" ] = "false";
                        chi2_3d[ x ][ "layout" ][ "yaxis" ][ "range" ] = [ 0, 900 ];
                    };
                };
            };
        };

    } catch (error ) {
        result += "Error in get_1d_scandata" ; 
    };
}

function get_2d_scandata( x, count_line, xdomain, chi2_data ) {

    var result = "";
    //    var chi2_mock = JSON.parse(JSON.stringify( plot3d_template ));
    //chi2_3d[ x ] = chi2_mock;
    var chi_max = 0.0;
    var chi_min = 0.0;
    try {
        count_xy = 0;
        for( var i = 0; i < count_line  ; i++ ) {
            var txtstring = chi2_data[i].toString().replace( /^\s*/,"" );
            var patt = /\D{1,3}/g;
            var txtline = chi2_data[i].split( "," );

            if ( patt.exec( txtline[0].replace(/\./g,'') ) != null ) {
                //                    res._textarea += "LINE " + i + " is header\n";
                count_xy += 1;
                if ( count_xy > 1 ) {
                    chi2_3d[ x ][ "data" ].push( new_data );
                };
                var new_data= {}; 
                new_data[ "xaxis" ] = "x" + count_xy;
                new_data[ "yaxis" ] = "y" + count_xy;
                new_data[ "type" ] = "contour";
                new_data[ "x" ] = [];
                new_data[ "y" ] = [];
                new_data[ "z" ] = [];
                var xaxis = "xaxis" + count_xy;
                var yaxis = "yaxis" + count_xy;
                var xtitle = txtline[0].split('-').slice(0,1).toString();
                var ytitle = txtline[0].split('-').slice(-1).toString();

                xtitle += " " + table[ x ][ "options" ][ xtitle ][ "unit" ];
                ytitle += " " + table[ x ][ "options" ][ ytitle ][ "unit" ];

                chi2_3d[ x ][ "layout" ][ xaxis ] = {};
                chi2_3d[ x ][ "layout" ][ xaxis ][ "title" ] = xtitle; 
                chi2_3d[ x ][ "layout" ][ xaxis ][ "anchor" ] = "y" + count_xy;
                chi2_3d[ x ][ "layout" ][ xaxis ][ "domain" ] = xdomain[ count_xy - 1 ];

                chi2_3d[ x ][ "layout" ][ yaxis ] = {};
                chi2_3d[ x ][ "layout" ][ yaxis ][ "title" ] = ytitle; 
                chi2_3d[ x ][ "layout" ][ yaxis ][ "anchor" ] = "x" + count_xy;

                for ( var j = 1; j < txtline.length; j++ ) {   //skip first column
                    new_data[ "y" ].push( parseFloat(txtline[ j ]) );   // fill y 
                };
                
                new_data[ "contours" ] = {};
                new_data[ "contours" ][ "coloring" ] = "heatmap";
                new_data[ "contours" ][ "showlabels" ] = true;
                new_data[ "showscale" ] = false;
                //                    new_data[ "colorscale" ] = [[0.0, 'rgb(165,0,38)'], [0.1111111111111111, 'rgb(215,48,39)'], [0.2222222222222222, 'rgb(244,109,67)'], [0.3333333333333333, 'rgb(253,174,97)'], [0.4444444444444444, 'rgb(254,224,144)'], [0.5555555555555556, 'rgb(224,243,248)'], [0.6666666666666666, 'rgb(171,217,233)'], [0.7777777777777778, 'rgb(116,173,209)'], [0.8888888888888888, 'rgb(69,117,180)'], [1.0, 'rgb(49,54,149)']];
                new_data[ "colorscale" ] = "Jet";
                new_data[ "contours" ][ "start" ] = 0;
                new_data[ "contours" ][ "end" ] = 10;  
                //new_data[ "contours" ][ "size" ] = 1;
            } else { //if ( txtstring !== null && txtstring !== '' && patt.exec(txttrim) == null ){
                //                    res._textarea += "LINE " + i + " : " + txtline + "\n";
                new_data[ "x" ].push( parseFloat(txtline[ 0 ] ) );
                var new_z = [];
                for ( var j = 1; j < txtline.length; j++ ) {   //skip first column
                    if ( txtline[ j ] == "NaN" ) {
                        new_z.push( Math.sqrt(1000.0) );
                        chi_max = Math.sqrt(1000.0);
                    } else {
                        var zval = Math.sqrt( parseFloat(txtline[ j ]) );
                        new_z.push( zval ) ;   // fill y 
                        if ( chi_max < zval ) {
                            chi_max = zval;
                        };
                        if ( chi_min > zval ) { 
                            chi_min = zval;
                        };
                    };
                };
                new_data[ "z" ].push ( new_z );
                if ( i == count_line - 1) {
                    new_data[ "showscale" ] = true;
                    new_data[ "colorbar" ] = {};
                    new_data[ "colorbar" ]["title"] = "Chi";
                    new_data[ "colorbar" ]["titleside"] = "top";
                    chi2_3d[ x ][ "data" ].push( new_data );
                };
            };
        };
        
        for ( var i = 0; i < xdomain.length; i++ ) {
            chi2_3d[ x ][ "data" ][ i ][ "contours" ][ "start" ] = chi_min*1.0;
            chi2_3d[ x ][ "data" ][ i ][ "contours" ][ "end" ] = chi_max*1.0;
            chi2_3d[ x ][ "data" ][ i ][ "contours" ][ "size" ] = (chi_max - chi_min)/10; 
            chi2_3d[ x ][ "data" ][ i ][ "contours" ][ "labelfont" ] = {};
            chi2_3d[ x ][ "data" ][ i ][ "contours" ][ "labelfont" ][ "color" ] = "white";
        }; 
        //            res._textarea += "\n SCAN PLOT DATA";
        //            res._textarea += "\n" + JSON.stringify(chi2_3d[x], null, 2)  + "\n"; 
    } catch(error) {
        result += "Error in get_2d_scandata" ;
    };
    return result;
}

async function plot_scan(x, output) {
    //    return new Promise ( (resolve, reject) => {
    var result = "";
    try {
        var lines = await readfile_scan( x, output );
        result += await getJSON_scan( x, lines );
        //            res._textarea += "#### After getJSON_scan \n" + JSON.stringify( profile_2d ) + "\n";
        //            res[ "chi2_" + x ] = profile_2d;
        //            res._textarea += "#### 2D profile \n" + JSON.stringify( res[ "chi2_" + x ] ) + "\n";
    } catch (error) {
        result += "Error in making contour plot of " + x + " Scan mode";
    };
    //        return result;
    //    });
} 

var Iq_ALL = {};
var Iq_ref_data = {};
var chi_square = [];
var chi_square_reduced = [];
var chi_square_pierson = [];

async function prep_plot_JSON_all( ) {
    // Initialize Iq_ALL and Iq_exp_data
    
    if ( runmode == "calc" ) {
        var Iq_mock = JSON.parse(JSON.stringify( samplelayout ));
        Iq_mock[ "layout" ][ "title" ] = "Theoretical Iq profiles with " + pdbshort + " for q \u2264 " + req.qmax + " [\u212B<sup>-1</sup>]";
        Iq_ALL[ "iq_ALL" ] = Iq_mock;
        delete Iq_ALL[ "iq_ALL" ][ "layout" ][ "shapes" ];
    };
    if ( runmode == "fit" ) {
        var Iq_mock = JSON.parse(JSON.stringify( sub_layout ));
        Iq_mock[ "layout" ][ "title" ] = "Fitted Iq profiles with " + pdbshort + " & " + raw_expdatashort + " for " + req.qmin + " \u2264 q \u2264  " + req.qmax + " [\u212B<sup>-1</sup>]" ;
        // Initialize experimental data for Iq plot
        //       var raw_exp_input = raw_expdatashort;
        //       var raw_data_exp = await readfile_exp(raw_exp_input);

        iq_obj[ "RAW_EXPR" ] = JSON.parse( JSON.stringify( trace_marker ) );
        await getIqJSON_exp("RAW_EXPR", raw_data_exp);
        //       await generate_expdata_qmin( raw_data_exp );
        var exp_input = expdatashort;
        var data_exp = await readfile_exp(exp_input);
        iq_obj[ "EXPR" ] = JSON.parse( JSON.stringify( trace_marker ) );
        await getIqJSON_exp("EXPR", data_exp);
        Iq_ALL[ "iq_ALL" ] = Iq_mock;
        Iq_ALL[ "iq_ALL" ][ "layout" ][ "shapes" ][ 0 ][ "x0" ] = req.qmin;
        Iq_ALL[ "iq_ALL" ][ "layout" ][ "shapes" ][ 0 ][ "x1" ] = req.qmax; 
    }; 


    if ( runmode == "scan" ) {
        //       var raw_exp_input = raw_expdatashort;
        //       var raw_data_exp = await readfile_exp(raw_exp_input);

        iq_obj[ "RAW_EXPR" ] = JSON.parse( JSON.stringify( trace_marker ) );
        await getIqJSON_exp("RAW_EXPR", raw_data_exp);

        for ( x in cmds ) {
            var xnscan = 0;
            for ( var ss in table[ x ][ "scan" ] ) {
                if ( req[ ss ] == 4 || req[ ss ] == 5 ) {
                    xnscan += 1;
                };
            };
            if ( xnscan == 1 ) {
                var chi2_mock = JSON.parse(JSON.stringify( samplelayout ));
                delete chi2_mock[ "layout" ][ "shapes" ];
                chi2_3d[ x ] = chi2_mock;
                
            } else if ( xnscan > 1) {
                var chi2_mock = JSON.parse(JSON.stringify( plot3d_template ));
                chi2_3d[ x ] = chi2_mock;
            };
            table[ x ][ "scan" ][ "nscans" ] = xnscan;
        };
    };   

}

var chi2_reduced_obj = {};
function getIqJSON_all( ) {
    if ( runmode == "fit" ) {
        Iq_ALL[ "iq_ALL" ][ "data" ].push( iq_obj[ "RAW_EXPR" ] );
        var data_chi_temp = JSON.parse( JSON.stringify( sub_tracebar ) );
        calc_reduced_chi2();
    };
    //    var mock_chi = 20; // mock chi2 data for each x
    for ( x in cmds ) {
        var iq_obj_mock = {};
        iq_obj_mock = JSON.parse( JSON.stringify( iq_obj[ x ] ) );
        iq_obj_mock[ "line" ][ "width" ] = 5;
        Iq_ALL[ "iq_ALL" ][ "data" ].push( iq_obj_mock );
        if ( runmode == "fit" ) {
            //           mock_chi += 10; // use chi_square[] array
            data_chi_temp[ "x" ].push( x );
            data_chi_temp[ "y" ].push( chi2_reduced_obj[ x ] );
            data_chi_temp[ "text" ].push( chi2_reduced_obj[ x ].toFixed(3) );
            //           data_chi_temp[ "name" ] = "chi^2 for q < " + req.qmax + " [1/A]" ;
            data_chi_temp[ "showlegend" ] = false;
            
            // CHECK getIqJSON_all
            //           res._textarea += JSON.stringify(data_chi_temp) + "\n";
            res._textarea += chi2_reduced_obj[x] + " THIS IS REDUCED CHI2\n";
            res._textarea += "data_chi_tmp:\n" + JSON.stringify( data_chi_temp, undefined, 2 ) + "\n";
            res._textarea += "chi2_reduced_obj\n" + JSON.stringify( chi2_reduced_obj, undefined, 2 ) + "\n";
        };
    };

    if ( runmode == "fit" ) {
        Iq_ALL[ "iq_ALL" ][ "layout" ][ "title" ] = "Fitted Iq profiles with " + pdbshort + " & " + raw_expdatashort + " for " + parseFloat(qmin_calc).toFixed(4) + " \u2264 q \u2264  " + parseFloat(qmax_calc).toFixed(4) + " [\u212B<sup>-1</sup>]" ;
        Iq_ALL[ "iq_ALL" ][ "data" ].push( data_chi_temp );
        Iq_ALL[ "iq_ALL" ][ "layout" ][ "shapes" ][ 0 ][ "x0" ] = qmin_calc;
        Iq_ALL[ "iq_ALL" ][ "layout" ][ "shapes" ][ 0 ][ "x1" ] = qmax_calc;
        for ( x in cmds ) {
            Iq_ALL[ "iq_ALL" ][ "data" ].push(iq_obj_residual[ x ]);
        };
        res[ "iq_ALL" ] = Iq_ALL[ "iq_ALL" ] ;
    };
    
    if ( runmode == "calc" ) {
        Iq_ALL[ "iq_ALL" ][ "layout" ][ "title" ] = "Theoretical Iq profiles with " + pdbshort + " for " + parseFloat(qmin_calc).toFixed(4) + " \u2264 q \u2264  " + parseFloat(qmax_calc).toFixed(4) + " [\u212B<sup>-1</sup>]";
        res[ "iq_ALL" ] = Iq_ALL[ "iq_ALL" ] ;
    };
    //   res._textarea += JSON.stringify(data_chi_temp);
    //     res._textarea += JSON.stringify(Iq_ALL);  
}

function calc_reduced_chi2() {
    //    return new Promise((resolve, reject) => {
    //    var chi2 = {};
    var results = "";
    var expdata_len = iq_obj[ "EXPR" ][ "y" ].length;

    var delta_iq = 0.0;
    var correction_delta = 1E-16;
    var error_corrected = 0.0;
    var residual_q = 0.0;

    try { 
        for ( x in runcmds ) {
            iq_obj_residual[ x ] = JSON.parse( JSON.stringify( trace_line ) );
            var calcdata_len = iq_obj[ x ][ "y" ].length;
            var sum_chi2 = 0.0;
            var q = [];
            var Iq_residual = []; 
            //            if ( calcdata_len < expdata_len ) {
            var chi2_message = "Chi^2 obtained for q < " + req.qmax ;
            //            };
            
            if ( calcdata_len > expdata_len ) {
                calcdata_len = expdata_len;
            }

            for ( i = 0; i < calcdata_len; i++ ) {
                delta_iq = iq_obj[ x ][ "y" ][ i ] - iq_obj[ "EXPR" ][ "y" ][ i ]; 
                error_corrected = iq_obj[ "EXPR" ][ "error_y" ][ "array" ][ i ];
                // Residual
                //                residual_q = delta_iq/iq_obj[ "EXPR" ][ "y" ][ i ] * 100.0;
                residual_q = delta_iq/error_corrected;
                qx = iq_obj[ "EXPR" ][ "x" ][ i ];
                q.push( qx );
                Iq_residual.push( residual_q );
                
                sum_chi2 += (delta_iq/error_corrected)**2;
                //                res._textarea += i.toString() + " " + qx + " " +residual_q + "\n";
            };
            iq_obj_residual[ x ][ "x" ] = q;
            iq_obj_residual[ x ][ "y" ] = Iq_residual;
            iq_obj_residual[ x ][ "name" ] = x + "_residual";
            iq_obj_residual[ x ][ "xaxis" ] = "x" ;
            iq_obj_residual[ x ][ "yaxis" ] = "y3";
            //            iq_obj_residual[ x ][ "legendgroup" ] = x;
            iq_obj_residual[ x ][ "showlegend" ] = true;
            iq_obj_residual[ x ][ "line" ][ "color" ] = color_table[ x ];
            iq_obj_residual[ x ][ "line" ][ "dash" ] = "dot";
            //            chi2[ x ] =  sum_chi2 / Number( calcdata_len); //.toFixed(5);
            chi2_reduced_obj[ x ] = sum_chi2/ Number( calcdata_len );
        };
        return results;
        //        res._textarea += "CHI-SQUARE \n";
        //        res._textarea += JSON.stringify( chi2_reduced_obj, null, 2 ) + "\n";
    } catch (error) {
        throw ( error.message )
        //        res._textarea += "Error while calculating chi-squares" ;
    };
    //    })

}

async function getIqJSON_exp( label, txt ) {

    var tmprunmode = runmode;
    try {
        const startline = plotfiles[ label ][ tmprunmode ][ "header" ];
        const id_q = plotfiles[ label ][ tmprunmode ][ "contents" ][ "q" ];
        const id_iq = plotfiles[ label ][ tmprunmode ][ "contents" ][ "Iq" ];
        if ("Iq_error" in plotfiles[ label ][ tmprunmode ][ "contents" ]) {
            var id_sd = plotfiles[ label ][ tmprunmode ][ "contents" ][ "Iq_error" ];
        };

        var q = [];
        var Iq = [];
        var Iq_error = [];
        for( i = startline; i < txt.length  ; i++ ) {
            var txtstring = txt[i].toString().replace( /^\s*/,"" );
            var patt = /\D{1,3}/g;
            //            var txttrim = txtstring.replace(/\s+/g,'').replace(/\h+/g,'');
            var txttrim = txtstring.replace(/\s+/g,'').replace(/\h+/g,'').replace(/\./g,'').replace(/(e|E)(\-|\+)/g,'');
            //            res._textarea += txttrim + " "+ patt.exec(txttrim) + "\n";
            //            console.log(JSON.stringify( res ));
            //            if ( txtstring !== null && txtstring !== '' && patt.exec(txttrim) !== null ){
            if ( txtstring !== null && txtstring !== '' && patt.exec(txttrim) == null ){
                var txtline = txt[i].toString().replace( /^\s*/,"" ).split( /\s+/ );
                q.push( txtline[ id_q - 1 ] );
                Iq.push( txtline[ id_iq - 1 ] );
                if ("Iq_error" in plotfiles[ label ][ tmprunmode ][ "contents" ] ) {
                    Iq_error.push( txtline[ id_sd - 1 ] );
                };
            };
        };
        iq_obj[ label ][ "x" ] = q;
        iq_obj[ label ][ "y" ] = Iq;
        iq_obj[ label ][ "name" ] = raw_expdatashort;
        iq_obj[ label ][ "error_y" ][ "array" ] = Iq_error;
        iq_obj[ label ][ "error_y" ][ "visible" ] = "true";
    } catch (error) { 
        res._textarea += "Error in making PLOTLY JSON of experimental data " + label + " \n"
    };
}

function getIqJSON(x,layout,tempdata,txt) {
    var tmprunmode = runmode;

    var qinr = 0.00000001;
    var local_qmin = Number(qmin_calc) - qinr;
    var local_qmax = Number(qmax_calc) + qinr;

    if ( tmprunmode == "fit" || tmprunmode == "scan" ) {
        var qlength = iq_obj[ "EXPR" ][ "x" ].length;
        var local_qmin_fit = Number( iq_obj[ "EXPR" ][ "x" ][ 0 ] ) - qinr
        var local_qmax_fit = Number( iq_obj[ "EXPR" ][ "x" ][ qlength -1 ] ) + qinr
    };

    try {
        const startline = plotfiles[ x ][ tmprunmode ][ "header" ];
        const id_q = plotfiles[ x ][ tmprunmode ][ "contents" ][ "q" ];
        const id_iq = plotfiles[ x ][ tmprunmode ][ "contents" ][ "Iq" ];

        if ("Iq_error" in plotfiles[ x ][ tmprunmode ][ "contents" ]) {
            var id_sd = plotfiles[ x ][ tmprunmode ][ "contents" ][ "Iq_error" ];
        };

        var q = [];
        var Iq = [];
        var Iq_error = [];
        //        for(i = startline; i < 5; i++) {
        for( i = startline; i < txt.length  ; i++ ) {
            var txtstring = txt[i].toString().replace( /^\s*/,"" );
            if ( txtstring !== null && txtstring !== '' ) {
                var txtline = txt[i].toString().replace( /^\s*/,"" ).split( /\s+/ );
                // throw q less than min q in experimental data
                if ( tmprunmode == "fit" || tmprunmode == "scan" ) {
                    //                    if ( !( Number( txtline[ id_q - 1 ] ).toFixed(5) < Number( iq_obj[ "EXPR" ][ "x" ][ 0 ] ).toFixed(5) ) ) {
                    if ( Number( txtline[ id_q - 1 ] ) > local_qmin_fit && Number( txtline[ id_q - 1 ] ) < local_qmax_fit ) {
                        q.push( txtline[ id_q - 1 ] );
                        Iq.push( txtline[ id_iq - 1 ] );
                        if ("Iq_error" in plotfiles[ x ][ tmprunmode ][ "contents" ]) {
                            Iq_error.push( txtline[ id_sd - 1 ] );
                        };
                    };
                } else {
                    if ( Number( txtline[ id_q - 1 ] ) > local_qmin && Number( txtline[ id_q - 1 ] ) < local_qmax ) {
                        q.push( txtline[ id_q - 1 ] );
                        Iq.push( txtline[ id_iq - 1 ] );
                        if ("Iq_error" in plotfiles[ x ][ tmprunmode ][ "contents" ]) {
                            Iq_error.push( txtline[ id_sd - 1 ] );
                        };
                    };
                };
            };
        };

        var Iq_layout = {};
        Iq_layout = JSON.parse( JSON.stringify( layout ) );
        iq_obj[ x ] = JSON.parse( JSON.stringify( tempdata ) );
        iq_obj[ x ][ "x" ] = q;
        iq_obj[ x ][ "y" ] = Iq;
        iq_obj[ x ][ "name" ] = x; 
        //       iq_obj[ x ][ "legendgroup" ] = x
        iq_obj[ x ][ "line" ][ "color" ] = color_table[ x ];
        iq_obj[ x ][ "line" ][ "width" ] = 10;
        if ("Iq_error" in plotfiles[ x ][ tmprunmode ][ "contents" ]) {
            iq_obj[ x ][ "error_y" ][ "array" ] = Iq_error; 
            iq_obj[ x ][ "error_y" ][ "visible" ] = "true";
        } else {
            delete iq_obj[ "error_y" ];
        };

        Iq_layout[ "data" ] = [ iq_obj[ x ] ];
        if ( runmode == "calc" ) {
            Iq_layout[ "layout" ][ "title" ] = "Theoretical Iq profile from " + x + " with " + pdbshort + " for " + parseFloat(qmin_calc).toFixed(4) + " \u2264 q \u2264 " + parseFloat(qmax_calc).toFixed(4) + " [\u212B<sup>-1</sup>]";
            delete Iq_layout[ "layout" ][ "shapes" ];
        };

        if ( runmode == "fit" ) {
            Iq_layout[ "layout" ][ "title" ] = "Fitted Iq profile from " + x + " with " + raw_expdatashort + " for " + parseFloat(qmin_calc).toFixed(4) + " \u2264 q \u2264 " + parseFloat(qmax_calc).toFixed(4) + " [\u212B<sup>-1</sup>]";
            Iq_layout[ "data" ].push( iq_obj[ "RAW_EXPR" ] );
            Iq_layout[ "layout" ][ "shapes" ][ 0 ][ "x0" ] = qmin_calc;
            Iq_layout[ "layout" ][ "shapes" ][ 0 ][ "x1" ] = qmax_calc;
        };

        //       iq_obj[ x ] = Iq_data ;
        var result = {};
        result[ "iq_" + x ] = Iq_layout;
        //       res._textarea += JSON.stringify(result);

    } catch (error) { result = "Error in making PLOTLY JSON for " + x  +"\n"};

    return result;
};


// Define a chain of promise for each method before parallelizaton
async function do_exec( x ) {
    //    send_udpmsg( { _textarea : "Starting " + runmode + " mode jobs\n" });

    if ( x == "check_scan" ) {
        check_scan();
    } else {
        var x_startTime = performance.now();
        send_udpmsg( { _textarea : "Starting " + x + " job\n" } );
        // send_udpmsg( { _textarea : `${runcmds[x]}\n`  } );
        // send_udpmsg( { _textarea : `req._base_directory ${req._base_directory}\n`} );

        var result = await p_exec( runcmds[ x ] );
        var x_exeTime = (Number.parseInt(performance.now() - x_startTime))/1000;
        send_udpmsg( { _textarea : "Completed " + x + " job: " + x_exeTime + " seconds.\n" } );

        await sleep(60);
        var output = udp_outfile( x );
        send_udpmsg( { _textarea : "Writing output files for " + x + " done\n" } );
        //    send_udpmsg( output );

        //    await sleep(1000);

        if ( runmode == "calc" || runmode == "fit" ){
            var tst = readfile(x,output);
            Iq_udp = getIqJSON(x,samplelayout,trace_line,tst);
            //    send_udpmsg( { _textarea : "Sending UPD for " + x + " \n" + JSON.stringify(Iq_udp) + " \n" }); 
            //    send_udpmsg( Iq_udp );
            res[ "iq_" + x ] = Iq_udp[ "iq_" + x ];
            //        res._textarea += JSON.stringify(res["iq_" + x ], null, 2) + "\n";
        };

        if ( runmode == "scan" ) {
            plot_scan( x, output );
            sleep(1000);
            if ( table[ x ][ "scan" ][ "nscans" ] == 1 ) {
                res[ "chi2_1D_" + x ] = chi2_3d[ x ] ;
                //            res._textarea += JSON.stringify(res["chi2_1D" + x ], null, 2) + "\n";
            } else if ( table[ x ][ "scan" ][ "nscans" ] > 1 ) {
                res[ "chi2_2D_" + x ] = chi2_3d[ x ] ;
                //            res._textarea += JSON.stringify(res["chi2_2D" + x ], null, 2) + "\n";
            };
        };


    };
    //    send_udpmsg( { _textarea : "Sent UPD for " + x + " \n" });

    return result;
}

function getFile(path, delay) {
    return new Promise((resolve, reject) => {
        try {
            var timeout = setInterval( function() {
                const file = path;
                const fileExists = fs.existsSync(file);

                if (fileExists) {
                    resolve( fileExists );
                    clearInterval(timeout);
                };
            }, delay );
        } catch( error ){
            reject( error.message );
        }; 
    });
}

var adjusted_scan_parameter = {"stdout":"","stderr":""};
var check_scan_step = {"stdout":"","stderr":""};

async function grep_text( grep_cmd, timeout ) {
    adjusted_scan_parameter = await p_exec( grep_cmd );
    var newtime = timeout + 1;
}

async function grep_scan_step( grep_cmd, timeout ) {
    check_scan_step = await p_exec( grep_cmd );
    var newtime = timeout + 1;
}

function get_adjusted_scan_parameter(grep_cmd, delay) {
    return new Promise((resolve, reject) => {
        try {
            var timeout = setInterval( function() {
                var result = grep_text(grep_cmd, 0) ;
                if ( adjusted_scan_parameter[ "stdout" ].length ) {
                    //for ( x in checkscanstep[ "stdout" ].split('\n') ) {
                    send_udpmsg( { _textarea : adjusted_scan_parameter[ "stdout" ] + "\n" } );
                    //};
                    resolve( result );
                    clearInterval(timeout);
                };
            }, delay );
        } catch( error ){
            reject( error.message );
        };
    });
}

function get_expectation_scantime(grep_cmd, delay) {
    return new Promise((resolve, reject) => {
        try {
            var timeout = setInterval( function() {
                var result = grep_scan_step(grep_cmd, 0) ;
                if ( check_scan_step[ "stdout" ].length ) {
                    //for ( x in checkscanstep[ "stdout" ].split('\n') ) {
                    send_udpmsg( { _textarea : check_scan_step[ "stdout" ] } );
                    check_scan_step[ "stdout" ] = "";
                    //};
                    resolve( result );
                    clearInterval(timeout);
                };
            }, delay );
        } catch( error ){
            reject( error.message );
        };
    });
}

async function check_scan() {

    var result_status = [];
    var scan_status = [];
    var result_var = [];
    var scan_var_set = [];

    var filename = req._base_directory + "/" + runname + "/CRYSOL/CRYSOL.stdout";
    var grep_cmd = "grep " + "\"Expected to finish in \" " + filename + " | tail -1" ;
    var grep_scan_var = "grep " + "\"## \" " + filename; // + " | tail -12 "; 

    await getFile( filename, 100);
    send_udpmsg( { _textarea : "\n" + "=".repeat(28) + " Scan Setup " + "=".repeat(29) + "\n\n" } );
    await get_adjusted_scan_parameter( grep_scan_var, 100 ); 

    send_udpmsg( { _textarea : "=".repeat(28) + " Run status " + "=".repeat(29) + "\n" } );
    await get_expectation_scantime( grep_cmd, 100 ); 

    var index_time = parseFloat( check_scan_step[ "stdout" ].split( ' ' ).slice(-2, -1)[0]);
    var remain_step = parseInt( check_scan_step[ "stdout" ].split( ' ' ).slice(3, 4)[0]);
    if ( index_time > 10.0 && index_time < 60.0 ) {
        await sleep(parseInt( index_time/remain_step * 3000 ) );
        var nextstep = await p_exec( grep_cmd );
        send_udpmsg( { _textarea : nextstep[ "stdout" ] + "\n" } );
        index_time = parseFloat( nextstep[ "stdout" ].split( ' ' ).slice(-2, -1)[0]);
        send_udpmsg( { _textarea : "Expected to finish in "  +  ( index_time).toFixed(0) + " secs\n\n" } );

    } else if ( index_time >= 60.0 ) {
        await sleep(parseInt( index_time/remain_step * 3000 ) );
        var nextstep = await p_exec( grep_cmd );
        index_time = parseFloat( nextstep[ "stdout" ].split( ' ' ).slice(-2, -1)[0]);
        send_udpmsg( { _textarea : "Expected to finish in "  +  ( index_time/60 ).toFixed(1) + " mins\n\n" } );
    };

}

// Define parallel job of methods
async function parallel() {
    var tasks = {};
    var udptasks = {};
    var runcmds_scan = {};

    if ( runmode == "scan" ) {
        //        do_exec[ "check_scan" ] = check_scan();
        runcmds_scan = JSON.parse( JSON.stringify( runcmds ) );
        runcmds_scan[ "check_scan" ] = "";
        
        for ( x in runcmds_scan ) {
            tasks[ x ] = do_exec( x );
        };
    } else {
        for ( x in runcmds ) {
            tasks[ x ] = do_exec( x );
        };

    };

    var results = {};
    //    var errors = {};
    try {
        if ( runmode == "scan" ) {    
            for ( x in runcmds_scan ) {
                results[ x ] = await tasks[ x ];
            };
        } else {
            for ( x in runcmds ) {
                results[ x ] = await tasks[ x ];
            };
        }
        /*
          if ( runmode == "scan" ) {
          results[ "scan_crysol" ] = await tasks[ "scan_crysol" ];
          }
        */
    } catch(err) {
        results[ x ] = 'Error in '+  x  + ' : ' + err.message;
    }
    return results;
}

res._textarea += "\n LOG of executables:\n ";

function input_filter ( ) {
    var result = '';
    var pdbnamecopy = "";
    pdbnamecopy += pdbshort.toString();
    var pdbsuffix = "";
    pdbsuffix += pdbnamecopy.split('.').pop();
    if ( req.qmin >= req.qmax ) {
        result += "Qmax must be greater than Qmin.";
        return result;
    };

    if ( Object.keys( cmds ).length == 0 ){
        result += "No program selected!";
        return result;
    };

    if ( req.set_experimental_curve == "on" ) {
        if ( !( string_expdata in req )) {
            result += "Input Experimental curve is missing.";
            return result;
        };
    };
    if ( pdbsuffix != "pdb" ) {
        result += "Stop running as " + pdbshort + " may not be a correct pdb file.\n"
        return result;
    };
    if ( runmode == "calc" ) {
        if ( prefix_req.includes( "scan" ) ) {
            result += "Missing experimental curve to scan Chi^2.\nChoose 'Fix' to obtain theoretical curve with no experimental curve, or choose 'Chi^2 Scan' together with experimental curve.";
            return result;
        };
        if ( prefix_req.includes( "fit" )) {
            result += "Missing experimental curve while trying to adjust range of parameter(s).\nChoose 'Fix' to obtain theoretical curve with no experimental curve, or choose 'Edit range' together with experimental curve.";
            return result;
        };
    };

    if ( runmode == "fit" || runmode == "scan" ) {
        var nq = iq_obj[ "RAW_EXPR" ][ "x" ].length;
        var expqmin = parseFloat( iq_obj[ "RAW_EXPR" ][ "x" ][ 0 ] );
        var expqmax = parseFloat( iq_obj[ "RAW_EXPR" ][ "x" ][ nq-1 ] );
        if ( req.qmin < expqmin || req.qmax > expqmax || req.number_of_points < 50  ) {
            send_udpmsg( { _textarea : "=".repeat(27) + " Input WARNING " + "=".repeat(27) + "\n"} );
        };
        if ( req.qmin < expqmin ) {
            send_udpmsg( { _textarea : "## Input Qmin = " + req.qmin + " is less than " + expqmin.toFixed(4) + " in experimental minimum q. Used " + expqmin.toFixed(4) + " for Qmin. \n" } );
            qmin_calc = expqmin;
        } else {
            qmin_calc = req.qmin;
        };
        if (req.qmax > expqmax ) {
            send_udpmsg( { _textarea : "## Input Qmax = " + req.qmax + " is greater than " + expqmax.toFixed(4) + " in experimental maximum q. Used " + expqmax.toFixed(4) + " for Qmax. \n" } );
            qmax_calc = expqmax;
        } else {
            qmax_calc = req.qmax;
        };

        if ( req.number_of_points < 50 ) {
            send_udpmsg( { _textarea : "## Number of q points = " + req.number_of_points + " is too small.\n     It may significanly affect fitting & scanning results depending on programs selected.\n" } );
        };
        send_udpmsg( { _textarea : "=".repeat(69) + "\n"} );
    } else {
        qmin_calc = req.qmin;
        qmax_calc = req.qmax

    };
    if ( runmode == "scan" ) {
        //  Need to expand to the other program
        if ( !( "CRYSOL" in cmds ) ) {
            result += "Chi^2 Scan was requested but it  is currently available only by CRYSOL. Choose CRYSOL to scan Chi^2.";
            return result;
        } else {
            var count = 0;
            for ( k in cmds ) {
                count += 1;
            };
            if ( count > 1 ) {
                result += "Chi^2 scan is currently available only by CRYSOL.";
                return result;
            };
            var nscan = 0;
            for ( var k=0; k <  prefix_req.length; k++ ) {
                if ( prefix_req[ k ]== "scan" ) {
                    nscan += 1;
                };
            };
            //            if ( nscan == 4 ) {
            //                result += "Only one parameter is chosen to scan Chi^2. Current Scan mode run requires at least two parameters to scan.";
            //                return result;
            //            }; 
        };
        if ( "FoXS" in cmds || "Pepsi-SAXS" in cmds || "SASTBX" in cmds ||
             "SasCalc" in cmds || "WAXSiS" in cmds || "SoftWAXS" in cmds || "AXES" in cmds ) {
            result += " Only CRYSOL runs in scan mode";
            return result;
        };

    };
    return result;
}

function message_box(msg) {
    var _message = {};
    _message[ "icon" ] = "toast.png";
    _message[ "text" ] = msg;

    res[ "_message" ] = _message;
    delete res._textarea;
    
    console.log( JSON.stringify( res ) );
}

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

// Main function to submit parallel job
async function taskRunner(fn, label) {
    const startTime = performance.now();
    var result = "";
    try {

        //        await sleep(1000);
        //      make a directory "runname"
        if ( fs.existsSync( runname ) ) {
            await p_exec( "rm -rf " + runname + '/*' );
        } else {
            await p_exec( "mkdir " + runname );
        }; 
        await prep_plot_JSON_all();
        var msg = input_filter( );
        if ( msg.length > 0 ) {
            //            process.on( 'exit', function(code) { return console.log ( "Program stopped due to input error." )});
            message_box( msg );
        } else {
            send_udpmsg( { _textarea : "\nStarting " + runmode + " mode jobs\n" });

            await sleep(1000);
            //      Run programs here
            result += await fn();
            //
            var output = save_logfile();
            //        send_udpmsg( output );
            var output = save_logfile_2();
            //        send_udpmsg( output );

            if ( runmode == "calc" || runmode == "fit" ) {
                getIqJSON_all();
            };

            await write_zip();
            await sleep(1000);

            send_udpmsg( output );
            if ( ! ( "debug_msg" in req ) ) { 
	        delete res._textarea;
            }

            send_udpmsg( { _textarea : "Finished Multi SAXS job!\n" + "=".repeat(69) } );
            //        await sleep(1000);
// *******  // --> if crysol3d set && scandata found, replace with scandata.contours()
            // send_udpmsg( { _textarea : '\nres.chi2_2D_CRYSOL ' + ( res.chi2_2D_CRYSOL && res.chi2_2D_CRYSOL.layout.xaxis2  ? 'defined' : 'not defined' ) + '\n' } );
            if ( res.chi2_2D_CRYSOL && res.chi2_2D_CRYSOL.layout.xaxis2 ) {
                delete res.chi2_2D_CRYSOL;
                // replace with scandata.contours()
                let fname = req._base_directory + "/" + pdbshort.split( '.' ).slice( 0,1 ) + "00.scandata";
                if ( !scandata.read( fname ) ) {
                    send_udpmsg( { _textarea : `\nError: trying to read ${fname} for plot data` } );
                } else {
                    // send_udpmsg( { _textarea : `\nOK: trying to read ${fname} for plot data` } );
                    res.chi2_2D_CRYSOL = scandata.contours( [ 'contrast_hydration', 'excluded_volume' ] );
                }
            }
            
            console.log(JSON.stringify(res));
        }
    } 
    catch (err) {
        res._textarea += "Error : " + err.message + "\n";
        console.log(JSON.stringify(res));
    }
}

async function multisaxshubRunner ( fn ) {
    var result = "";

    if ( string_expdata in req ) {
        raw_data_exp = await readfile_exp(raw_expdatashort);
        await generate_expdata_qmin( raw_data_exp );
    };
    fn(parallel, 'parallel', {} );
};

multisaxshubRunner ( taskRunner );
