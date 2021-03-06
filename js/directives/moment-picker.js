(function(){
	'use strict';
	/**
	** DEPENDENCIES
	**  - moment
	**/
	var MAGIC_DELAY_BEFORE_WHEEL = 200;

	angular.module('lui')
	.directive('luidMoment', ['moment', function(moment){
		function link(scope, element, attrs, ctrls){
			var ngModelCtrl = ctrls[1];
			var mpCtrl = ctrls[0];

			// display the value i on two chars
			if(!!attrs.format){ // allows to have a ng-model of type string, not moment
				var format = scope.$eval(attrs.format);

				ngModelCtrl.getValue = function() {
					var vv = ngModelCtrl.$viewValue;
					if (!vv) {
						return undefined;
					}
					var momentVv = moment(vv, format);
					if (!momentVv.isValid()) {
						return undefined;
					}
					return momentVv;
				};

				ngModelCtrl.$render = function() {
					var momentValue = ngModelCtrl.getValue();
					scope.hours = !!momentValue ? momentValue.format('HH') : undefined;
					scope.mins = !!momentValue ? momentValue.format('mm') : undefined;
					ngModelCtrl.$validate();
				};

				ngModelCtrl.setValue = function(newMomentValue) {
					ngModelCtrl.$setViewValue(!newMomentValue ? undefined : newMomentValue.format(format));
				};
				ngModelCtrl.$validators.min = function (modelValue,viewValue) {
					return !viewValue || mpCtrl.checkMin(moment(modelValue, format));
				};
				ngModelCtrl.$validators.max = function (modelValue,viewValue) {
					return !viewValue || mpCtrl.checkMax(moment(modelValue, format));
				};
			} else {
				ngModelCtrl.getValue = function() {
					var vv = ngModelCtrl.$viewValue;
					if (!vv) {
						return undefined;
					}
					var momentVv = moment(vv);
					if (!vv.isValid()) {
						return undefined;
					}
					return momentVv;
				};
				ngModelCtrl.$render = function() {
					var vv = ngModelCtrl.getValue();
					var condition = !!vv && vv.isValid();
					scope.hours = condition ? vv.format('HH') : undefined;
					scope.mins = condition ? vv.format('mm') : undefined;
					ngModelCtrl.$validate();
				};
				ngModelCtrl.setValue = function(newMomentValue) {
					ngModelCtrl.$setViewValue(newMomentValue);
				};
				ngModelCtrl.$validators.min = function (modelValue,viewValue) {
					return !viewValue || mpCtrl.checkMin(modelValue);
				};
				ngModelCtrl.$validators.max = function (modelValue,viewValue) {
					return !viewValue || mpCtrl.checkMax(modelValue);
				};
			}

			scope.ngModelCtrl = ngModelCtrl;

			ngModelCtrl.$validators.hours = function (modelValue,viewValue) {
				return scope.hours !== undefined && scope.hours !== "" && !isNaN(parseInt(scope.hours));
			};
			ngModelCtrl.$validators.minutes = function (modelValue,viewValue) {
				return scope.mins !== undefined && scope.mins !== "" && parseInt(scope.mins) < 60;
			};

			var inputs = element.querySelectorAll('.input');
			mpCtrl.setupEvents(element, angular.element(inputs[0]), angular.element(inputs[1]));

			// reexecute validators if min or max change
			// will not be reexecuted if min is a moment and something like `min.add(3, 'h')` is called
			scope.$watch('min', function(){
				ngModelCtrl.$validate();
			});
			scope.$watch('max', function(){
				ngModelCtrl.$validate();
			});

		}

		return {
			require:['luidMoment','^ngModel'],
			controller:'luidMomentController',
			scope: {
				min:'=', // a moment or a str to specify the min for this input
				max:'=', // idem for max
				step:'=', // the number of minutes to add/subtract when clicking the addMins button or scrolling on the add in input
				referenceDate:'=', // when entering a time, the date to set it, also used to count the number of days between the ngModel and this date, if unavailable, will use min then max then today
				isDisabled:'=',
				showButtons:'=', // forces the buttons to be displayed even if neither inputs is focused
				enforceValid:'=', // prevents entering an ng-invalid input by correcting the value when losing focus

				format:'=', // alows ng-model to be a string with the right format

				// hacks
				minOffset:'=', // to avoid having to say min=val1+val2 because it causes an other digest cycle, we give the offset and the
				maxOffset:'='
			},
			templateUrl:"lui/directives/luidMoment.html",
			restrict:'EA',
			link: link,
		};
	}])
	.controller('luidMomentController', ['$scope', '$timeout', 'moment', '$element', function($scope, $timeout, moment, $element) {
		function incr(step) {
			function calculateNewValue() {
				function contains(array, value) { return array.indexOf(value) !== -1; }

				var curr = moment(currentValue());
				if (!curr || !curr.isValid()) { curr = getRefDate().startOf('day'); }
				if (contains(specialSteps, Math.abs(step)) && curr.minutes() % step !== 0) {
					step = step < 0 ? - (curr.minutes() % step) : -curr.minutes() % step + step;
				}

				var newValue = curr.add(step,'m');
				newValue.seconds(0);
				return newValue;
			}

			if ($scope.isDisabled) { return; }
			// $scope.ngModelCtrl.$setValidity('pattern', true);

			update(calculateNewValue(), true);
		}

		function update(newValue, autoCorrect) {
			updateWithoutRender(newValue, autoCorrect);
			$scope.ngModelCtrl.$render();
		}

		function updateWithoutRender(newValue, autoCorrect) {
			function correctedValue(newValue, min, max) {
				switch(true){
					case (!newValue) : return newValue;
					case (min && min.diff(newValue) > 0) : return min;
					case (max && max.diff(newValue) < 0) : return max;
					default : return newValue;
				}
			}
			var min = getMin();
			var max = getMax();

			if (autoCorrect) {
				var newCorrectedValue = correctedValue(newValue, min, max);
				if (newCorrectedValue.format("HH:mm") !== newValue.format("HH:mm")) {
					newValue = newCorrectedValue;

					$element.addClass('autocorrect');
					setTimeout(function() {
						$element.removeClass('autocorrect');
					}, 200);
				}
			}
			$scope.maxed = newValue && max && max.diff(newValue) <= 0;
			$scope.mined = newValue && min && min.diff(newValue) >= 0;

			$scope.ngModelCtrl.setValue(newValue);
		}

		// translate between string values and viewvalue
		function undefinedHoursOrMinutes() {
			return $scope.hours === undefined || $scope.hours === "" || $scope.mins === undefined || $scope.mins === "";
		}

		function getInputedTime() {
			if (undefinedHoursOrMinutes()) {
				return undefined;
			}

			var intHours = parseInt($scope.hours);
			var intMinutes = parseInt($scope.mins);
			// if (intHours != intHours) { intHours = 0; } // intHour isNaN
			// if (intMinutes != intMinutes) { intMinutes = 0; } // intMins isNaN
			if (intMinutes > 60) { intMinutes = 59; $scope.mins = "59"; }

			var initialTime = getRefDate().hours(intHours).minutes(intMinutes).seconds(0);

			// try to put time between min and max by adding some days while time < min and time !> max
			var time = betweenMinAndMax(initialTime);

			return time;
		}

		function betweenMinAndMax(refTime) {
			var time = moment(refTime);
			var minTime = moment(time), maxTime = moment(time);
			var min = getMin(), max = getMax();
			var dayCnt;
			// time < min, add enough day to have it after min
			if(!!min && time.isBefore(min)) {
				// number of days between min and time, rounded to next integer
				dayCnt = Math.ceil(min.diff(time, 'day', true));
				minTime.add(dayCnt, 'day');
			}
			// time > max
			if (!!max && time.isAfter(max)) {
				// number of days between max and time, rounded to previous integer
				dayCnt = Math.floor(max.diff(time, 'day', true));
				maxTime.add(dayCnt, 'days');
			}

			if (!!max && (minTime.isBefore(max) || minTime.isSame(max))) {
				return minTime;
			}
			if (!!min && (maxTime.isAfter(min) || maxTime.isSame(min))) {
				return maxTime;
			}
			return time;
		}

		function cancelTimeouts() {
			function cancel(timeout){
				if (!!timeout) {
					$timeout.cancel(timeout);
					timeout = undefined;
				}
			}
			cancel(hoursFocusTimeout);
			cancel(minsFocusTimeout);
		}

		function correctValue() {
			update(currentValue(), $scope.enforceValid);
		}

		function getStep() { return isNaN(parseInt($scope.step)) ? 5 : parseInt($scope.step); }

		function getRefDate() {
			function toMoment(value) { return (!!value && moment(value).isValid()) ? moment(value) : undefined; }

			return toMoment($scope.referenceDate) || toMoment($scope.min) || toMoment($scope.max) || moment();
		}

		function getExtremum(extremum, offset, checkMidnight) {
			function rawExtremum(){
				switch(true){
					// check if min/max is a valid moment
					case (!!extremum.isValid && !!extremum.isValid()) : return moment(extremum);
					// check if min/max is parsable by moment
					case (moment(extremum,'YYYY-MM-DD HH:mm').isValid()) : return moment(extremum,'YYYY-MM-DD HH:mm');
					// check if min/max is like '23:15'
					case (moment(extremum, 'HH:mm').isValid()) :
						var refDate = getRefDate();
						var extrem = moment(extremum, 'HH:mm').year(refDate.year()).month(refDate.month()).date(refDate.date());
						// a min/max time of '00:00' means midnight tomorrow
						if (checkMidnight && extrem.hours() + extrem.minutes() === 0) { extrem.add(1,'d');}
						return extrem;
				}
			}

			// min/max attr not specified
			if (!extremum) { return undefined; }
			var extrem = rawExtremum();
			extrem.add(moment.duration(offset));
			return extrem;
		}

		function getMin() {	return getExtremum($scope.min, $scope.minOffset, false); }
		function getMax() {	return getExtremum($scope.max, $scope.maxOffset, true);	}

		function currentValue() { return !$scope.format ? $scope.ngModelCtrl.$viewValue : moment($scope.ngModelCtrl.$viewValue, $scope.format); }

		function incrementEvent(eventName, value) {
			cancelTimeouts();
			incr(value);
			$scope.$broadcast(eventName);
		}

		function focusEvent(isMinute) {
			cancelTimeouts();
			$scope.minsFocused = !!isMinute;
			$scope.hoursFocused = !isMinute;
		}

		function blurEvent(timeout, isFocused){
			var model = $scope.ngModelCtrl.$modelValue;
			updateWithoutRender(model);
			timeout = $timeout(function(){
					timeout = false;
					correctValue();
			}, 200);
		}

		var hoursFocusTimeout, minsFocusTimeout;
		var specialSteps = [5, 10, 15, 20, 30];
		var mpCtrl = this;
		$scope.pattern = /^([0-9]{0,2})?$/;

		// stuff to control the focus of the different elements and the clicky bits on the + - buttons
		// what we want is show the + - buttons if one of the inputs is displayed
		// and we want to be able to click on said buttons without loosing focus (obv)
		$scope.incrHours = function() {	incrementEvent('focusHours', 60); };
		$scope.decrHours = function() {	incrementEvent('focusHours', -60); };
		$scope.incrMins = function() {	incrementEvent('focusMinutes', getStep()); };
		$scope.decrMins = function() {	incrementEvent('focusMinutes', -getStep()); };

		function isUndefinedOrEmpty(val) {
			return val === undefined || val === "";
		}

		// string value changed
		$scope.changeHours = function(){
			if(isUndefinedOrEmpty($scope.hours)){
				return updateWithoutRender(undefined);
			}

			if(isUndefinedOrEmpty($scope.mins)){
				$scope.mins = "00";
			}

			if ($scope.hours.length == 2) {
				if (parseInt($scope.hours) > 23) { $scope.hours = '23'; }
				$scope.$broadcast('focusMinutes');
			} else if ($scope.hours.length == 1 && parseInt($scope.hours) > 2) {
				$scope.hours = 0 + $scope.hours;
				$scope.$broadcast('focusMinutes');
			}
			updateWithoutRender(getInputedTime());
		};

		$scope.changeMins = function() {
			if (!$scope.mins || $scope.mins.length < 2) {
				$scope.ngModelCtrl.$setValidity("minutes", false);
			} else {
				updateWithoutRender(getInputedTime());
			}
		};

		// display stuff
		$scope.formatInputValue = function() { $scope.ngModelCtrl.$render(); };

		$scope.getDayGap = function(){
			var refDate = getRefDate().startOf('day');
			return moment.duration(moment(currentValue()).startOf('d').diff(refDate)).asDays();
		};

		$scope.blurHours = function() { blurEvent(hoursFocusTimeout, $scope.hoursFocused); };
		$scope.blurMins = function() {
			if(!$scope.mins) {
				if($scope.hours === "" || $scope.hours === undefined){
					$scope.mins = undefined;
				} else {
					$scope.mins = "00";
				}
			} else if ($scope.mins.length < 2) {
				$scope.mins = "0" + $scope.mins;
			}
			blurEvent(minsFocusTimeout, $scope.minsFocused);
		};

		$scope.focusHours = function() { focusEvent(false); };
		$scope.focusMins = function() { focusEvent(true); };

		this.checkMin = function(newValue) {
			var min = getMin();
			return !min || min.diff(newValue) <= 0;
		};

		this.checkMax = function(newValue) {
			var max = getMax();
			return !max || max.diff(newValue) >= 0;
		};

		// events - mousewheel and arrowkeys
		this.setupEvents = function(elt, hoursField, minsField){
			var hoursInput = angular.element(hoursField.find('input')[0]),
				minsInput = angular.element(minsField.find('input')[0]);

			function setupArrowkeyEvents(hoursInput, minsInput) {
				function subscription(e, step){
					switch(e.which){
						case 38:// up
							e.preventDefault();
							incr(step);
							$scope.$apply();
						break;
						case 40:// down
							e.preventDefault();
							incr(-step);
							$scope.$apply();
						break;
						case 13:// enter
							e.preventDefault();
							$scope.formatInputValue();
							$scope.$apply();
						break;
					}
				}
				var step = getStep();
				hoursInput.bind('keydown', function(e) { subscription(e, 60); });
				minsInput.bind('keydown', function(e) { subscription(e, step); });
			}

			function setupMousewheelEvents(elt, hoursField, minsField) {
				function isScrollingUp(e) {
					e = e.originalEvent ? e.originalEvent : e;
					//pick correct delta variable depending on event
					var delta = (e.wheelDelta) ? e.wheelDelta : -e.deltaY;
					return (e.detail || delta > 0);
				}
				var enableMouseWheel = false;
				var enableWheelTimeout;
				elt.bind('mouseenter', function(e) {
					enableWheelTimeout = setTimeout(function() {
						enableMouseWheel = true;
					}, MAGIC_DELAY_BEFORE_WHEEL);
				});
				elt.bind('mouseleave', function(e) {
					if (!!enableWheelTimeout) {
						clearTimeout(enableWheelTimeout);
					}
					enableMouseWheel = false;
				});
				function subscription(e, incrStep){
					if(!$scope.isDisabled && enableMouseWheel){
						$scope.$apply(incr((isScrollingUp(e)) ? incrStep : -incrStep ));
						e.preventDefault();
					}
				}
				var step = getStep();

				hoursField.bind('mousewheel wheel', function(e) { subscription(e, 60); });
				minsField.bind('mousewheel wheel', function(e) { subscription(e, step); });
			}

			setupArrowkeyEvents( hoursInput, minsInput);
			setupMousewheelEvents(elt, hoursField, minsField);
		};

	}]);

	angular.module("lui").run(["$templateCache", function($templateCache) {
		$templateCache.put("lui/directives/luidMoment.html",
			"<div class='lui hours moment input' ng-class='{disabled: isDisabled}'>" +
			"	<input type='text' ng-model='hours' ng-change='changeHours()' luid-select-on-click ng-pattern='pattern' luid-focus-on='focusHours' ng-focus='focusHours()' ng-blur='blurHours()' ng-disabled='isDisabled' maxLength='2' autocorrect='off' spellcheck='false'>" +
			"	<i ng-click='incrHours()' ng-show='showButtons && hoursFocused' class='lui mp-button top left north arrow icon' ng-class='{disabled: maxed}'></i>" +
			"	<i ng-click='decrHours()' ng-show='showButtons && hoursFocused' class='lui mp-button bottom left south arrow icon' ng-class='{disabled: mined}'></i>" +
			"</div>" +
			"<span class='separator'>:</span>" +
			"<div class='lui minutes moment input' ng-class='{disabled: isDisabled}'>" +
			"	<input type='text' ng-model='mins' ng-change='changeMins()' luid-select-on-click ng-pattern='pattern' luid-focus-on='focusMinutes' ng-focus='focusMins()' ng-blur='blurMins()' ng-disabled='isDisabled' maxLength='2' autocorrect='off' spellcheck='false'>" +
			"	<i ng-click='incrMins()'  ng-show='showButtons && minsFocused' class='lui mp-button top right north arrow icon' ng-class='{disabled: maxed}'></i>" +
			"	<i ng-click='decrMins()' ng-show='showButtons && minsFocused' class='lui mp-button bottom right south arrow icon' ng-class='{disabled: mined}'></i>" +
			"</div>" +
			"");
	}]);
})();
