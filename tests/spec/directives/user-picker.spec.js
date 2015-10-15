describe('luidUserPicker', function(){
	beforeEach(module('moment'));
	beforeEach(module('underscore'));
	beforeEach(module('ngMock'));
	beforeEach(module('lui'));
	beforeEach(module('lui.directives'));

	var _, $scope, isolateScope, $compile, elt, $httpBackend, controller, moment, $timeout;
	var users;

	var findApi = /api\/v3\/users\/find\?.*/;

	beforeEach(inject(function (_$rootScope_, _$compile_, ___, _$httpBackend_, _moment_, _$timeout_) {
		_ = ___;
		$scope = _$rootScope_.$new();
		$httpBackend = _$httpBackend_;
		$timeout = _$timeout_;
		$compile = _$compile_;
		moment = _moment_;
	}));

	// describe('most basic-est use', function(){
	// 	beforeEach(function(){
	// 		var tpl = angular.element('<luid-user-picker ng-model="myUser"></luid-user-picker>');
	// 		elt = $compile(tpl)($scope);
	// 		isolateScope = elt.isolateScope();
	// 		controller = elt.controller;
	// 		$scope.$digest();
	// 		isolateScope.find();
	// 		$httpBackend.expectGET('/api/v3/users/find?formerEmployees=false&limit=6').respond(200, RESPONSE_initWithoutFormerEmployees);
	// 	});
	// 	it('should initialise users', function(){
	// 		$httpBackend.flush();
	// 		expect(isolateScope.users).toBeDefined();
	// 	});
	// 	it('should initialise users with the 5 first users returned by the api', function() {
	// 		users = [{"id":0,"name":"Lucca Admin","firstName":"Lucca","lastName":"Admin"},{"id":328,"name":"Gilles Satgé","firstName":"Gilles","lastName":"Satgé"},{"id":329,"name":"Frédéric Pot","firstName":"Frédéric","lastName":"Pot"},{"id":338,"name":"Bruno Catteau","firstName":"Bruno","lastName":"Catteau"},{"id":344,"name":"Nicolas Faugout","firstName":"Nicolas","lastName":"Faugout"},{"overflow":"5/..."}];
	// 		$httpBackend.flush();
	// 		expect(angular.equals(isolateScope.users, users)).toBe(true);
	// 	});

	// 	describe('with pagination', function() {
	// 		beforeEach(function() {
	// 			$httpBackend.flush();
	// 			$timeout.flush();
	// 			//$httpBackend.expectGET('/api/v3/users/find?formerEmployees=false&limit=6').respond(200, RESPONSE_initWithoutFormerEmployees);
	// 		});
	// 		it('should get the number of users', function() {

	// 		});
	// 	});
	// });

	/**********************
	** INITIALISATION    **
	**********************/
	describe("initialisation", function(){
		// it might not be possible to test this 
		// as the refresh attribute from the ui-select-choice directive
		// https://github.com/angular-ui/ui-select/wiki/ui-select-choices
		// might be triggered by the browser and not by $compile
		// or it is triggered before we spyOn it and not by the $scope.$digest

		// yeah, here find is not called either during $compile or $scope.$digest
		// you can modify this plunkr 
		// http://plnkr.co/edit/a3KlK8dKH3wwiiksDSn2?p=preview
		// you can see that refreshAddresses is called during the loading of the page
		// but i have no idea how to trigger it here
		it("should call isolateScope.find('')", function(){
			var tpl = angular.element('<luid-user-picker ng-model="myUser"></luid-user-picker>');
			elt = $compile(tpl)($scope);
			isolateScope = elt.isolateScope();
			spyOn(isolateScope, 'find');
			$scope.$digest();
			// expect(isolateScope.find).toHaveBeenCalled();
		});
	});

	/**********************
	** BASIC             **
	**********************/
	describe("no pagination, no former employees, no homonyms", function(){
		var findApiWithClue = /api\/v3\/users\/find\?\&clue=/;
		var findApiWithoutClue = /api\/v3\/users\/find\?/;
		var standardFilters = /formerEmployees=false\&limit=\d*/;
		beforeEach(function(){
			var tpl = angular.element('<luid-user-picker ng-model="myUser"></luid-user-picker>');
			elt = $compile(tpl)($scope);
			isolateScope = elt.isolateScope();
			$scope.$digest();
		});
		it('should call the api with the right filters when isolateScope.find("clue") is called', function(){
			// no clue
			$httpBackend.expectGET(new RegExp(findApiWithoutClue.source + standardFilters.source)).respond(200, RESPONSE_0_users);
			isolateScope.find();
			$httpBackend.flush();
			// a clue
			var clues = ['a', 'ismael', 'zanzibar'];
			_.each(clues, function(clue){
				$httpBackend.expectGET(new RegExp(findApiWithClue.source + clue + (/\&/).source + standardFilters.source)).respond(200, RESPONSE_0_users);
				isolateScope.find(clue);
				$httpBackend.flush();
			});
		});
		it('should handle the response', function(){
			$httpBackend.expectGET(findApi).respond(200, RESPONSE_4_users);
			isolateScope.find();
			$httpBackend.flush();

			// TODO_ANAIS
			// expect(isolateScope.users).toBe(something);
		});
		it('should handle errors', function(){
			$httpBackend.expectGET(findApi).respond(500, RESPONSE_ERROR_FIND);
			isolateScope.find();
			$httpBackend.flush();

			// TODO_ANAIS
			// expect(isolateScope.users).toBe(something);
		});
	});

	// TODO
	/**********************
	** PAGINATION        **
	**********************/
	describe("with pagination", function(){
		beforeEach(function(){
			var tpl = angular.element('<luid-user-picker ng-model="myUser"></luid-user-picker>');
			elt = $compile(tpl)($scope);
			isolateScope = elt.isolateScope();
			$scope.$digest();

			$httpBackend.whenGET(findApi).respond(200, RESPONSE_20_users);
		});
		it('should detect there is too many users to display', function(){
			isolateScope.find();
			$httpBackend.flush();

			// TODO_ANAIS
			// expect(isolateScope.displayedUsers.length).toBe(less than 20);
			// expect(last displayed user).toBe(the label displaying 'results 1-5/20')
		});
	});
	// Async
	describe("with async pagination", function(){
		beforeEach(function(){
			var tpl = angular.element('<luid-user-picker ng-model="myUser"></luid-user-picker>');
			elt = $compile(tpl)($scope);
			isolateScope = elt.isolateScope();
			$scope.$digest();

			$httpBackend.expectGET(findApi).respond(200, RESPONSE_20_users);
		});
		it('should detect there is too many users to display and ask for how many results there is', function(){
			isolateScope.find();
			$httpBackend.flush();

			// TODO_ANAIS
			// expect(isolateScope.displayedUsers.length).toBe(less than 20);
			// expect(last displayed user).toBe(the label displaying 'results 1-5/20')

			// might need a $scope.$apply here to resolve some promises
			// $httpBackend.expectGET(findApi).respond(200, RESPONSE_find_count);
			// $timeout.flush();
			// $httpBackend.flush();
		});
		it('should ask how many user ther is only once its timeout is resolved, not after each find', function(){
			isolateScope.find('a');
			$httpBackend.flush();

			$httpBackend.expectGET(findApi).respond(200, RESPONSE_20_users);
			isolateScope.find('ab');
			$httpBackend.flush();
			$httpBackend.expectGET(findApi).respond(200, RESPONSE_20_users);
			isolateScope.find('abc');
			$httpBackend.flush();

			// TODO_ANAIS
			// expect(isolateScope.displayedUsers.length).toBe(less than 20);
			// expect(last displayed user).toBe(the label displaying 'results 1-5/20')

			// might need a $scope.$apply here to resolve some promises
			// $httpBackend.expectGET(findApi).respond(200, RESPONSE_find_count);
			// $timeout.flush();
			// $httpBackend.flush();
		});
		it('should handle error when asking for the number of results', function(){
			isolateScope.find('a');
			$httpBackend.flush();

			$httpBackend.expectGET(findApi).respond(200, RESPONSE_20_users);
			isolateScope.find('ab');
			$httpBackend.flush();
			$httpBackend.expectGET(findApi).respond(200, RESPONSE_20_users);
			isolateScope.find('abc');
			$httpBackend.flush();

			// TODO_ANAIS
			// expect(isolateScope.displayedUsers.length).toBe(less than 20);
			// expect(last displayed user).toBe(the label displaying 'results 1-5/20')

			// might need a $scope.$apply here to resolve some promises
			// $httpBackend.expectGET(findApi).respond(500, RESPONSE_ERROR_COUNT;
			// $timeout.flush();
			// $httpBackend.flush();
		});
	});

	// TODO
	/**********************
	** FORMER EMPLOYEES  **
	**********************/
	describe("with former employees", function(){
		var findApiWithClue = /api\/v3\/users\/find\?\&clue=/;
		var standardFilters = /\&formerEmployees=true\&limit=\d*/;
		beforeEach(function(){
			var tpl = angular.element('<luid-user-picker ng-model="myUser" show-former-employees="showFE"></luid-user-picker>');
			$scope.showFE = true;
			elt = $compile(tpl)($scope);
			isolateScope = elt.isolateScope();
			$scope.$digest();
		});
		it('should call the api with the right filters when isolateScope.find("clue") is called', function(){
			var clues = ['a', 'ismael', 'zanzibar'];
			_.each(clues, function(clue){
				$httpBackend.expectGET(new RegExp(findApiWithClue.source + clue + standardFilters.source)).respond(200, RESPONSE_0_users);
				isolateScope.find(clue);
				$httpBackend.flush();
			});
		});
		it('should detect and flag former employees in the response', function(){
			$httpBackend.expectGET(findApi).respond(200, RESPONSE_4_users_FE);
			isolateScope.find();
			$httpBackend.flush();

			// TODO_ANAIS
			// expect(xavier.isFormerEmployee).toBe(true);
		})
	});

	// TODO
	/**********************
	** CUSTOM FILTERING  **
	**********************/
	describe("with custom filtering", function(){
		beforeEach(function(){
			var tpl = angular.element('<luid-user-picker ng-model="myUser" custom-filter="customFilter"></luid-user-picker>');
			$scope.customFilter = function(user) { // only user with even id
				return user.id % 2 === 0;
			};
			elt = $compile(tpl)($scope);
			isolateScope = elt.isolateScope();
			$scope.$digest();

			$httpBackend.whenGET(findApi).respond(200, RESPONSE_4_users);
		});

		it("should call $scope.customFilter N times", function(){
			spyOn($scope, 'customFilter').and.callThrough();
			isolateScope.find();
			// TODO_ANAIS make it work
			// expect($scope.customFilter).toHaveBeenCalled();
			// expect($scope.customFilter.calls.count()).toBe(4);
		});
		it("should display all when customFilter returns true", function(){
			spyOn($scope, 'customFilter').and.returnValue(true); // all users
			isolateScope.find();
			// TODO_ANAIS make it work
			// expect(isolateScope.users.length).toBe(4);
		});
		it("should display nothing when customFilter returns false", function(){
			spyOn($scope, 'customFilter').and.returnValue(false); // no users
			isolateScope.find();
			// TODO_ANAIS make it work
			// expect(isolateScope.users.length).toBe(0);
		});
		it("should display the right results", function(){
			spyOn($scope, 'customFilter').and.callThrough(); // 2 users
			isolateScope.find();
			// TODO_ANAIS make it work
			// expect(isolateScope.users.length).toBe(the right number, i guess 2);
		});
	});

	// TODO
	/**********************
	** OPERATION SCOPE   **
	**********************/
	describe("with filtering on an operation scope", function(){
		var findApiWithClue = /api\/v3\/users\/find\?\&clue=/;
		var findApiWithoutClue = /api\/v3\/users\/find\?/;
		var standardFilters = /formerEmployees=false\&limit=\d*/;
		// TODO_ANAIS change regex so it works, it should look something like that
		// var standardFilters = /formerEmployees=false\&limit=\d*\&applicationId=\d*\&operations=1,2,3/;
		beforeEach(function(){
			// TODO_ANAIS change the html template
			var tpl = angular.element('<luid-user-picker ng-model="myUser"></luid-user-picker>');
			elt = $compile(tpl)($scope);
			isolateScope = elt.isolateScope();
			$scope.$digest();
		});
		it('should call the api with the right filters when isolateScope.find("clue") is called', function(){
			// no clue
			$httpBackend.expectGET(new RegExp(findApiWithoutClue.source + standardFilters.source)).respond(200, RESPONSE_0_users);
			isolateScope.find();
			$httpBackend.flush();
			// a clue
			var clues = ['a', 'ismael', 'zanzibar'];
			_.each(clues, function(clue){
				$httpBackend.expectGET(new RegExp(findApiWithClue.source + clue + (/\&/).source + standardFilters.source)).respond(200, RESPONSE_0_users);
				isolateScope.find(clue);
				$httpBackend.flush();
			});
		});
		
	});

	// TODO
	/**********************
	** HOMONYMS          **
	**********************/
	describe("with homonyms", function(){

	});

	// TODO
	/**********************
	** HOMONYMS WITH     **
	** CUSTOM PROPERTIES **
	**********************/
	describe("with homonyms and custom properties", function(){

	});

	// TODO
	/**********************
	** MULTISELECT       **
	**********************/
	describe("handling multi-select", function(){

	});

	// TODO
	/**********************
	** MULTISELECT WITH  **
	** HOMONYMS SELECTED **
	**********************/
	describe("handling multi select with some homonyms thrown in the mix", function(){

	});



	// responses from api
	var RESPONSE_userWhoseNameBeginsWithBe = {"header":{},"data":{"items":[{"id":401,"firstName":"Jean-Baptiste","lastName":"Beuzelin","employeeNumber":"3","mail":"no-reply@lucca.fr","dtContractEnd":null},{"id":416,"firstName":"Benoit","lastName":"Paugam","employeeNumber":"00057","mail":"no-reply@lucca.fr","dtContractEnd":null},{"id":421,"firstName":"Lucien","lastName":"Bertin","employeeNumber":"00068","mail":"no-reply@lucca.fr","dtContractEnd":null}]}};
	var RESPONSE_initWithoutFormerEmployees = {"header":{},"data":{"items":[{"id":0,"name":"Lucca Admin","firstName":"Lucca","lastName":"Admin"},{"id":328,"name":"Gilles Satgé","firstName":"Gilles","lastName":"Satgé"},{"id":329,"name":"Frédéric Pot","firstName":"Frédéric","lastName":"Pot"},{"id":338,"name":"Bruno Catteau","firstName":"Bruno","lastName":"Catteau"},{"id":344,"name":"Nicolas Faugout","firstName":"Nicolas","lastName":"Faugout"},{"id":353,"name":"Guillaume Allain","firstName":"Guillaume","lastName":"Allain"}]}};
	var RESPONSE_initCount = {"header":{},"data":{"count":51,"items":[]}};
	//var RESPONSE_initWithFormerEmployees = {"header":{},"data":{"items":[{"id":0,"name":"Lucca Admin","firstName":"Lucca","lastName":"Admin"},{"id":324,"name":"Administrateur Administrateur","firstName":"Administrateur","lastName":"Administrateur"},{"id":328,"name":"Gilles Satgé","firstName":"Gilles","lastName":"Satgé"},{"id":329,"name":"Frédéric Pot","firstName":"Frédéric","lastName":"Pot"},{"id":330,"name":"Catherine Foliot","firstName":"Catherine","lastName":"Foliot"},{"id":331,"name":"Catherine Lenzi","firstName":"Catherine","lastName":"Lenzi"},{"id":338,"name":"Bruno Catteau","firstName":"Bruno","lastName":"Catteau"},{"id":340,"name":"Olivier Ducros","firstName":"Olivier","lastName":"Ducros"},{"id":342,"name":"Olivier Ducros","firstName":"Olivier","lastName":"Ducros"},{"id":344,"name":"Nicolas Faugout","firstName":"Nicolas","lastName":"Faugout"},{"id":348,"name":"Aurélien Bottazini","firstName":"Aurélien","lastName":"Bottazini"},{"id":352,"name":"Régis de Germay","firstName":"Régis","lastName":"de Germay"}]}};


	// TODO_ANAIS - fill the mocked api response
	// N users, no former employees, no homonyms
	var RESPONSE_0_users = {header:{}, data:{items:[]}};
	var RESPONSE_4_users = {header:{}, data:{items:[]}};
	var RESPONSE_20_users = {header:{}, data:{items:[]}};

	// N users, SOME former employees, no homonyms
	var RESPONSE_4_users_FE = {header:{}, data:{items:[]}};
	var RESPONSE_20_users_FE = {header:{}, data:{items:[]}};

	// N users, no former employees, SOME homonyms
	var RESPONSE_4_users_homonyms = {header:{}, data:{items:[]}};
	var RESPONSE_20_users_homonyms = {header:{}, data:{items:[]}};

	// N users, SOME former employees, SOME homonyms
	var RESPONSE_4_users_FE_homonyms = {header:{}, data:{items:[]}};
	var RESPONSE_20_users_FE_homonyms = {header:{}, data:{items:[]}};

	// Details on homonyms
	var RESPONSE_homonyms_details = {header:{}, data:{items:[]}};

	// count
	var RESPONSE_find_count = {header:{}, data:{}};
	// Errors
	var RESPONSE_ERROR_FIND = {Message:"error_find"};
	var RESPONSE_ERROR_COUNT = {Message:"error_count"};
});

