(function(){
	'use strict';
	angular.module('moment', []).factory('moment', function () { return window.moment; });
	angular.module('underscore', []).factory('_', function () { return window._; });
	
	angular.module('lui.directives', ['moment', 'underscore','ui.select']);
	angular.module('lui.filters', ['moment']);
	angular.module('lui.services', []);
	// all the templates in one module
	angular.module('lui.templates.momentpicker', []); // module defined here and used in a different file so every page doesnt have to reference moment-picker.js
	angular.module('lui.templates', ['lui.templates.momentpicker']);

	angular.module('lui', ['lui.directives','lui.services','lui.filters','lui.templates']);
})();
;(function(){
	'use strict';
		/**
	** DEPENDENCIES
	**  - none
	**/
	angular.module('lui.directives')
	.directive('luidSelectOnClick', function () {
		return {
			restrict: 'A',
			link: function (scope, element, attrs) {
				element.on('click', function () {
					this.select();
				});
				element.on('focus', function () {
					this.select();
				});
			}
		};
	});
	angular.module('lui.directives')
	.directive('luidFocusOn', function() {
		return function(scope, elem, attr) {
			scope.$on(attr.luidFocusOn, function(e) {
				elem[0].focus();
			});
		};
	});
})();
;(function () {
	'use strict';

	angular.module('lui.directives').directive('luidSelect', [function () {
		return {
			require: '^ngModel',
			scope: {
				options: '=', 
				placeholder: '@',
				displayProp:'@',

				ngDisabled:'=',

				classes:'@', 

				onSelect:'&',
				onRemove:'&'
			},
			restrict: 'E',
			template:
			'<ui-select theme="bootstrap" on-select="onSelect()" on-remove="onRemove()" class="lui nguibs-ui-select {{classes}}" ng-disabled="ngDisabled">' + 
			'	<ui-select-match placeholder="{{placeholder}}">{{$select.selected[displayProp]}}</ui-select-match>' + 
			'	<ui-select-choices repeat="option in options | filter: $select.search">' + 
			'		<div ng-bind-html="option[displayProp] | highlight: $select.search"></div>' + 
			'	</ui-select-choices>' + 
			'</ui-select>'
		};
	}]);
})();
;(function(){
	'use strict';
		/**
	** DEPENDENCIES
	**  - moment
	**/

	angular.module('lui.directives')
	.directive('luidMoment', ['moment', function(moment){
		function link(scope, element, attrs, ctrls){
			var ngModelCtrl = ctrls[1];
			var mpCtrl = ctrls[0];

			scope.hasButtons = attrs.showButtons!==undefined;

			// display the value i on two chars
			if(!!attrs.format){ // allows to have a ng-model of type string, not moment
				var format = scope.$eval(attrs.format);
				ngModelCtrl.$render = function(){
					if(this.$viewValue && moment(this.$viewValue, format).isValid()){
						var momentValue = moment(this.$viewValue, format);
						scope.hours = momentValue.format('HH');
						scope.mins = momentValue.format('mm');
					}else{
						scope.hours = undefined;
						scope.mins = undefined;
					}
				};
				ngModelCtrl.setValue = function(newMomentValue){
					if(!newMomentValue){
						ngModelCtrl.$setViewValue(undefined);
					}else{
						ngModelCtrl.$setViewValue(newMomentValue.format(format));
					}
				};
			}else{
				ngModelCtrl.$render = function(){
					if(this.$viewValue && !!this.$viewValue.isValid && this.$viewValue.isValid()){
						scope.hours = this.$viewValue.format('HH');
						scope.mins = this.$viewValue.format('mm');
					}else{
						scope.hours = undefined;
						scope.mins = undefined;
					}
				};
				ngModelCtrl.setValue = function(newMomentValue){ ngModelCtrl.$setViewValue(newMomentValue); };
			}

			scope.ngModelCtrl = ngModelCtrl;
			ngModelCtrl.$viewChangeListeners.push(function() {
				scope.$eval(attrs.ngChange);
			});
			ngModelCtrl.$validators.min = function(modelValue,viewValue){
				return mpCtrl.checkMin(modelValue);
			};
			ngModelCtrl.$validators.max = function(modelValue,viewValue){
				return mpCtrl.checkMax(modelValue);
			};
			var inputs = element.find('input');
			var hoursInput = angular.element(inputs[0]);
			var minsInput = angular.element(inputs[1]);
			mpCtrl.setupEvents(hoursInput,minsInput);
		}
		return{
			require:['luidMoment','^ngModel'],
			controller:'luidMomentController',
			scope: {
				min:'=', // a moment or a str to specify the min for this input
				max:'=', // idem for max
				step:'=', // the number of minutes to add/subtract when clicking the addMins button or scrolling on the add in input
				referenceDate:'=', // when entering a time, the date to set it, also used to count the number of days between the ngModel and this date, if unavailable, will use min then max then today
				disabled:'=',
				showButtons:'=', // forces the buttons to be displayed even if neither inputs is focused
				enforceValid:'=', // prevents entering an ng-invalid input by correcting the value when losing focus

				format:'=', // alows ng-model to be a string with the right format

				// hacks
				minOffset:'=', // to avoid having to say min=val1+val2 because it causes an other digest cycle, we give the offset and the
				maxOffset:'='
			},
			templateUrl:"lui/directives/luidMoment.html",
			restrict:'EA',
			link:link
		};
	}])
	.controller('luidMomentController', ['$scope', '$timeout', 'moment', function($scope, $timeout, moment){
		$scope.pattern = /^([0-9]{0,2})?$/;
		var specialSteps = [5,10,15,20,30];
		var mpCtrl = this;

		// private utility methods
		// we dont want a reference to _ that is used just for a _.contains once so we just recode it with an angular.forEach
		var contains = function(array, value){
			var b = false;
			angular.forEach(array,function(v){
				b = b || v === value;
			});
			return b;
		};

		// private methods for update
		var incr = function (step) {
			if ($scope.disabled) { return; }
			enableButtons();
			$scope.ngModelCtrl.$setValidity('pattern', true);

			var curr = moment(currentValue());
			if(!curr || !curr.isValid()){curr = getRefDate().startOf('day');}
			if(contains(specialSteps, Math.abs(step)) && curr.minutes()%step!==0){
				step = step<0? -(curr.minutes()%step) : -curr.minutes()%step + step;
			}
			var newValue = curr.add(step,'m');
			// check if it before min or after max
			if(!mpCtrl.checkMin(newValue)){
				$scope.mined = true;
				newValue = getMin();
			}else if(!mpCtrl.checkMax(newValue)){
				$scope.maxed = true;
				newValue = getMax();
			}

			newValue.seconds(0);
			// update
			update(newValue);
		};
		var update = function(newValue){
			$scope.ngModelCtrl.setValue(newValue);
			$scope.ngModelCtrl.$render();
		};
		var updateWithoutRender = function(newValue){
			enableButtons(newValue);
			$scope.ngModelCtrl.setValue(newValue);
		};
		var enableButtons = function(newValue){
			$scope.maxed=false;
			$scope.mined=false;
			if(!newValue){return;}
			if(getMin() && getMin().diff(newValue)===0){
				$scope.mined = true;
			}else if(getMax() && getMax().diff(newValue)===0){
				$scope.maxed = true;
			}
		};

		// string value changed
		$scope.changeHours = function(){
			// if hours does not satisfy the pattern [0-9]{0,2}
			if($scope.hours === undefined){
				$scope.ngModelCtrl.$setValidity('pattern', false);
				return update(undefined);
			}
			$scope.ngModelCtrl.$setValidity('pattern', true);

			if($scope.hours === ""){
				return update(undefined);
			}

			if($scope.hours.length == 2){
				if(parseInt($scope.hours)>23){ $scope.hours = '23'; }
				$scope.$broadcast('focusMinutes');
			}else if($scope.hours.length == 1 && parseInt($scope.hours)>2){
				$scope.hours = 0 + $scope.hours;
				$scope.$broadcast('focusMinutes');
			}
			updateWithoutRender(getInputedTime());
		};
		$scope.changeMins = function(){
			if($scope.mins === undefined){
				$scope.ngModelCtrl.$setValidity('pattern', false);
				return update(undefined);
			}
			$scope.ngModelCtrl.$setValidity('pattern', true);

			updateWithoutRender(getInputedTime());
		};

		// private method to translate between string values and viewvalue
		var getInputedTime = function(){
			var intHours = parseInt($scope.hours);
			var intMinutes = parseInt($scope.mins);
			if(intHours!=intHours){intHours = 0;} // intHour isNaN
			if(intMinutes!=intMinutes){intMinutes = 0;} // intMins isNaN
			if(intMinutes > 60){ intMinutes = 59; $scope.mins = "59"; }

			return getRefDate().hours(intHours).minutes(intMinutes).seconds(0);
		};

		// display stuff
		$scope.formatInputValue = function(){
			$scope.ngModelCtrl.$render();
		};
		$scope.getDayGap = function(){
			var refDate = getRefDate().startOf('day');
			return moment.duration(moment(currentValue()).startOf('d').diff(refDate)).asDays();
		};

		// stuff to control the focus of the different elements and the clicky bits on the + - buttons
		// what we want is show the + - buttons if one of the inputs is displayed
		// and we want to be able to click on said buttons without loosing focus (obv)
		$scope.incrHours = function(){
			cancelTimeouts();
			incr(60);
			$scope.$broadcast('focusHours');
		};
		$scope.decrHours = function(){
			cancelTimeouts();
			incr(-60);
			$scope.$broadcast('focusHours');
		};
		$scope.incrMins = function(){
			cancelTimeouts();
			$scope.$broadcast('focusMinutes');
			incr(getStep());
		};
		$scope.decrMins = function(){
			cancelTimeouts();
			$scope.$broadcast('focusMinutes');
			incr(-getStep());
		};

		var hoursFocusTimeout,minsFocusTimeout;
		$scope.blurHours = function(){
			hoursFocusTimeout = $timeout(function(){
					$scope.hoursFocused = false;
					correctValue();
			},200);
		};
		$scope.blurMins = function(){
			minsFocusTimeout = $timeout(function(){
					$scope.minsFocused = false;
					correctValue();
			},200);
		};
		$scope.focusHours = function(){
			cancelTimeouts();
			$scope.minsFocused = false;
			$scope.hoursFocused = true;
		};
		$scope.focusMins = function(){
			cancelTimeouts();
			$scope.minsFocused = true;
			$scope.hoursFocused = false;
		};

		var cancelTimeouts = function(){
			if(!!hoursFocusTimeout){
				$timeout.cancel(hoursFocusTimeout);
				hoursFocusTimeout = undefined;
			}
			if(!!minsFocusTimeout){
				$timeout.cancel(minsFocusTimeout);
				minsFocusTimeout = undefined;
			}
		};
		var correctValue = function(){
			if($scope.enforceValid){
				$scope.ngModelCtrl.$setValidity('pattern', true);
				if($scope.ngModelCtrl.$error.min){
					update(getMin());
				}else if($scope.ngModelCtrl.$error.max){
					update(getMax());
				}
			}
		};

		// internal machinery - getStuff
		var getStep = function(){
			var step = 5;
			if(!isNaN(parseInt($scope.step))){
				step = parseInt($scope.step);
			}
			return step;
		};
		var getRefDate = function(){
			var refDate = moment();
			if(!!$scope.referenceDate && moment($scope.referenceDate).isValid()){
				refDate = moment($scope.referenceDate);
			}else if (!!$scope.min && moment($scope.min).isValid()){
				refDate = moment($scope.min);
			}else if (!!$scope.max && moment($scope.max).isValid()){
				refDate = moment($scope.max);
			}
			return refDate;
		};
		var getMin = function(){
			var min;
			var offset;
			if(!$scope.min){ return undefined; } // min attr not specified
			if(!!$scope.min.isValid && !!$scope.min.isValid()){ // check if min is a valid moment
				min = moment($scope.min);
			}else if(moment($scope.min,'YYYY-MM-DD HH:mm').isValid()){ // check if min is parsable by moment
				min = moment($scope.min,'YYYY-MM-DD HH:mm');
			}else if(moment($scope.min, 'HH:mm').isValid()){ // check if min is leke '23:15'
				var refDate = getRefDate();
				min = moment($scope.min, 'HH:mm').year(refDate.year()).month(refDate.month()).date(refDate.date());
			}
			offset = moment.duration($scope.minOffset);
			min.add(offset);
			return min;
		};
		var getMax = function(){
			var max;
			var offset;
			if(!$scope.max){ return undefined; } // max attr not specified
			if(!!$scope.max.isValid && !!$scope.max.isValid()){ // check if max is a valid moment
				max = moment($scope.max);
			}else if(moment($scope.max,'YYYY-MM-DD HH:mm').isValid()){ // check if max is parsable by moment
				max = moment($scope.max,'YYYY-MM-DD HH:mm');
			}else if(moment($scope.max, 'HH:mm').isValid()){ // check if max is leke '23:15'
				var refDate = getRefDate();
				max = moment($scope.max, 'HH:mm').year(refDate.year()).month(refDate.month()).date(refDate.date());
				if (max.hours() + max.minutes() === 0){ // a max time of '00:00' means midnight tomorrow
					max.add(1,'d');
				}
			}
			offset = moment.duration($scope.maxOffset);
			max.add(offset);
			return max;
		};
		var currentValue = function(){
			if(!$scope.format){
				return $scope.ngModelCtrl.$viewValue;
			}else{
				return moment($scope.ngModelCtrl.$viewValue, $scope.format);
			}
		};

		// internal machinery - checkSomethin
		this.checkMin = function(newValue){
			var min = getMin();
			return !min || min.diff(newValue)<=0;
		};
		this.checkMax = function(newValue){
			var max = getMax();
			return !max || max.diff(newValue)>=0;
		};

		// events - mousewheel and arrowkeys
		this.setupEvents = function( hoursInput, minsInput){
			// setupMousewheelEvents(elt);
			setupArrowkeyEvents( hoursInput, minsInput);
			setupMousewheelEvents( hoursInput, minsInput);
		};
		var setupArrowkeyEvents = function( hoursInput, minsInput ) {
			var step = getStep();
			hoursInput.bind('keydown', function(e) {
				if ( e.which === 38 ) { // up
					e.preventDefault();
					incr(60);
					$scope.$apply();
				}
				else if ( e.which === 40 ) { // down
					e.preventDefault();
					incr(-60);
					$scope.$apply();
				}
				else if ( e.which === 13 ) { // enter
					e.preventDefault();
					$scope.formatInputValue();
					$scope.$apply();
				}
			});
			minsInput.bind('keydown', function(e) {
				if ( e.which === 38 ) { // up
					e.preventDefault();
					incr(step);
					$scope.$apply();
				}
				else if ( e.which === 40 ) { // down
					e.preventDefault();
					incr(-step);
					$scope.$apply();
				}
				else if ( e.which === 13 ) { // enter
					e.preventDefault();
					$scope.formatInputValue();
					$scope.$apply();
				}
			});
		};
		var setupMousewheelEvents = function(  hoursInput, minsInput ) {
			var step = getStep();
			var isScrollingUp = function(e) {
				if (e.originalEvent) {
					e = e.originalEvent;
				}
				//pick correct delta variable depending on event
				var delta = (e.wheelDelta) ? e.wheelDelta : -e.deltaY;
				return (e.detail || delta > 0);
			};
			hoursInput.bind('mousewheel wheel', function(e) {
				if(!$scope.disabled){
					$scope.$apply( incr((isScrollingUp(e)) ? 60 : -60 ));
					e.preventDefault();
				}
			});
			minsInput.bind('mousewheel wheel', function(e) {
				if(!$scope.disabled){
					$scope.$apply( incr((isScrollingUp(e)) ? step : -step ));
					e.preventDefault();
				}
			});
		};

	}]);
	angular.module("lui.templates.momentpicker").run(["$templateCache", function($templateCache) {
		$templateCache.put("lui/directives/luidMoment.html",
			"<div class='luid-moment' ng-class='{disabled:disabled}'>" +
			"	<input type='text' ng-model='hours' ng-change='changeHours()' luid-select-on-click ng-pattern='pattern' luid-focus-on='focusHours'   ng-focus='focusHours()' ng-blur='blurHours()' ng-disabled='disabled' maxlength=2> : " +
			// This indentation issue is normal and needed
			"	<input type='text' ng-model='mins'  ng-change='changeMins()'  luid-select-on-click ng-pattern='pattern' luid-focus-on='focusMinutes' ng-focus='focusMins()'  ng-blur='blurMins()'  ng-disabled='disabled' maxlength=2>" +
			"	<i ng-if='hasButtons' ng-click='incrHours()' ng-show='showButtons||hoursFocused||minsFocused' class='lui mp-button top left north arrow icon'     ng-class='{disabled:maxed}'></i>" +
			"	<i ng-if='hasButtons' ng-click='decrHours()' ng-show='showButtons||hoursFocused||minsFocused' class='lui mp-button bottom left south arrow icon'  ng-class='{disabled:mined}'></i>" +
			"	<i ng-if='hasButtons' ng-click='incrMins()'  ng-show='showButtons||hoursFocused||minsFocused' class='lui mp-button top right north arrow icon'    ng-class='{disabled:maxed}'></i>" +
			"	<i ng-if='hasButtons' ng-click='decrMins()'  ng-show='showButtons||hoursFocused||minsFocused' class='lui mp-button bottom right south arrow icon' ng-class='{disabled:mined}'></i>" +
			"</div>" +
			"");
	}]);
})();
;(function () {
	'use strict';
	/**
	** DEPENDENCIES
	**  - none
	**/

	angular.module('lui.directives').directive('luidPercentage', function () {
		function link(scope, element, attrs, ctrls) {

			var ngModelCtrl = ctrls[1];
			var luidPercentageCtrl = ctrls[0];
			scope.pattern = /^([0-9]+)(\.([0-9]*)?)?$/i;
			if (!attrs.format) {
				scope.format = "0.XX";
			}else if(attrs.format !== "0.XX" && attrs.format !== "1.XX" && attrs.format !== "XX"){
				ngModelCtrl.$render = function () { scope.intPct = "unsupported format"; };
				return;
			}

			scope.ngModelCtrl = ngModelCtrl;

			ngModelCtrl.$render = function () {
				if (this.$viewValue === undefined) {
					scope.intPct = undefined;
					return;
				}
				// must support the different formats here
				scope.intPct = scope.parse(parseFloat(this.$viewValue));
			};

			// call the ng-change
			ngModelCtrl.$viewChangeListeners.push(function () {
				scope.$eval(attrs.ngChange);
			});

			// bind to various events - here only keypress=enter
			luidPercentageCtrl.setupEvents(element.find('input'));
		}


		return {
			require: ['luidPercentage', '^ngModel'],
			controller: 'luidPercentageController',
			scope: {
				step: '=', // default = 5
				format: '@', // 'XX', '0.XX' or '1.XX', default 0.XX
				ngDisabled: '=',
				placeholder: '@'
			},
			restrict: 'EA',
			link: link,
			template: "<div class='lui short input with addon'><input class='lui right aligned' type='text' ng-disabled='ngDisabled' placeholder='{{placeholder}}' ng-model='intPct' ng-change='updateValue()' ng-blur='formatInputValue()'><i class='lui right addon'>%</i></div>"
		};
	})
	.controller('luidPercentageController', ['$scope', function ($scope) {

		// public methods for update
		$scope.updateValue = function () {
			if ($scope.intPct === undefined) { return updateWithoutRender(undefined); } 

			// transform this duration into a string
			var newValue = format($scope.intPct);

			// update viewvalue
			updateWithoutRender(newValue);
		};
		var format = function (pct) {
			// should support deifferents formats
			switch($scope.format || "0.XX"){
				case "XX":
					return pct;
				case "0.XX":
					return pct/100;
				case "1.XX":
					return pct/100 + 1;
			}
			return 0;
		};

		$scope.parse = function (intInput) {
			// should support deifferents formats
			switch($scope.format || "0.XX"){
				case "XX":
					return intInput;
				case "0.XX":
					return Math.round(10000 * intInput) / 100;
				case "1.XX":
					return Math.round((intInput-1) * 10000) / 100;
			}
			return 0;
		};

		// private - updates of some kinds
		// incr value by `step` minutes
		var incr = function (step) {
			var newValue = format(parseFloat($scope.intPct) + step);
			update(newValue);
		};

		// sets viewValue and renders
		var update = function (newValue) {
			$scope.ngModelCtrl.$setViewValue(newValue);
			$scope.ngModelCtrl.$render();
		};
		var updateWithoutRender = function (newValue) {
			$scope.ngModelCtrl.$setViewValue(newValue);
		};

		// display stuff
		$scope.formatInputValue = function () {
			$scope.ngModelCtrl.$render();
		};

		// events - key 'enter'
		this.setupEvents = function (elt) {
			setupKeyEvents(elt);
			setupMousewheelEvents(elt);
		};

		var setupKeyEvents = function (elt) {
			var step = 5;
			if (!isNaN(parseInt($scope.step))) {
				step = parseInt($scope.step);
			}
			elt.bind('keydown', function (e) {
				if (e.which === 38) { // up
					e.preventDefault();
					incr(step);
					$scope.$apply();
				} else if (e.which === 40) { // down
					e.preventDefault();
					incr(-step);
					$scope.$apply();
				}
				if (e.which === 13) { // enter
					e.preventDefault();
					$scope.formatInputValue();
					$scope.$apply();
				}
			});
		};
		var setupMousewheelEvents = function (elt) {
			var step = 5;
			if (!isNaN(parseInt($scope.step))) {
				step = parseInt($scope.step);
			}
			var isScrollingUp = function (e) {
				if (e.originalEvent) {
					e = e.originalEvent;
				}
				//pick correct delta variable depending on event
				var delta = (e.wheelDelta) ? e.wheelDelta : -e.deltaY;
				return (e.detail || delta > 0);
			};

			elt.bind('mousewheel wheel', function (e) {
				if (this === document.activeElement) {
					$scope.$apply(incr((isScrollingUp(e)) ? step : -step));
					e.preventDefault();
				}
			});
		};
	}]);
})();
;(function () {
	'use strict';
	/**
	** DEPENDENCIES
	**  - moment
	**/
	
	angular.module('lui.directives').directive('luidTimespan', ['moment', function (moment) {
		function link(scope, element, attrs, ctrls) {

			var ngModelCtrl = ctrls[1];
			var luidTimespanCtrl = ctrls[0];
			scope.pattern = /^([0-9]+)((h([0-9]{2})?)?(m(in)?)?)?$/i;
			if (!!attrs.unit) {
				var unit = scope.$eval(attrs.unit);
				if (unit == 'h' || unit == 'hour' || unit == 'hours') {
					scope.useHours = true;
				}
			}

			scope.ngModelCtrl = ngModelCtrl;

			ngModelCtrl.$render = function () {
				if (!this.$viewValue) {
					scope.strDuration = '';
					return;
				}

				var currentDuration = moment.duration(this.$viewValue);
				var hours = Math.floor(currentDuration.asHours());
				var minutes = currentDuration.minutes();
				if (hours === 0) {
					scope.strDuration = minutes + 'm';
				} else {
					scope.strDuration = (hours < 10 ? '0' : '') + hours + 'h' + (minutes < 10 ? '0' : '') + minutes;
				}
			};

			// call the ng-change
			ngModelCtrl.$viewChangeListeners.push(function () {
				scope.$eval(attrs.ngChange);
			});

			// bind to various events - here only keypress=enter
			luidTimespanCtrl.setupEvents(element.find('input'));
		}


		return {
			require: ['luidTimespan', '^ngModel'],
			controller: 'luidTimespanController',
			scope: {
				step: '=', // default = 5
				unit: '=', // 'hours', 'hour', 'h' or 'm', default='m'
				ngDisabled: '=',
				placeholder: '@'
			},
			restrict: 'EA',
			link: link,
			template: "<input type='text' ng-disabled='ngDisabled' placeholder='{{placeholder}}' ng-pattern='pattern' ng-model='strDuration' ng-change='updateValue()' ng-blur='formatInputValue()'>"
		};
	}])
	.controller('luidTimespanController', ['$scope', 'moment', function ($scope, moment) {

		// public methods for update
		$scope.updateValue = function () {
			// is only fired when pattern is valid or when it goes from valid to invalid
			// improvement possible - check the pattern and set the validity of the all directive via ngModelCtrl.$setValidity
			// currently when pattern invalid, the viewValue is set to '00:00:00'
			if (!$scope.strDuration) { return updateWithoutRender(undefined); } // empty input => 00:00:00

			// temp variables
			var newDuration; // the duration of the parsed strDuration
			var newValue;

			// parse the strDuration to build newDuration
			newDuration = parse($scope.strDuration);

			// transform this duration into a string
			newValue = format(newDuration);

			// update viewvalue
			updateWithoutRender(newValue);
		};
		var format = function (dur) {
			return (dur.days() > 0 ? Math.floor(dur.asDays()) + '.' : '') + (dur.hours() < 10 ? '0' : '') + dur.hours() + ':' + (dur.minutes() < 10 ? '0' : '') + dur.minutes() + ':00';
		};
		var parse = function (strInput) {
			var newDuration;
			if (/h/i.test(strInput)) {
				newDuration = parseHoursAndMinutes(strInput);
			} else if (/m/i.test(strInput)) {
				newDuration = parseMinutes(strInput);
			} else if ($scope.useHours) {
				newDuration = parseHours(strInput);
			} else {
				newDuration = parseMinutes(strInput);
			}
			return newDuration;
		};

		// private - parsing str to moment.duration
		var parseHoursAndMinutes = function (strInput) {
			var d = moment.duration();
			var splitted = strInput.split(/h/i);
			d.add(parseInt(splitted[0]), 'hours');
			var strMin = splitted[1];
			if (!!strMin && strMin.length >= 2) {
				d.add(parseInt(strMin.substring(0, 2)), 'minutes');
			}
			return d;
		};
		var parseMinutes = function (strInput) {
			var d = moment.duration();
			var splitted = strInput.split(/m/i);
			d.add(parseInt(splitted[0]), 'minutes');
			return d;
		};
		var parseHours = function (strInput) {
			var d = moment.duration();
			var splitted = strInput.split(/h/i);
			d.add(parseInt(splitted[0]), 'hours');
			return d;
		};

		// private - formatting stuff
		var formatValue = function (duration) {
			return Math.floor(duration.asDays()) + '.' + (duration.hours() < 10 ? '0' : '') + duration.hours() + ':' + (duration.minutes() < 10 ? '0' : '') + duration.minutes() + ':00';
		};

		// private - updates of some kinds
		// incr value by `step` minutes
		var incr = function (step) {
			var newDur = moment.duration(currentValue()).add(step, 'minutes');
			if (newDur.asMilliseconds() < 0) {
				newDur = moment.duration();
			}
			var newValue = formatValue(newDur);
			update(newValue);
		};

		// sets viewValue and renders
		var update = function (newValue) {
			$scope.ngModelCtrl.$setViewValue(newValue);
			$scope.ngModelCtrl.$render();
		};
		var updateWithoutRender = function (newValue) {
			$scope.ngModelCtrl.$setViewValue(newValue);
		};

		// display stuff
		$scope.formatInputValue = function () {
			$scope.ngModelCtrl.$render();
		};

		var currentValue = function () {
			return $scope.ngModelCtrl.$viewValue;
		};

		// events - key 'enter'
		this.setupEvents = function (elt) {
			setupKeyEvents(elt);
			setupMousewheelEvents(elt);
		};

		var setupKeyEvents = function (elt) {
			var step = 5;
			if (!isNaN(parseInt($scope.step))) {
				step = parseInt($scope.step);
			}
			elt.bind('keydown', function (e) {
				if (e.which === 38) { // up
					e.preventDefault();
					incr(step);
					$scope.$apply();
				} else if (e.which === 40) { // down
					e.preventDefault();
					incr(-step);
					$scope.$apply();
				}
				if (e.which === 13) { // enter
					e.preventDefault();
					$scope.formatInputValue();
					$scope.$apply();
				}
			});
		};
		var setupMousewheelEvents = function (elt) {
			var step = 5;
			if (!isNaN(parseInt($scope.step))) {
				step = parseInt($scope.step);
			}
			var isScrollingUp = function (e) {
				if (e.originalEvent) {
					e = e.originalEvent;
				}
				//pick correct delta variable depending on event
				var delta = (e.wheelDelta) ? e.wheelDelta : -e.deltaY;
				return (e.detail || delta > 0);
			};

			elt.bind('mousewheel wheel', function (e) {
				if (this === document.activeElement) {
					$scope.$apply(incr((isScrollingUp(e)) ? step : -step));
					e.preventDefault();
				}
			});
		};
	}]);
})();
;(function () {
	'use strict';

	angular.module('lui.directives').directive('luidUserSelect', [function () {
		return {
			require: '^ngModel',
			scope: {
				users: '=', // users must have at least those fields : id, displayname
				placeholder: '@',
				onSelect:'&',
				onRemove:'&'
			},
			restrict: 'E',
			template:
			'<ui-select theme="bootstrap" on-select="onSelect()" on-remove="onRemove()">' + 
			'	<ui-select-match placeholder="{{placeholder}}">{{$select.selected.displayName}}</ui-select-match>' + 
			'	<ui-select-choices repeat="user in users | filter: $select.search">' + 
			'		<div ng-bind-html="user.displayName"></div>' + 
			'	</ui-select-choices>' + 
			'</ui-select>'
		};
	}]);
})();
;(function(){
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

;(function(){
	'use strict';
	/**
	** DEPENDENCIES
	**  - none, nothing, nada
	**/
	function replaceAll(string, find, replace) {
		// http://stackoverflow.com/questions/1144783/replacing-all-occurrences-of-a-string-in-javascript
		// lets not reinvent the wheel
		if(!string){ return ''; }
		function escapeRegExp(string) {
			return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
		}
		return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
	}
	angular.module('lui.filters')
	.filter('luifPlaceholder', function () {
		return function (_input, _placeholder) {
			return !!_input ? _input : _placeholder;
		};
	})
	.filter('luifDefaultCode', function () {
		// uppercased and with '_' instead of ' '
		return function (_input) {
			return replaceAll(_input, ' ', '_').toUpperCase();
		};
	})
	.filter('luifStartFrom', function () {
		//pagination filter
		return function (_input, start) {
			start = +start; //parse to int
			return _input.slice(start);
		};
	})
	.filter('luifNumber', ['$sce', '$filter', function($sce, $filter) {
		return function(_input, _precision, _placeholder) {
			var placeholder = _placeholder === undefined ? '' : _placeholder;
			// alert(_input + " " + (!!_input.isNaN && _input.isNaN()));
			var input = _input === undefined || _input === null || _input === "" || _input != _input ? placeholder : _input; // the last check is to check if _input is NaN
			var separator = $filter("number")(1.1,1)[1];
			var precision = _precision === undefined || _precision === null || _precision != _precision ? 2 : _precision;

			var text = $filter("number")(input, precision);
			var decimalPart = (text || $filter("number")(0, precision)).split(separator)[1];
			var rightSpan;

			if(decimalPart === undefined){
				rightSpan = "<span style=\"opacity:0\"></span>";
			}else if(parseInt(decimalPart) === 0){
				rightSpan = "<span style=\"opacity:0\">" + separator + decimalPart + "</span>";
			}else{
				rightSpan = "<span>" + separator + decimalPart + "</span>";
			}
			if(input === '' || !text){
				// the _input or the _placeholder was not parsable by the number $filter, just return input but trusted as html
				return $sce.trustAsHtml(input + rightSpan);
			}

			var integerPart = text.split(separator)[0];
			return $sce.trustAsHtml(integerPart + rightSpan);
		};
	}]);
})();;(function () {
	'use strict';
	/**
	** DEPENDENCIES
	**  - moment
	**/
	var formatMoment = function (_moment, _format) { //expects a moment
		var m = moment(_moment);
		if (m.isValid()) {
			return m.format(_format);
		} else {
			return _moment;
		}
	};

	angular.module('lui.filters')
	.filter('luifFriendlyRange', function () {
		var traductions = {
			'en': {
				sameDay: 'start(LL)',
				sameMonth: 'start(MMMM Do) - end(Do\, YYYY)',
				sameYear: 'start(MMMM Do) - end(LL)',
				other: 'start(LL) - end(LL)'
			},
			'fr': {
				sameDay: 'le start(LL)',
				sameMonth: 'du start(Do) au end(LL)',
				sameYear: 'du start(Do MMMM) au end(LL)',
				other: 'du start(LL) au end(LL)'
			}
		};
		var currentYearTraductions = {
			'en': {
				sameDay: 'start(MMMM Do)',
				sameMonth: 'start(MMMM Do) - end(Do)',
				sameYear: 'start(MMMM Do) - end(MMMM Do)',
				other: 'start(LL) - end(LL)'
			},
			'fr': {
				sameDay: 'le start(Do MMMM)',
				sameMonth: 'du start(Do) au end(Do MMMM)',
				sameYear: 'du start(Do MMMM) au end(Do MMMM)',
				other: 'du start(LL) au end(LL)'
			}
		};
		return function (_block, _excludeEnd) {
			if(!_block){ return; }
			var start = moment(_block.startsAt || _block.startsOn || _block.startDate || _block.start);
			var end = moment(_block.endsAt || _block.endsOn || _block.endDate || _block.end);
			if(_excludeEnd){
				end.add(-1,'d');
			}
			var trads = traductions[moment.locale()] || traductions.en;
			if(moment().year() === start.year() && moment().year() === end.year()){
				trads = currentYearTraductions[moment.locale()] || currentYearTraductions.en;
			}
			var format = start.year() === end.year() ? start.month() === end.month() ? start.date() === end.date() ? 'sameDay' : 'sameMonth' : 'sameYear' : 'other';
			var regex = /(start\((.*?)\))(.*(end\((.*?)\))){0,1}/gi.exec(trads[format]);
			return trads[format].replace(regex[1], start.format(regex[2])).replace(regex[4], end.format(regex[5]));
		};
	})
	.filter('luifMoment', function () {
		return function (_moment, _format) {
			if (!_format) { _format = 'LLL'; } // default format
			return formatMoment(_moment, _format);
		};
	})
	.filter('luifCalendar', function () {
		return function (_moment, _refDate) {
			var m = moment(_moment);
			var refDate = (_refDate && moment(_refDate).isValid()) ? moment(_refDate) : moment();

			if (m.isValid()) {
				return m.calendar(_refDate);
			} else {
				return _moment;
			}
		};
	})
	// this filter is very ugly and i'm sorry - i'll add lots of comments
	.filter('luifDuration', function () {
		return function (_duration, _sign, _unit, _precision) {  //expects a duration, returns the duration in the given unit with the given precision
			var d = moment.duration(_duration);

			if(d.asMilliseconds() === 0){ return ''; }

			// parse duration
			var values = [Math.abs(d.days()), Math.abs(d.hours()), Math.abs(d.minutes()), Math.abs(d.seconds()), Math.abs(d.milliseconds())];
			var units = ['d ', 'h', 'm', 's', 'ms'];
			var unit;

			// First we get the floor part of the unit of the duration : 1d11h = 1.x day or 35 hours or 2100 minutes depending on your unit
			switch(_unit){
				case 'd':
				case 'day':
				case 'days':
					_precision = !!_precision ? _precision : 'h'; // if no precision is provided, we take the next unit

					// the first unit with a not nul member, if you want 15 minutes expressed in days it will respond 15m
					unit = values[0] !== 0 ? 0 : values[1] !== 0 ? 1 : values[2] !== 0 ? 2 : values[3] !== 0 ? 3 : 4;
					values[0] = Math.abs(d.asDays() >= 0 ? Math.floor(d.asDays()) : Math.ceil(d.asDays()));
					break;
				case undefined:
				case '': // if no _unit is provided, use hour
				case 'h':
				case 'hour':
				case 'hours':
					_precision = _precision || 'm';
					unit = values[1] !== 0 ? 1 : values[2] !== 0 ? 2 : values[3] !== 0 ? 3 : 4; // the first unit with a not nul member
					values[1] = Math.abs(d.asHours() >= 0 ? Math.floor(d.asHours()) : Math.ceil(d.asHours()));
					break;
				case 'm':
				case 'min':
				case 'mins':
				case 'minute':
				case 'minutes':
					_precision = _precision || 's';
					unit = values[2] !== 0 ? 2 : values[3] !== 0 ? 3 : 4; // the first unit with a not nul member
					values[2] = Math.abs(d.asMinutes() >= 0 ? Math.floor(d.asMinutes()) : Math.ceil(d.asMinutes()));
					break;
				case 's':
				case 'sec':
				case 'second':
				case 'seconds':
					_precision = _precision || 's';
					unit = values[3] !== 0 ? 3 : 4; // the first unit with a not nul member
					values[3] = Math.abs(d.asSeconds() >= 0 ? Math.floor(d.asSeconds()) : Math.ceil(d.asSeconds()));
					break;
				case 'ms':
				case 'millisec':
				case 'millisecond':
				case 'milliseconds':
					_precision = _precision || 'ms';
					unit = 4;
					values[4] = Math.abs(d.asMilliseconds() >= 0 ? Math.floor(d.asMilliseconds()) : Math.ceil(d.asMilliseconds()));
					break;
			}
			var precision; // if you want 1h as minutes, precision milliseconds you want the result to be 60m and not 60m 00.000s
			switch(_precision){
				case 'd':
				case 'day':
				case 'days':
					precision = 0;
					break;
				case 'h':
				case 'hour':
				case 'hours':
					precision = values[1] !== 0 ? 1 : 0;
					break;
				case 'm':
				case 'min':
				case 'mins':
				case 'minute':
				case 'minutes':
					precision = values[2] !== 0 ? 2 : values[1] !== 0 ? 1 : 0;
					break;
				case 's':
				case 'sec':
				case 'second':
				case 'seconds':
					precision = values[3] !== 0 ? 3 : values[2] !== 0 ? 2 : values[1] !== 0 ? 1 : 0;
					break;
				case 'ms':
				case 'millisec':
				case 'millisecond':
				case 'milliseconds':
					precision = values[4] !== 0 ? 4 : values[3] !== 0 ? 3 : values[2] !== 0 ? 2 : values[1] !== 0 ? 1 : 0;
					break;
			}
			// some localisation shenanigans
			switch(moment.locale()){
				case "fr": units[0] = 'j '; break;
			}

			// if precision = ms and unit bigger than s we want to display 12.525s and not 12s525ms
			if(unit <= 3 && precision === 4){ units[3] = '.'; units[4] = 's'; }
			if(unit <= 1 && precision === 2){ units[2] = ''; }
			if(unit === 2 && precision === 3){ units[3] = ''; }

			var format = function(value, u){
				if (u === unit){
					return value + units[u];
				}
				if (u === 2 || u === 3){
					return (value < 10 ? '0' + value : value) + units[u];
				}
				if (u === 4){
					return (value < 10 ? '00' + value : value < 100 ? '0' + value : value) + units[u];
				}
				return value + units[u];
			};
			var result = '';
			for(var i = unit; i <= precision; i++){
				result += format(values[i],i);
			}

			// add prefix
			var prefix = '';
			if (_sign && !!result) {
				if (d.asMilliseconds() > 0) {
					prefix = '+';
				} else if (d.asMilliseconds() < 0) {
					prefix = '-';
				}
			}

			return prefix + result;
		};
	})
	.filter('luifHumanize', function () {
		return function (_duration, suffix) {
			suffix = !!suffix;
			var d = moment.duration(_duration);
			return d.humanize(suffix);
		};
	});
})();