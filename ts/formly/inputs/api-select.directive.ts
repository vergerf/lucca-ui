module dir.directives {
	"use strict";
	let MAGIC_PAGING = "0,10";
	class ApiSelect implements angular.IDirective {
		public static IID = "luidApiSelect";
		public restrict = "AE";
		public templateUrl = "lui/templates/formly/inputs/api-select.html";
		public scope = {
			api: "=",
			filter: "=",
			placeholder: "@",
		};
		public controller = ApiSelectController.IID;

		public static factory(): angular.IDirectiveFactory {
			let directive = () => {
				return new ApiSelect();
			};
			return directive;
		}
	}
	interface IStandardApiResource {
		id: string | number;
		name: string;
	}
	class StandardApiService {
		public static IID: string = "luisStandardApiService";
		public static $inject: Array<string> = ["$http"];
		private $http: ng.IHttpService;

		constructor($http: angular.IHttpService) {
			this.$http = $http;
		}
		public get(clue: string, api: string, additionalFilter?: string): ng.IPromise<IStandardApiResource[]> {
			let clueFilter: string = !!clue ? "name=like," + clue : "paging=" + MAGIC_PAGING;
			let filter = clueFilter + (!!additionalFilter ? "&" + additionalFilter : "");
			return this.$http.get(api + "?" + filter + "&fields=id,name")
			.then( (response: ng.IHttpPromiseCallbackArg<{data: { items: IStandardApiResource[] } }>) => {
				return response.data.data.items;
			});
		}
	}
	interface IApiSelectController extends ng.IScope {
		api: string;
		filter: string;
		choices: IStandardApiResource[];

		refresh(clue: string): void;
	}
	class ApiSelectController {
		public static IID: string = "luidApiSelectController";
		public static $inject: Array<string> = [
			"$scope",
			StandardApiService.IID,
		];
		constructor(
			$scope: IApiSelectController,
			service: StandardApiService
		) {
			$scope.refresh = (clue: string) => {
				service.get(clue, $scope.api, $scope.filter)
				.then((choices) => {
					$scope.choices = choices;
				});
			};
		}
	}
	angular.module("lui.directives").controller(ApiSelectController.IID, ApiSelectController);
	angular.module("lui.directives").directive(ApiSelect.IID, ApiSelect.factory());
	angular.module("lui.directives").service(StandardApiService.IID, StandardApiService);
}