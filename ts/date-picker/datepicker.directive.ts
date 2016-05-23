module Lui.Directives {
	"use strict";
	class LuidDatePicker implements angular.IDirective {
		public static IID: string = "luidDatePicker";
		public restrict = "E";
		public templateUrl = "lui/templates/date-picker/datepicker-inline.html";
		public require = ["ngModel", "luidDatePicker"];
		public scope = {
			format: "@",
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
			datePickerCtrl.setNgModelCtrl(ngModelCtrl);



		}
	}
	class Month {
		date: moment.Moment;
		weeks: Week[];
	}
	class Week {
		days: Day[];
	}
	class Day {
		date: moment.Moment;
		dayNum: number;
		class: string;
		constructor(date: moment.Moment) {
			this.date = date;
			this.dayNum = date.date();
		}
	}
	interface IDatePickerScope extends ng.IScope {
		dayLabels: string[];
		date: moment.Moment;
		month: Month;

		selectDay: (day: Day) => void;
	}

	class LuidDatePickerController {
		public static IID: string = "luidDatePickerController";
		public static $inject: Array<string> = ["$scope"];
		private ngModelCtrl: ng.INgModelController;
		private $scope: IDatePickerScope;

		constructor($scope: IDatePickerScope) {
			this.$scope = $scope;
			this.initDayLabels($scope);
			$scope.selectDay = (day: Day) => {
				// unselect previously selected day
				let allDays: Day[] = _.chain($scope.month.weeks)
					.pluck("days")
					.flatten()
					.value();
				(_.findWhere(allDays, { class: "selected" }) || { class: "" }).class = "";
				day.class = "selected";
				this.setViewValue(this.formatValue(day.date));
			}
		}
		private initDayLabels($scope: IDatePickerScope): void {
			$scope.dayLabels = _.map(_.range(7), (i: number): string => {
				return moment().startOf("week").add(i, "days").format("dd");
			});
		}
		private parseValue(value: any): moment.Moment {
			return value ? moment(value) : undefined;
		}
		private formatValue(value: moment.Moment): any {
			return value;
		}
		public setNgModelCtrl(ngModelCtrl: ng.INgModelController): void {
			this.ngModelCtrl = ngModelCtrl;
			ngModelCtrl.$render = () => {
				this.$scope.date = this.parseValue(ngModelCtrl.$viewValue);
				this.$scope.month = this.constructMonth(this.$scope.date);
			};
		}
		private setViewValue(value): void {
			this.ngModelCtrl.$setViewValue(value);
		}
		public constructMonth(selectedDate: moment.Moment): Month {
			let month: Month = { date: moment(selectedDate).startOf("month"), weeks: [] };
			let weekStart = moment(month.date).startOf("week");
			while (weekStart.month() === month.date.month()) {
				month.weeks.push(this.constructWeek(weekStart, month.date, selectedDate))
				weekStart.add(1, "week");
			}
			return month;
		}
		private constructWeek(weekStart: moment.Moment, monthStart: moment.Moment, selectedDate: moment.Moment): Week {
			let week: Week = { days: [] };
			week.days = _.map(_.range(7), (i: number) => {
				let day: Day = new Day(moment(weekStart).add(i, "days"));
				if (day.date.month() !== monthStart.month()) {
					day.class = "empty";
				}
				if (!!selectedDate && day.date.format("YYYYMMDD") === moment(selectedDate).format("YYYYMMDD")) {
					day.class = "selected";
				}
				return day;
			});
			return week;
		}
	}

	angular.module("lui.directives").controller(LuidDatePickerController.IID, LuidDatePickerController);
	angular.module("lui.directives").directive(LuidDatePicker.IID, LuidDatePicker.factory());
}
