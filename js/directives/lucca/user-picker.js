(function(){
	'use strict';
	/**
	** DEPENDENCIES
	**  - moment - for tagging former employees
	**  - underscore
	**  - ui.select
	**  - ngSanitize as a result of the dependency to ui.select
	**/

	var MAX_COUNT = 5; // MAGIC_NUMBER
	var MAGIC_NUMBER_maxUsers = 10000; // Number of users to retrieve when using a user-picker-multiple or custom filter
	var DEFAULT_HOMONYMS_PROPERTIES = ["department.name", "legalEntity.name", "employeeNumber", "mail"]; // MAGIC_STRING

	var uiSelectChoicesTemplate = "<ui-select-choices position=\"down\" repeat=\"user in users\" refresh=\"find($select.search)\" refreshDelay=\"200\" ui-disable-choice=\"!!user.overflow\">" +
	"<div ng-bind-html=\"user.firstName + ' ' + user.lastName | highlight: $select.search\" ng-if=\"!user.overflow\"></div>" +
	"<small ng-if=\"!user.overflow && user.hasHomonyms && getProperty(user, property)\" ng-repeat=\"property in displayedProperties\">{{property}}: {{getProperty(user, property)}}<br/></small>" +
	"<small ng-if=\"showFormerEmployees && user.isFormerEmployee\">VAR_TRAD Parti(e) le {{user.dtContractEnd | luifMoment: 'll'}}</small>" +
	"<small ng-if=\"user.overflow\">{{user.overflow}}</small>" +
	"</ui-select-choices>";

	var userPickerTemplate = "<ui-select ng-model=\"ngModel\" theme=\"bootstrap\"" +
	"class=\"lui regular nguibs-ui-select\" on-select=\"updateSelectedUser($select.selected)\" on-remove=\"onRemove()\" ng-disabled=\"controlDisabled\">" +
	"<ui-select-match placeholder=\"{{ $select.selected.firstName }} {{$select.selected.lastName}}\">{{ $select.selected.firstName }} {{$select.selected.lastName}}</ui-select-match>" +
	uiSelectChoicesTemplate +
	"</ui-select>";

	var userPickerMultipleTemplate = "<ui-select multiple ng-model=\"selected.users\" theme=\"bootstrap\"" +
	"class=\"lui regular nguibs-ui-select\" on-select=\"addSelectedUser()\" on-remove=\"onRemove()\" ng-disabled=\"controlDisabled\">" +
	"<ui-select-match placeholder=\"VAR_TRAD Sélectionner un utilisateur...\">{{$item.firstName}} {{$item.lastName}} " +
	"<span ng-if=\"$item.hasHomonyms\" ng-repeat=\"property in displayedProperties\">&lt{{getProperty($item, property)}}&gt</span>" +
	"<span ng-if=\"$item.isFormerEmployee\">&lt;VAR_TRAD Parti(e) le {{$item.dtContractEnd | luifMoment: 'll'}}&gt;</span>" +
	"</ui-select-match>" +
	uiSelectChoicesTemplate +
	"</ui-select>";


	angular.module('lui.directives')
	.directive('luidUserPicker', function () {
		return {
			restrict: 'E',
			controller: "luidUserPickerController",
			template: userPickerTemplate,
			// require: "luidUserPicker",
			scope: {
				/*** STANDARD ***/
				ngModel: "=",
				onSelect: "&",
				onRemove: "&",
				controlDisabled: "=",
				/*** FORMER EMPLOYEES ***/
				showFormerEmployees: "=", // boolean
				/*** HOMONYMS ***/
				homonymsProperties: "@", // list of properties to handle homonyms
				/*** CUSTOM FILTER ***/
				customFilter: "&", // should be a function with this signature: function(user){ return boolean; } 
				/*** OPERATION SCOPE ***/
				appId: "@",
				operation: "@"
			},
			link: function (scope, elt, attrs, ctrl) {
				if (attrs.homonymsProperties) {
					scope.properties = attrs.homonymsProperties.split(',');
				}
				else {
					scope.properties = DEFAULT_HOMONYMS_PROPERTIES;
				}
				ctrl.isMultipleSelect = false;
				ctrl.asyncPagination = false;
				ctrl.useCustomFilter = !!attrs.customFilter;
			}
		};
	})

	// user-picker-multiple feature, not yet implemented
	// .directive('luidUserPickerMultiple', function () {
	// 	return {
	// 		restrict: 'E',
	// 		controller: "luidUserPickerController",
	// 		template: userPickerMultipleTemplate,
	// 		// require: "luidUserPicker",
	// 		scope: {
	// 			/*** STANDARD ***/
	// 			onSelect: "&",
	// 			onRemove: "&",
	// 			controlDisabled: "=",
	// 			/*** FORMER EMPLOYEES ***/
	// 			showFormerEmployees: "=", // boolean
	// 			/*** HOMONYMS ***/
	// 			homonymsProperties: "@", // list of properties to handle homonyms
	// 			/*** CUSTOM FILTER ***/
	// 			customFilter: "&", // should be a function with this signature: function(user){ return boolean; } 
	// 			/*** OPERATION SCOPE ***/
	// 			appId: "@",
	// 			operation: "@"
	// 		},
	// 		link: function (scope, elt, attrs, ctrl) {
	// 			if (attrs.homonymsProperties) {
	// 				scope.properties = attrs.homonymsProperties.split(',');
	// 			}
	// 			else {
	// 				scope.properties = DEFAULT_HOMONYMS_PROPERTIES;
	// 			}
	// 			ctrl.isMultipleSelect = true;
	// 			ctrl.asyncPagination = false;
	// 			ctrl.useCustomFilter = !!attrs.customFilter;
	// 		}
	// 	};
	// })

	.controller("luidUserPickerController", ['$scope', '$http', 'moment', '$timeout', '$q', function ($scope, $http, moment, $timeout, $q) {
		var ctrl = this;
		// Only used for UserPickerMultiple
		var selectedUsersCount = 0;
		// Only used for asynchronous pagination
		var timeout = {}; // object that handles timeouts - timeout.count will store the id of the timeout related to the count query

		$scope.selected = {};
		$scope.selected.users = [];

		/****************/
		/***** FIND *****/
		/****************/

		$scope.find = function (clue) {
			reinit();
			getUsersAsync(clue).then(
				function(results) {
						if (results.length > 0) {
						var users = results;
						var filteredUsers = filterResults(users);

						if (hasPagination(filteredUsers)) {
							handlePagination(filteredUsers);
							// asyncPagination feature, not yet implemented
							// if (ctrl.asyncPagination) {
							// 	handlePaginationAsync(clue, filteredUsers).catch(
							// 		function(message) {
							// 			errorHandler("GET_COUNT", message);
							// 		}
							// 	);
							// }
							// else {
							// 	handlePagination(filteredUsers);
							// }
						}
						else {
							$scope.users = filteredUsers;
							$scope.count = $scope.users.length;
						}

						/***** POST FILTERS *****/
						if (hasFormerEmployees(filteredUsers)) {
							handleFormerEmployees(filteredUsers);
						}

						if (hasHomonyms(filteredUsers)) {
							tagHomonyms(filteredUsers);
							handleHomonymsAsync(filteredUsers).then(
								function(usersWithHomonymsProperties) {
									filteredUsers = usersWithHomonymsProperties;
								},
								function(message) {
									errorHandler("GET_HOMONYMS_PROPERTIES", message);
								});
						}
					}
					else {
						$scope.users = [{overflow: "VAR_TRAD Pas de résultat."}];
					}
				}, 
				function(message) {
					errorHandler("GET_USERS", message);
				}
			);
		};

		var getUsersPromise; // store the current get request to fetch users
		var reinit = function() {
			reinitTimeout();

			// Reinitialise promise
			// Happen when the user starts typing a name, then waits enough to call the api and continues typing
			// We do not want to treat the result of the previous request since they are now obsolete
			if (getUsersPromise) {
				getUsersPromise.then(function(response) {}); // do nothing with the results
			}
		};

		/*******************/
		/***** FILTERS *****/
		/*******************/

		var filterResults = function(users) {
			var filteredUsers = users;

			// userPickerMultiple feature, not yet implemented
			// // Remove duplicates between results and selected users (for UserPickerMultiple)
			// if (ctrl.isMultipleSelect) {
			// 	// Remove duplicates between results and selected users
			// 	_.each($scope.selected.users, function(selectedUser) {
			// 		filteredUsers = _.reject(users, function(user) {
			// 			return (user.id === selectedUser.id);
			// 		});
			// 		// Add selected user: it will not be displayed, but will be used for homonyms detection
			// 		filteredUsers.push(selectedUser);
			// 	});
			// }

			// Used when a custom filtering function is given
			if (ctrl.useCustomFilter) {
				filteredUsers = _.filter(users, function(user){ return $scope.customFilter(angular.copy(user)); });
			}

			return filteredUsers;
		};

		/*******************/
		/***** TIMEOUT *****/
		/*******************/

		var reinitTimeout = function() {
			// Cancel previous timeout
			if (timeout.count) {
				$timeout.cancel(timeout.count);
			}
		};

		/*****************/
		/***** USERS *****/
		/*****************/

		var getLimit = function() {
			var limit = MAGIC_NUMBER_maxUsers;

			if (ctrl.asyncPagination) {
				limit = MAX_COUNT + 1;
			}
			return limit;
		};

		var getUsersAsync = function(input) {
			var formerEmployees = "formerEmployees=" + ($scope.showFormerEmployees ? "true" : "false");
			var limit = "&limit=" + getLimit();
			var clue = "clue=" + input;
			var query = "/api/v3/users/find?" + (input ? (clue + "&") : "") + formerEmployees + limit;
			var deferred = $q.defer();

			getUsersPromise = $http.get(query);
			getUsersPromise.then(
				function(response) {
					deferred.resolve(response.data.data.items);
				}, 
				function(message) {
					deferred.reject(message);
				}
			);
			return deferred.promise;
		};

		/**********************/
		/***** PAGINATION *****/
		/**********************/

		var hasPagination = function(users) {
			if (users.length > MAX_COUNT) {
				return true;
			}
			return false;
		};

		var handlePagination = function(users) {
			if (!ctrl.asyncPagination) {
				$scope.count = users.length;
			}
			else {
				$scope.count = "...";
			}
			$scope.users = _.first(users, MAX_COUNT);
			handleOverflowMessage();
		};

		// asyncPagination feature, not yet implemented
		// var handlePaginationAsync = function(input, users) {
		// 	var delay = 2500; // default delay is 2,5s
		// 	var deferred = $q.defer();

		// 	reinitTimeout();
		// 	// Only select the X first users and display a message to the user to indicate that there are more results
		// 	handlePagination(users);

		// 	// launch new timeout 
		// 	timeout.count = $timeout(function() {
		// 		getCountAsync(input).then(
		// 			function(count) {
		// 				$scope.count = count;
		// 				handleOverflowMessage();
		// 				deferred.resolve(count);
		// 			},
		// 			function(message) {
		// 				deferred.reject(message);
		// 			}
		// 		);
		// 	}, delay);
		// 	return deferred.promise;
		// };

		// asyncPagination feature, not yet implemented
		// var getCountAsync = function(input) {
		// 	var deferred = $q.defer();
		// 	var dtContractEnd = "&dtcontractend=since," + moment().format("YYYY-MM-DD") + ",null";
		// 	var query = "/api/v3/users?name=like," + input + "&fields=collection.count" + ($scope.showFormerEmployees ? "" : dtContractEnd); // query for count

		// 	delete timeout.count;
		// 	$http.get(query).then(
		// 		function(response) {
		// 			deferred.resolve(response.data.data.count);
		// 		},
		// 		function(message) {
		// 			deferred.reject(message);
		// 		}
		// 	);
		// 	return deferred.promise;
		// };

		var handleOverflowMessage = function() {
			$scope.users.push({ overflow: MAX_COUNT + "/" + $scope.count });
		};

		// userPickerMultiple feature, not yet implemented
		// We probably won't have to use this
		/*
		var updateOverflowMessage = function(maxNbUsers) {
			_.last($scope.users).overflow = MAX_COUNT + "/" + maxNbUsers;
		};
		*/

		/********************/
		/***** HOMONYMS *****/
		/********************/

		var hasHomonyms = function(users) {
			// Should latinise names and take into account composite names
			var usersWithoutHomonyms = _.uniq(users, function(user) { return (user.firstName.toLowerCase() + user.lastName.toLowerCase()); });

			if (usersWithoutHomonyms.length < users.length) {
				return true;
			}
			return false;
		};

		var handleHomonymsAsync = function(users) {
			var homonyms = _.where(users, { hasHomonyms: true });
			var found = false; // indicate if we have found two properties allowing to differentiate homonyms
			var deferred = $q.defer();
			var propertiesArray; // Will contain each couple of properties to compare
			var properties; // Object containing the couple of properties to compare
			$scope.displayedProperties = []; // Will contain the name of the properties to display for homonyms

			getHomonymsPropertiesAsync(homonyms).then(
				function(homonymsArray) {
					// Add fetched properties to the homonyms
					_.each(homonyms, function(user) {
						// Get the user returned by the api
						var userWithProps = _.find(homonymsArray, function(homonym) {
							return (user.id === homonym.id);
						});

						// Add each property to the user
						_.each($scope.properties, function(prop) {
							var newProp = prop.split('.')[0];
							user[newProp] = userWithProps[newProp];
						});
					});

					// Compare properties between homonyms
					_.each($scope.properties, function (prop1, propIndex1) {
						if (!found) {
							// Compare prop1 with the rest of the properties array
							var propRest = _.rest($scope.properties, propIndex1 + 1);
							_.each(propRest, function (prop2, index) {
								if (!found) {
									// Build array with the two properties
									// Each element of the array is an object with the properties that we want to compare
									propertiesArray = [];
									_.each(homonymsArray, function(item) {
										var valueProp1 = $scope.getProperty(item, prop1);
										var valueProp2 = $scope.getProperty(item, prop2);
										properties = {};
										properties[prop1] = valueProp1;
										properties[prop2] = valueProp2;
										propertiesArray.push(properties);
									});

									// Used to check that all values for prop1 are not equal
									var prop1Values = _.chain(propertiesArray)
										.pluck(prop1)
										.uniq()
										.value();
									// Used to check that all values for prop2 are not equal
									var prop2Values = _.chain(propertiesArray)
										.pluck(prop2)
										.uniq()
										.value();

									// All values for both properties must not be equal
									// There must be at least two different values
									if ((prop1Values.length > 1) && (prop2Values.length > 1)) {
										// Check that each couple of values is different from the other couples
										var withoutDuplicates = _.uniq(propertiesArray, function(item) { return (item[prop1] + item[prop2]); });
										// If the arrays have the same length, each couple of values is different
										if (withoutDuplicates.length === propertiesArray.length) {
											found = true;
											$scope.displayedProperties.push(prop1);
											$scope.displayedProperties.push(prop2);
										}
									}
								}
							});
						}
					});

					// TODO: handle if no couple of properties allows to differentiate users
					deferred.resolve(users);
				},
				function(message) {
					deferred.reject(message);
				}
			);
			return deferred.promise;
		};

		var tagHomonyms = function(users) {
			_.each(users, function(user, index) {
				var rest = _.rest(users, index + 1);
				_.each(rest, function(otherUser) {
					// Should latinise names and take into account composite names
					if ((user.firstName.toLowerCase() === otherUser.firstName.toLowerCase()) && (user.lastName.toLowerCase() === otherUser.lastName.toLowerCase())) {
						user.hasHomonyms = true;
						otherUser.hasHomonyms = true;
					}
				});
			});
		};

		/*******************************/
		/***** HOMONYMS PROPERTIES *****/
		/*******************************/

		var getHomonymsPropertiesAsync = function(homonyms) {
			var urlCalls = [];
			var query = "/api/v3/users?id=";
			var fields = "&fields=id,firstname,lastname";
			var deferred = $q.defer();

			// WARNING: Do not check if the properties exist!
			// WARNING: If they do not exist, the request will fail
			_.each($scope.properties, function(prop) {
				fields += "," + prop;
			});

			_.each(homonyms, function(user) {
				if (user !== _.last(homonyms)) {
					query += (user.id + ',');
				}
				else {
					query += (user.id + fields);
				}
			});

			$http.get(query).then(
				function(response) {
					var homonyms = response.data.data.items;
					deferred.resolve(homonyms);
				}, function(message) {
					deferred.reject(message);
				}
			);
			return deferred.promise;
		};

		$scope.getProperty = function(user, prop) {
			var propList = prop.split('.');
			var value = user[_.first(propList)];

			_.each(propList, function(item) {
				if (value && (item !== _.first(propList))) {
					value = value[item];
				}
			});
			return value;
		};

		/****************************/
		/***** FORMER EMPLOYEES *****/
		/****************************/

		var hasFormerEmployees = function(users) {
			var formerEmployee = _.find(users, function(user) {
				return (moment(user.dtContractEnd).isBefore(moment()));
			});

			if (formerEmployee) {
				return true;
			}
			return false;
		};

		var handleFormerEmployees = function(users) {
			_.each(users, function(user) {
				if (moment(user.dtContractEnd).isBefore(moment())) {
					user.isFormerEmployee = true;
				}
			});
		};

		/*********************/
		/***** ON-SELECT *****/
		/*********************/

		$scope.updateSelectedUser = function(selectedUser) {
			$scope.onSelect();
			// Bind the selected user to the ng-model in luid-user-picker directive
			$scope.ngModel = selectedUser;
		};

		// userPickerMultiple feature, not yet implemented
		// // Used by UserPickerMultiple
		// // Function executed when onSelect is fired
		// $scope.addSelectedUser = function () {
		// 	$scope.onSelect();
		// 	selectedUsersCount++;
		// 	// Update overflow message
		// 	if ($scope.count > MAX_COUNT) {
		// 		// Should always display MAX_COUNT users!
		// 		//$scope.users = updateOverflowMessage($scope.users, MAX_COUNT - selectedUsersCount, $scope.count);
		// 	}
		// };

		/**************************/
		/***** ERROR HANDLING *****/
		/**************************/

		var errorHandler = function(cause, message) {
			switch (cause) {
				case "GET_USERS": // error while trying to get the users matching the query
					$scope.users = [];
					$scope.users.push({ overflow: "VAR_TRAD Nous n'avons pas réussi à récupérer les utilisateurs correspondant à votre requête. Tant pis !" });
					break;
				case "GET_COUNT": // error while trying to get the total number of users matching the query
				case "GET_HOMONYMS_PROPERTIES":  // error while trying to get the distinctive properties for homonyms
					console.log(cause + ": " + message);
					break;
			}
		};
	}]);
})();
