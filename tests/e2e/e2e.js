(function(){
	'use strict';

	angular.module('e2eApp', ['lui']);

	angular.module('e2eApp')
	.controller("luifPlaceholderCtrl",['$scope', function($scope){
		$scope.myValue = "stuff";
		$scope.myPlaceholder = "placeholder";
	}]);

	angular.module('e2eApp')
	.controller("luifDefaultCodeCtrl",['$scope', function($scope){
		$scope.myValue = "stuff";
	}]);
})();