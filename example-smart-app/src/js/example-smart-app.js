(function(window){
  window.extractData = function() {
    var ret = $.Deferred();
    problems_arr = [];
    diagnostics_arr = [];
    cpt_arr = [];
    procedure_arr = [];
    coverage_arr = [];

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
    }

    function onReady(smart)  {
      if (smart.hasOwnProperty('patient')) {
        var patient = smart.patient;
        var pt = patient.read();
        var obv = smart.patient.api.fetchAll({
                    type: 'Observation',
                    query: {
                      code: {
                        $or: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4',
                              'http://loinc.org|8480-6', 'http://loinc.org|2085-9',
                              'http://loinc.org|2089-1', 'http://loinc.org|55284-4']
                      }
                    }
                  });
        
        var condition = smart.patient.api.fetchAll({type: "Condition"}).then(function(problems){
          problems.forEach(function(p){
            problems_arr.push([
              p.code.coding[0].display, " | "
            ])
          })
        })

        var diag_report = smart.patient.api.fetchAll({type: "DiagnosticReport"}).then(function(report){
          report.forEach(function(p){
            diagnostics_arr.push([
              p.code.coding[0].display, " | "
            ])
          })
        })

        var cpt_code = smart.patient.api.fetchAll({type: "Procedure"}).then(function(report){
          report.forEach(function(p){
            cpt_arr.push([
              p.code.coding[0].code, " | "
            ])
          })
        })

        var procedure = smart.patient.api.fetchAll({type: "Procedure"}).then(function(report){
          report.forEach(function(p){
            procedure_arr.push([
              p.code.text, " | "
            ])
          })
        })

        var coverage = smart.patient.api.fetchAll({type: "Coverage"}).then(function(report){
          report.forEach(function(p){
            // console.log(p)
            if (p.hasOwnProperty('class')) {
              coverage_arr.push([
                p.class[0].name, " | "
              ])             
            }
          })
        })

        $.when(pt, obv, condition, diag_report, cpt_code, procedure, coverage).fail(onError);

        $.when(pt, obv, condition, diag_report, cpt_code, procedure, coverage).done(function(patient, obv, cond, dr, cpt, proc, cov) {
          var byCodes = smart.byCodes(obv, 'code');
          var gender = patient.gender;

          var fname = '';
          var lname = '';

          if (typeof patient.name[0] !== 'undefined') {
            fname = patient.name[0].given.join(' ');
            lname = patient.name[0].family;
          }

          var height = byCodes('8302-2');
          var systolicbp = getBloodPressureValue(byCodes('55284-4'),'8480-6');
          var diastolicbp = getBloodPressureValue(byCodes('55284-4'),'8462-4');
          var hdl = byCodes('2085-9');
          var ldl = byCodes('2089-1');

          var p = defaultPatient();
          p.birthdate = patient.birthDate;
          p.gender = gender;
          p.fname = fname;
          p.lname = lname;
          p.height = getQuantityValueAndUnit(height[0]);

          if (typeof systolicbp != 'undefined')  {
            p.systolicbp = systolicbp;
          }

          if (typeof diastolicbp != 'undefined') {
            p.diastolicbp = diastolicbp;
          }

          p.hdl = getQuantityValueAndUnit(hdl[0]);
          p.ldl = getQuantityValueAndUnit(ldl[0]);
          p.condition = problems_arr
          p.diag_report = diagnostics_arr
          p.cpt_code = cpt_arr
          p.procedure = procedure_arr
          p.coverage = coverage_arr

          ret.resolve(p);
        });
      } else {
        onError();
      }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();

  };

  function defaultPatient(){
    return {
      fname: {value: ''},
      lname: {value: ''},
      gender: {value: ''},
      birthdate: {value: ''},
      height: {value: ''},
      systolicbp: {value: ''},
      diastolicbp: {value: ''},
      ldl: {value: ''},
      hdl: {value: ''},
      condition: {value: ''},
      diag_report: {value: ''},
      procedure: {value: ''},
      cpt_code: {value: ''},
      coverage: {value: ''},
    };
  }

  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function(observation){
      var BP = observation.component.find(function(component){
        return component.code.coding.find(function(coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
          return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
  }

  window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
    $('#condition').html(p.condition);
    $('#diag_report').html(p.diag_report);
    $('#procedure').html(p.procedure);
    $('#cpt_code').html(p.cpt_code);
    $('#coverage').html(p.coverage);
  };

})(window);
