(function(){
	'use strict';

	angular.module('demoApp')
	.controller("enterCtrl", ["$scope", function($scope){
		$scope.array = [];
		$scope.add = function(){
			$scope.array.push($scope.animation +  " from " + $scope.direction);
		};
		$scope.direction = "up";
		$scope.animation = "fade in";
	}]);
})();
