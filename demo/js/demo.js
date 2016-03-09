(function(){
	'use strict';

	angular.module('underscore', []).factory('_', function () { return window._; });
	angular.module('moment', []).factory('moment', function () { return window.moment; });

	angular.module('demoApp',['lui', 'ui.bootstrap', 'ngRoute', 'ngSanitize', 'ui.select', 'ngMockE2E', 'hljs']);

	angular.module('demoApp')
	.controller('bannerCtrl', ['$scope', '$location', function($scope, $location) {
		$scope.isActive = function(viewLocation) {
			return viewLocation === $location.path();
		};
	}]);

	angular.module('demoApp')
	.config(['$routeProvider', '$translateProvider', function($routeProvider, $translateProvider) {
		$routeProvider
			.when('/sass', {
				templateUrl: 'sass-framework.html',
			})
			.when('/icons', {
				templateUrl: 'icons.html'
			})
			.when('/animations', {
				templateUrl: 'animations.html',
			})
			.when('/nguibs', {
				templateUrl: 'nguibs.html',
			})
			.when('/filters', {
				templateUrl: 'filters.html',
			})
			.when('/directives', {
				templateUrl: 'directives.html',
			})
			.when('/lucca', {
				templateUrl: 'lucca-spe.html',
			})
			.otherwise({ redirectTo: '/sass'});

		var culture = 'en';
		$translateProvider.use(culture);
		$translateProvider.preferredLanguage(culture);
		$translateProvider.fallbackLanguage(['en', 'fr']);
		moment.locale(culture)
	}]);

	angular.module('demoApp')
	.run(function($httpBackend) {
		$httpBackend.whenGET('sass-framework.html').passThrough();
		$httpBackend.whenGET('icons.html').passThrough();
		$httpBackend.whenGET('animations.html').passThrough();
		$httpBackend.whenGET('nguibs.html').passThrough();
		$httpBackend.whenGET('filters.html').passThrough();
		$httpBackend.whenGET('directives.html').passThrough();
		$httpBackend.whenGET('lucca-spe.html').passThrough();
	});
})();