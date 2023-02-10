'use strict';
(function () {
    angular
        .module('cybersponse')
        .controller('editAdvancedCharting100Ctrl', editAdvancedCharting100Ctrl).controller('dataSetCtrl', dataSetCtrl);

    editAdvancedCharting100Ctrl.$inject = ['$scope', '$uibModalInstance', 'config', 'appModulesService', 'Entity', '$resource', '$q', 'SORT_ORDER'];
    dataSetCtrl.$inject = ['$scope','Entity'];

    function editAdvancedCharting100Ctrl($scope, $uibModalInstance, config, appModulesService, Entity, $resource, $q, SORT_ORDER) {
      if (!config.dataSets) {
        config.dataSets = [];
      }
      $scope.config = config;
      $scope.config.customFilters = $scope.config.customFilters || {'limit':1};
      if ($scope.config.customMode && $scope.config.customFilters.sort.length > 0) {
        $scope.customSort = {field: $scope.config.customFilters.sort[0].field, direction: $scope.config.customFilters.sort[0].direction};
      }
      else {
        $scope.customSort = {};
      }
      appModulesService.load().then(function(modules) {
            $scope.modules = modules;

            $scope.moduleFields = {};
            $scope.moduleFieldsArrays = {};
            angular.forEach($scope.config.dataSets, function(dataSet) {
              if (!$scope.moduleFields[dataSet.resource]) {
                populateFieldLists(dataSet.resource)
              }
            });

            if ($scope.config.customResource && !$scope.moduleFields[$scope.config.customResource]) {
              populateFieldLists($scope.config.customResource);
            }
        });
        $scope.cancel = cancel;
        $scope.save = save;
        $scope.removeDataSet = removeDataSet;
        $scope.SORT_ORDER = SORT_ORDER;
        
        $scope.selectChartType = selectChartType;
        $scope.addDataSet = addDataSet;
        $scope.addSubDataSet = addSubDataSet;
        $scope.plotTypes = [
          'Bar',
          'Line',
          'Spline',
          'Step',
          'Area',
          'Scatter'
        ];
        $scope.timePeriods = ["Hourly", "Daily", "Weekly", "Monthly", "Quarterly", "Yearly"];
        $scope.dateField = {
          'name': 'dateRange',
          'title': 'Date Range',
          'type': 'datetime.quick',
          'editable': true
        };
        $scope.status = {"open": true};

        $scope.$watch("config.customResource", function(newValue, oldValue) {
          if (oldValue == newValue) {
            return;
          }
          if (!$scope.moduleFields[newValue]) {
            populateFieldLists(newValue);
          }
          $scope.customSort = {};
        })
      
      	function selectChartType(chartType) {
            if ($scope.config.selectedChartType != chartType) {
                $scope.config.selectedChartType = chartType;
                $scope.config.dataSets = [];
            }
        }

        function populateFieldLists(resource) {
          let crEntity = new Entity(resource);
              crEntity.loadFields().then(function() {
                for (var key in crEntity.fields) {
                  if (crEntity.fields[key].type === 'datetime') {
                    crEntity.fields[key].type = 'datetime.quick';
                  }
                }
                $scope.moduleFields[resource] = crEntity.fields;
                $scope.moduleFieldsArrays[resource] = crEntity.getFormFieldsArray()
              })
        }
      
        function addDataSet(group) {
          let newDataSet = {
            "isOpen": false,
            "title": "",
            "group": group,
            "resource": null,
            "mappingField": null
          };
          if(group) {
            newDataSet.dataSets = [];
          }
          else {
            newDataSet.query = [];
            newDataSet.groupingField = null;
            newDataSet.plotType = "Bar";
          }
          $scope.config.dataSets.push(newDataSet)
        }

        function addSubDataSet(dataSet) {
            let newDataSet = {
                "title": "",
                "resource": null,
                "query": [],
                "subset": true
            };
            dataSet.dataSets.push(newDataSet);
        }

        function cancel() {
            $uibModalInstance.dismiss('cancel');
        }

        function save() {
            if ($scope.editWidgetForm.$invalid) {
                $scope.editWidgetForm.$setTouched();
                $scope.editWidgetForm.$focusOnFirstError();
                return;
            }
            $scope.processing=true;

            // Before saving we need to generate a pseudo-uuid value. There's not a good way to get a true uuid in angularjs
            if (! $scope.config.correlationValue) {
              var uniqueValue = _generate_pseudo_uuid();
              $scope.config['correlationValue'] = uniqueValue;
            }

            // Determine if widget is in Wizard mode or Custom mode
            if($scope.config.customMode) {
              // Reset config, deleting any data that was filled in on the Wizard form before switchting to custom
              $scope.config.dataSets = [];
              $scope.config.customFilters.sort = [$scope.customSort];
              
              $uibModalInstance.close($scope.config);
            }
            else {
              // Reset config
              delete $scope.config.customResource;
              delete $scope.config.customDataField;
              delete $scope.config.customRecordId;
              

              $scope.config.dataSets.forEach(dataSet => {adjustDataSetQuery(dataSet)});
  
              // The following commented code block is for the "Generate stats record on save" workflow. 
              let record_body = {
                  "chartName": $scope.config.title,
                  "chartConfig": $scope.config,
                  "correlationValue": $scope.config.correlationValue,
                  "queryModified": true
              };
              var stats_record = $resource('api/3/upsert/advanced_charts/');
              stats_record.save(record_body).$promise.then(function(stats) {
                  // Update the config with the new uuid of the record associated with this chart
                  $scope.config.record_uuid = stats.uuid;
                  $uibModalInstance.close($scope.config);
              });
            }
        }

        function removeDataSet(dataSets, index) {
          dataSets = dataSets.splice(index, 1);
        }

        function _generate_pseudo_uuid() {
          var d = new Date().getTime();
          var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random()*16)%16 | 0;
            d = Math.floor(d/16);
            return (c=='x' ? r : (r&0x3|0x8)).toString(16);
          });
          return uuid;
        }

        function adjustDataSetQuery(dataSet) {
            if(dataSet.group) {
                dataSet.dataSets.forEach(subDataSet => adjustDataSetQuery(subDataSet));
            } else {
                dataSet.query.aggregates = [{
                  operator: 'countdistinct',
                  field: '*',
                  alias: 'total'
                }];
                if (dataSet.groupingField) {
                  dataSet.query.aggregates.push({
                    "operator": "groupby",
                    "field": $scope.moduleFields[dataSet.resource][dataSet.groupingField].type=='picklist' ? dataSet.groupingField + '.itemValue': dataSet.groupingField,
                    "alias": dataSet.groupingField
                  });
                  if ($scope.moduleFields[dataSet.resource][dataSet.groupingField].type=='picklist') {
                    dataSet.groupingFieldOptions = $scope.moduleFields[dataSet.resource][dataSet.groupingField].options.map(option => option.itemValue);
                  }
                }
                dataSet.query.sort = [];
            }
        }

    }

    function dataSetCtrl($scope, Entity) {
        let ds = $scope.dataSet;
        var dsc = this;
        if (!ds.group) {
            $scope.$watch('dataSet.resource', function(newValue, oldValue) {
                if (oldValue == newValue) {
                    return;
                }
                delete ds.query.filters;
                loadAttributes(ds);
            })
        }
        else {
            let sds = $scope.subDataSet;
            $scope.$watch('subDataSet.resource', function(newValue, oldValue) {
                if (oldValue == newValue) {
                    return;
                }
                delete sds.query.filters;
                loadAttributes(sds);
            })
        }
        

        function loadAttributes(dataSet) {
          if (!$scope.moduleFields[dataSet.resource]) {            
            dsc.entity = new Entity(dataSet.resource);
            dsc.entity.loadFields().then(function() {
              for (var key in dsc.entity.fields) {
                if (dsc.entity.fields[key].type === 'datetime') {
                  dsc.entity.fields[key].type = 'datetime.quick';
                }
              }
              $scope.moduleFields[dataSet.resource] = dsc.entity.fields;
              $scope.moduleFieldsArrays[dataSet.resource] = dsc.entity.getFormFieldsArray()
            })
          }
          }
    }
})();
