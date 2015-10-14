(function(){
	'use strict';

	angular.module('iconsApp',[])
	.controller('iconsCtrl', ['$scope', function($scope){
		$scope.contextSensIcons = [
			['plus', 'minus', 'check', 'cross', 'forbidden'],
			['error','warning','help'],
			["ellipsis", "list", "tree list", "blocks", "filter"],
			['checkbox', 'checkbox checked'],
			['lock', 'unlock'],
		];

		$scope.contextInsensIcons = [
			['attachment', 'files', "email", "phone", "notification", "camera", "settings", "gallery","calendar", "clock", "timer", "pin", "location", "comment", "bookmark", "branch", "analytics"],
			["edit", "edit frame", "edit mini", "download", "upload", "outside", "send", "search", "trash", "refresh", "printer"],
			["user", "add user", "remove user", "to user"],
		];

		$scope.mouseIcons = [
			['drag', 'drag2'],
			['move','move horizontally','move vertically']
		];

		$scope.arrowIcons = [
			['north chevron','east chevron','south chevron','west chevron'],
			['north arrow','east arrow','south arrow','west arrow']
		];

		$scope.speIcons = [
			["breakfast", "coffee", "meal", "lunch", "diner", "drink"],
			["car", "clean car", "taxi", "bus", "subway", "truck", "train", "plane"],
			["euro toll", "dollar toll", "parking", "milestone", "mileage", "gasoline"],
			["journey", "luggage", "hotel", "postage"],
			["euro", "dollar", "quantity", "piggy bank", "bank card", "pricetag", "payment"],
			["computer", "computer mouse", "database"],
			["tools", "tiles", "iron", "jumping cc"]
		];
	}]);
})();