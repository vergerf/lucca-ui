module lui.datepicker {
	"use strict";
	class LuidDatePicker implements angular.IDirective {
		public static IID: string = "luidDatePicker";
		public restrict = "E";
		public templateUrl = "lui/templates/date-picker/datepicker-inline.html";
		public require = ["ngModel", "luidDatePicker"];
		public scope = {
			format: "@",
			displayedCalendars: "@",
			minMode: "@",
			min: "=",
			max: "=",
			customClass: "=",
		};
		public controller: string = LuidDatePickerController.IID;
		public static factory(): angular.IDirectiveFactory {
			let directive = () => {
				return new LuidDatePicker();
			};
			return directive;
		}
		public link(scope: IDatePickerScope, element: angular.IAugmentedJQuery, attrs: angular.IAttributes, ctrls: any[]): void {
			let ngModelCtrl = <ng.INgModelController>ctrls[0];
			let datePickerCtrl = <LuidDatePickerController>ctrls[1];
			datePickerCtrl.setFormat(scope.format);
			datePickerCtrl.setNgModelCtrl(ngModelCtrl);
			datePickerCtrl.setCalendarCnt(scope.displayedCalendars);
		}
	}
	class LuidDatePickerPopup implements angular.IDirective {
		public static IID: string = "luidDatePickerPopup";
		public restrict = "E";
		public templateUrl = "lui/templates/date-picker/datepicker-popup.html";
		public require = ["ngModel", "luidDatePickerPopup"];
		public scope = {
			format: "@",
			displayFormat: "@",
			displayedCalendars: "@",
			minMode: "@",
			min: "=",
			max: "=",
			customClass: "=",

			placeholder: "@",

			shortcuts: "=",
			groupedShortcuts: "=",
			disableKeyboardInput: "="
		};
		public controller: string = LuidDatePickerController.IID;
		public static factory(): angular.IDirectiveFactory {
			let directive = () => {
				return new LuidDatePickerPopup();
			};
			return directive;
		}
		public link(scope: IDatePickerScope, element: angular.IAugmentedJQuery, attrs: angular.IAttributes, ctrls: any[]): void {
			let ngModelCtrl = <ng.INgModelController>ctrls[0];
			let datePickerCtrl = <LuidDatePickerController>ctrls[1];
			datePickerCtrl.setElement(element);
			datePickerCtrl.setFormat(scope.format, scope.displayFormat);
			datePickerCtrl.setNgModelCtrl(ngModelCtrl);
			datePickerCtrl.setCalendarCnt(scope.displayedCalendars, true);
			datePickerCtrl.setPopoverTrigger(element, scope);
		}
	}

	interface IDatePickerScope extends ng.IScope, popover.IClickoutsideTriggerScope, ICalendarScope {
		format: string;
		displayedCalendars: string;

		displayStr: string;
		displayFormat: string;

		closePopoverOnKeyPress: { [key: number]: ($event: ng.IAngularEvent) => void };

		disableKeyboardInput: boolean;

		togglePopover($event: ng.IAngularEvent): void;
		openPopover($event: ng.IAngularEvent): void;
		onDisplayStrChanged($event: ng.IAngularEvent): void;
		// closePopover($event: ng.IAngularEvent): void;
		clear($event: ng.IAngularEvent): void;
	}

	class LuidDatePickerController extends CalendarController {
		public static IID: string = "luidDatePickerController";
		public static $inject: Array<string> = ["$scope", "$log", "$timeout"];
		protected $scope: IDatePickerScope;
		private formatter: IFormatter<moment.Moment>;
		private ngModelCtrl: ng.INgModelController;
		private displayFormat: string;
		private popoverController: popover.IPopoverController;
		private element: ng.IAugmentedJQuery;

		constructor($scope: IDatePickerScope, $log: ng.ILogService, $timeout: ng.ITimeoutService) {
			super($scope, $log);
			this.$scope = $scope;
			$scope.togglePopover = ($event: ng.IAngularEvent) => {
				this.togglePopover($event);
			};
			$scope.openPopover = ($event: ng.IAngularEvent) => {
				this.openPopover($event);
			};

			$scope.closePopoverOnKeyPress = {
				9 : ($event: ng.IAngularEvent): void => { this.closePopover(); this.$scope.$apply(); },
				13 :  ($event: ng.IAngularEvent): void => { this.closePopover(); this.$scope.$apply(); this.element.find("input")[0].blur(); }
			};

			$scope.$watch("min", (): void => {
				// revalidate
				this.min = this.formatter.parseValue($scope.min);
				this.validate();
				this.selected = this.getViewValue();
				this.assignClasses();
			});
			$scope.$watch("max", (): void => {
				this.max = this.formatter.parseValue($scope.max);
				this.validate();
				this.selected = this.getViewValue();
				this.assignClasses();
			});

			$scope.clear = ($event: ng.IAngularEvent) => {
				this.setViewValue(undefined);
				this.$scope.displayStr = "";
				this.closePopover();
				this.selected = undefined;
				this.assignClasses();
				$event.stopPropagation();
			};
			$scope.selectShortcut = (shortcut: Shortcut) => {
				let date = this.formatter.parseValue(shortcut.date);
				this.setViewValue(date);
				this.$scope.displayStr = this.getDisplayStr(date);
				this.closePopover();
				this.selected = date;
				this.assignClasses();
			};

			$scope.onDisplayStrChanged = ($event: ng.IAngularEvent): void => {
				let displayStr = $scope.displayStr;
				let dateFromStr = moment(displayStr, $scope.displayFormat);
				if (dateFromStr.isValid()) {
					this.setViewValue(dateFromStr);
					this.render();
					$scope.displayStr = displayStr;
				} else {
					dateFromStr = moment(displayStr, $scope.format);
					if (dateFromStr.isValid()) {
						this.setViewValue(dateFromStr);
						this.render();
						$scope.displayStr = displayStr;
					}
				}
				this.validate();
			};
		}
		// set stuff - is called in the linq function
		public setNgModelCtrl(ngModelCtrl: ng.INgModelController): void {
			this.ngModelCtrl = ngModelCtrl;
			ngModelCtrl.$render = () => { this.render(); };
			(<ICalendarValidators>ngModelCtrl.$validators).min = (modelValue: any, viewValue: any) => {
				let min = this.min;
				let value = this.getViewValue();
				return !value || !min || min.diff(value) <= 0;
			};
			(<ICalendarValidators>ngModelCtrl.$validators).max = (modelValue: any, viewValue: any) => {
				let max = this.max;
				let value = this.getViewValue();
				return !value || !max || max.diff(value) >= 0;
			};
			if (!!this.$scope.customClass) {
				(<ICalendarValidators>ngModelCtrl.$validators).customClass = (modelValue: any, viewValue: any) => {
					let value = this.getViewValue();
					if (!!this.$scope.customClass && !!value) {
						let customClass = this.$scope.customClass(value, CalendarMode.Days).toLowerCase();
						return customClass.indexOf("disabled") === -1 && customClass.indexOf("forbidden") === -1;
					}
					return true;
				};
			}
		}
		public setFormat(format: string, displayFormat?: string): void {
			this.formatter = new formatter.MomentFormatter(format);
			if (format !== "moment" && format !== "date") {
				this.displayFormat = displayFormat || format || "L";
			} else {
				this.displayFormat = displayFormat || "L";
			}
		}
		protected selectDate(date: moment.Moment): void {
			this.setViewValue(date);
			this.$scope.displayStr = this.getDisplayStr(date);
			this.selected = date;
			this.assignClasses();
			this.closePopover();
		}
		public setPopoverTrigger(elt: angular.IAugmentedJQuery, $scope: IDatePickerScope): void {
			let onClosing = (): void => {
				this.ngModelCtrl.$setTouched();
				this.closePopover();
			};
			this.popoverController = new popover.ClickoutsideTrigger(elt, $scope, onClosing);
			$scope.popover = { isOpen: false };
			$scope.togglePopover = ($event: ng.IAngularEvent) => {
				this.togglePopover($event);
			};
		}

		public setElement(element: ng.IAugmentedJQuery): void {
			this.element = element;
		}

		// ng-model logic
		private setViewValue(value: moment.Moment): void {
			this.ngModelCtrl.$setViewValue(this.formatter.formatValue(value));
			this.ngModelCtrl.$setTouched();
		}
		private getViewValue(): moment.Moment {
			return this.formatter.parseValue(this.ngModelCtrl.$viewValue);
		}
		private validate(): void {
			this.ngModelCtrl.$validate();
		}
		private render(): void {
			let date = this.formatter.parseValue(this.ngModelCtrl.$viewValue);
			this.currentDate = moment(date).startOf("month");
			this.$scope.mode = this.minMode;
			this.$scope.calendars = this.constructCalendars();
			this.selected = date;
			this.min = this.formatter.parseValue(this.$scope.min);
			this.max = this.formatter.parseValue(this.$scope.max);
			this.assignClasses();
			this.$scope.displayStr = this.getDisplayStr(date);
		}
		// popover logic
		private togglePopover($event: ng.IAngularEvent): void {
			if (this.$scope.popover.isOpen) {
				this.closePopover();
			} else {
				this.openPopover($event);
			}
		}
		private closePopover(): void {
			this.$scope.displayStr = this.getDisplayStr(this.getViewValue());
			this.$scope.direction = "";
			this.element.removeClass("ng-open");
			if (!!this.popoverController) {
				this.popoverController.close();
			}
		}
		private openPopover($event: ng.IAngularEvent): void {
			this.element.addClass("ng-open");
			this.$scope.direction = "init";
			if (!!this.popoverController) {
				this.render();
				this.popoverController.open($event);
			}
			if (!this.$scope.disableKeyboardInput) {
				let input = this.element.children().children()[0] as HTMLInputElement;
				input.select();
			}
		}

		private getDisplayStr(date: moment.Moment): string {
			return !!date ? date.format(this.displayFormat || "L") : undefined;
		}
	}

	angular.module("lui").controller(LuidDatePickerController.IID, LuidDatePickerController);
	angular.module("lui").directive(LuidDatePicker.IID, LuidDatePicker.factory());
	angular.module("lui").directive(LuidDatePickerPopup.IID, LuidDatePickerPopup.factory());
}
