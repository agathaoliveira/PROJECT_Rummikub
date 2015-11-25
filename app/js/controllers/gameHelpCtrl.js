angular.module('myApp').controller('HelpCtrl', ['$scope','$modal','$log',function ($scope, $modal, $log) {

    'use strict';


    $scope.items = ['item1', 'item2', 'item3'];

    $scope.open = function (size) {

        var modalInstance = $modal.open({
            templateUrl: 'help.html',
            controller: 'ModalInstanceCtrl',
            size: size,
            resolve: {
                items: function () {
                    return $scope.items;
                }
            }
        });

        modalInstance.result.then(function (selectedItem) {
            $scope.selected = selectedItem;
        }, function () {
            $log.info('Modal dismissed at: ' + new Date());
        });
    };



}]);

angular.module('myApp').controller('ModalInstanceCtrl',['$scope','$modalInstance','items', function ($scope, $modalInstance, items) {

    'use strict';
    $scope.items = items;
    $scope.selected = {
        item: $scope.items[0]
    };

    $scope.ok = function () {
        $modalInstance.close($scope.selected.item);
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
}]);

angular.module('myApp').controller('CarouselDemoCtrl',['$scope', function ($scope) {
    'use strict';
    $scope.helps = [
        {"image": "img/valid.png", "rule": 'Meld tiles in your hand in runs or groups'},
        {"image": "img/valid-runs.png", "rule": 'Valid run: at least 3 tiles, same color, consecutive numbers'},
        {"image": "img/valid-groups.png", "rule": 'Valid group: at least 3 tiles, different colors, same number'},
        {"image": "img/valid-joker.png", "rule": 'Use joker tile to substitute'},
        {"image": "img/valid-run2.png", "rule": 'To achieve first time meld, tiles sent should sum to 30 scores'}
    ];
    $scope.myInterval = 0;
}]);
