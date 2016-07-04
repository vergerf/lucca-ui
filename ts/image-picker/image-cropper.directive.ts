module Lui {
	"use strict";
	export interface IFile {
		id?: string;
		name?: string;
		href: string;
	}
}
module Lui.Directives {
	"use strict";
	interface IImageCropperScope extends angular.IScope {
		image: string;
		cropped: string;
		cancelLabel: string;

		cancel(): void;
		crop(): void;
		donotcrop(): void;
		openCropper(): void;

		onCropped(cropped: string): void;
	}
	export class LuidImageCropper implements angular.IDirective {
		public static IID = "luidImageCropper";
		public controller = LuidImageCropperController.IID;
		public restrict = "AE";
		public scope = {
			onCropped: "=",
		};

		public static Factory(): angular.IDirectiveFactory {
			let directive = () => { return new LuidImageCropper(); };
			directive.$inject = [];
			return directive;
		};

		constructor() {
			// Constructor code here
		};

		public link: ng.IDirectiveLinkFn = (scope: IImageCropperScope, element: ng.IAugmentedJQuery, attrs: ng.IAttributes): void => {

			let handleFileSelect = (evt) => {
				let file = evt.currentTarget.files[0];
				let reader = new FileReader();
				/* tslint:disable */
				// see https://github.com/Microsoft/TypeScript/issues/4163
				reader.onload = (event: any) => {
				/* tslint:enable */
					scope.$apply(($scope) => {
					scope.image = event.target.result;
					scope.openCropper();
					});
				};
				reader.readAsDataURL(file);
			};

			angular.element(element[0]).on("change", handleFileSelect);
		};
	}
	class LuidImageCropperController {
		public static IID: string = "luidImageCropperController";
		public static $inject: Array<string> = ["$scope", "moment", "$uibModal", "luisConfig"];

		constructor($scope: IImageCropperScope, moment: moment.MomentStatic, $uibModal: angular.ui.bootstrap.IModalService, luisConfig: Lui.IConfig) {
			$scope.image = "";
			$scope.cropped = "";

			$scope.openCropper = () => {
				let modalOptions: ng.ui.bootstrap.IModalSettings & { appendTo: ng.IAugmentedJQuery } = {
					templateUrl: "lui/templates/image-picker/image-cropper.modal.html",
					controller: LuidImageCropperModalController.IID,
					size: "desktop",
					windowClass: luisConfig.prefix,
					backdropClass: luisConfig.prefix,
					appendTo: luisConfig.parentElt,
					resolve: {
						image: (): string => {
							return $scope.image;
						},
						cancelLabel: (): string => {
							return luisConfig.cancelLabel;
						}
					},
				};
				let modalInstance = $uibModal.open(modalOptions);
				modalInstance.result.then((cropped: string) => {
					$scope.cropped = cropped;
					$scope.onCropped(cropped);
				}, () => { return; });
			};
		}
	}
	class LuidImageCropperModalController {
		public static IID: string = "luidImageCropperModalController";
		public static $inject: Array<string> = ["$scope", "$uibModalInstance", "moment", "image", "cancelLabel"];

		constructor($scope: IImageCropperScope, $uibModalInstance: ng.ui.bootstrap.IModalServiceInstance, moment: moment.MomentStatic, image: string, cancelLabel: string) {
			let doClose: boolean = false;
			$scope.image = image;
			$scope.cancelLabel = cancelLabel;

			$scope.crop = () => {
				doClose = true;
				$uibModalInstance.close($scope.cropped);
			};
			$scope.donotcrop = () => {
				doClose = true;
				$uibModalInstance.close($scope.image);
			};
			$scope.cancel = () => {
				doClose = true;
				$uibModalInstance.dismiss();
			};
			$scope.$on("modal.closing", ($event: ng.IAngularEvent): void => {
				if (!doClose) {
					$event.preventDefault();
				}
			});
		}
	}

	angular.module("lui.directives").directive(LuidImageCropper.IID, LuidImageCropper.Factory());
	angular.module("lui.directives").controller(LuidImageCropperController.IID, LuidImageCropperController);
	angular.module("lui.directives").controller(LuidImageCropperModalController.IID, LuidImageCropperModalController);
}
					// uploaderService.postDataURI(cropped).then((file: IFile) => {
