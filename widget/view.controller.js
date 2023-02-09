'use strict';
(function () {
    angular
        .module('cybersponse')
        .controller('advancedCharting100Ctrl', advancedCharting100Ctrl);

    advancedCharting100Ctrl.$inject = ['$scope', '$timeout', '$resource', 'API', 'config'];

    function advancedCharting100Ctrl($scope, $timeout, $resource, API, config) {
        $scope.processing=true;
        $scope.config = config;
        $scope.init = init;
        $scope.generateChartData = generateChartData;
        $scope.errMsg = "No results for this chart yet. Data generation playbook has been triggred and results will populate shortly.";

        function init() {
            var dataFormat = {
                bindto: "#c3Chart-"+config.correlationValue
            };

            if ($scope.config.customMode) {
                $resource(API.QUERY + $scope.config.customResource + '?$limit=1').save($scope.config.customFilters).$promise.then(function(data) {
                //queryForChartRecord($scope.config.customResource, $scope.config.customRecordId).then(function(data) {
                    if (data['hydra:member'].length == 0) {
                        $scope.errMsg = "A record in the specified module with the provided ID does not exist.";
                        $scope.noData=true;
                        $scope.processing=false;
                    }
                    else {
                        let moduleChartData = data['hydra:member'][0][$scope.config.customDataField];
                        moduleChartData.bindto = "#c3Chart-"+config.correlationValue;

                        $timeout(function() {
                            c3.generate(moduleChartData);
                            $scope.noData=false;
                            $scope.processing=false;
                            },
                        0,
                        false)
                    }
                });
            }
            else {
                $resource('api/3/advanced_charts/:uuid').get({uuid:$scope.config.record_uuid}).$promise.then(function(data) {  
                    if (!data.queryResults) {
                        $scope.noData=true;
                        $scope.processing=false;
                    }
                    else {
                        angular.forEach(data.queryResults, function(value, key) {
                            dataFormat[key] = value;
                        })
    
                        $timeout(function() {
                            c3.generate(dataFormat);
                            $scope.noData=false;
                            $scope.processing=false;
                            },
                        0,
                        false)
                    }
                    /*if(data['hydra:member'].length > 0) {
                        if (!data['hydra:member'][0].queryResults) {
                            $scope.noData=true;
                            $scope.processing=false;
                        }
                        else {
                            angular.forEach(data['hydra:member'][0].queryResults, function(value, key) {
                                dataFormat[key] = value;
                            })
        
                            $timeout(function() {
                                c3.generate(dataFormat);
                                $scope.noData=false;
                                $scope.processing=false;
                                },
                            0,
                            false)
                        }
                    }*/
    
    
                })
            }
        }

        function queryForChartRecord(resource, query) {
            var query={
                'filters': [
                    {
                        'field': 'id',
                        'operator': 'eq',
                        '_operator': 'eq',
                        'value': recordId,
                        'type': 'primitive'
                    }
                ],
                "limit": 1,
                "logic": "AND"
            };
            
            return $resource(API.QUERY + resource).save(query).$promise;
        }

        function generateChartData() {
            let uuid = $scope.config.record_uuid;
        }
        
        init();
    }
})();
