(function(){
	'use strict';
	angular.module('moment', []).factory('moment', function () { return window.moment; });
	
	angular.module('lui.directives', []);
	angular.module('lui.filters', ['moment']);
	angular.module('lui.services', []);
	// all the templates in one module
	angular.module('lui.templates.momentpicker', []); // module defined here and used in a different file so every page doesnt have to reference moment-picker.js
	angular.module('lui.templates', ['lui.templates.momentpicker']);

	angular.module('lui', ['lui.directives','lui.services','lui.filters','lui.templates']);
})();
;(function () {
	'use strict';

	var formatMoment = function (_moment, _format) { //expects a moment
		var m = moment(_moment);
		if (m.isValid()) {
			return m.format(_format);
		} else {
			return _moment;
		}
	};
	function replaceAll(string, find, replace) {
		// http://stackoverflow.com/questions/1144783/replacing-all-occurrences-of-a-string-in-javascript
		// lets not reinvent the wheel
		function escapeRegExp(string) {
			return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
		}
		return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
	}

	angular.module('lui.filters')
	.filter('luifFriendlyRange', function () {
		var traductions = {
			'en': {
				sameDay: 'start(LL)',
				sameMonth: 'start(MMMM D) - end(D\, YYYY)',
				sameYear: 'start(MMMM D) - end(LL)',
				other: 'start(LL) - end(LL)'
			},
			'fr': {
				sameDay: 'le start(LL)',
				sameMonth: 'du start(Do) au end(LL)',
				sameYear: 'du start(Do MMMM) au end(LL)',
				other: 'du start(LL) au end(LL)'
			}
		};
		return function (_block, _excludeEnd) {
			var trads = traductions[moment.locale()] || traductions.en;
			var start = moment(_block.startsAt || _block.startsOn || _block.startDate || _block.start);
			var end = moment(_block.endsAt || _block.endsOn || _block.endDate || _block.end);
			if(_excludeEnd){
				end.add(-1,'d');
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
	.filter('luifDuration', function () {
		return function (_duration, _format, _sign) {  //expects a duration, returns the duration in the given format or a sensible one
			var d = moment.duration(_duration);
			var hours = d.hours() + d.days() * 24; // does not support durations over 30 days yet
			var minutes = d.minutes();
			var prefix = '';
			if (_sign) {
				if (d.asMilliseconds() > 0) {
					prefix = '+';
				} else if (d.asMilliseconds() < 0) {
					prefix = '-';
				}
			}
			if (!_format) { // if no format is provided, it will try to display "30min" or "3h" or "3h30"
				if (hours && minutes) {
					return prefix + Math.abs(hours) + 'h' + formatMoment(moment(minutes, 'm'), 'mm');
				} else if (minutes) {
					return prefix + Math.abs(minutes) + 'm';
				} else if (hours) {
					return prefix + Math.abs(hours) + 'h';
				} else { return ''; } // 00:00 -> should not be displayed
			}
			return prefix + formatMoment(moment(hours + ':' + minutes + ':00', 'H:mm:ss'), _format);
		};
	})
	.filter('luifHumanize', function () {
		return function (_duration, suffix, pastEvent) {
			suffix = !!suffix;
			pastEvent = !!pastEvent;
			var d = moment.duration(_duration);
			if (pastEvent) { d = moment.duration(-d.asMilliseconds()); }
			return d.humanize(suffix);
		};
	});
})();
;(function(){
	'use strict';
	angular.module('lui.filters')
	.filter('luifPlaceholder', function () {
		return function (_input, _placeholder) {
			return !!_input ? _input : _placeholder;
		};
	})
	.filter('luifDefaultCode', function () {
		// uppercased and with '_' instead of ' '
		return function (input) {
			return replaceAll(input, ' ', '_').toUpperCase();
		};
	})
	.filter('luifStartFrom', function () {
		//pagination filter
		return function (input, start) {
			start = +start; //parse to int
			return input.slice(start);
		};
	});
})();;(function () {
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
					if(this.$viewValue && this.$viewValue.isValid()){
						scope.hours = this.$viewValue.format('HH');
						scope.mins = this.$viewValue.format('mm');
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
			replace:true,
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

		// private methods for update
		var incr = function (step) {
			if ($scope.disabled) { return; }
			enableButtons();
			$scope.ngModelCtrl.$setValidity('pattern', true);

			var curr = moment(currentValue());
			if(!curr){curr = getRefDate().startOf('day');}
			if(_.contains(specialSteps, Math.abs(step)) && curr.minutes()%step!==0){
				step = step<0?-curr.minutes()%step:curr.minutes()%step!==0;
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
			"	<input type='text' ng-model='hours' ng-change='changeHours()' luid-select-on-click ng-pattern='pattern' luid-focus-on='focusHours'   ng-focus='focusHours()' ng-blur='blurHours()' ng-disabled='disabled' maxlength=2>:" +
			// This indentation issue is normal and needed
			"	<input type='text' ng-model='mins'  ng-change='changeMins()'  luid-select-on-click ng-pattern='pattern' luid-focus-on='focusMinutes' ng-focus='focusMins()'  ng-blur='blurMins()'  ng-disabled='disabled' maxlength=2>" +
			"	<span ng-if='hasButtons' ng-click='incrHours()' ng-show='showButtons||hoursFocused||minsFocused' class='mp-button top left lucca-icon lucca-icon-plus'         ng-class='{disabled:maxed}'></span>" + 
			"	<span ng-if='hasButtons' ng-click='decrHours()' ng-show='showButtons||hoursFocused||minsFocused' class='mp-button bottom left lucca-icon lucca-icon-minimize'  ng-class='{disabled:mined}'></span>" + 
			"	<span ng-if='hasButtons' ng-click='incrMins()'  ng-show='showButtons||hoursFocused||minsFocused' class='mp-button top right lucca-icon lucca-icon-plus'        ng-class='{disabled:maxed}'></span>" + 
			"	<span ng-if='hasButtons' ng-click='decrMins()'  ng-show='showButtons||hoursFocused||minsFocused' class='mp-button bottom right lucca-icon lucca-icon-minimize' ng-class='{disabled:mined}'></span>" + 
			"</div>" + 
			"");
	}]);
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
			scope.$on(attr.focusOn, function(e) {
				elem[0].focus();
			});
		};
	});
})();
;(function () {
	'use strict';

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
			template: "<input type='text' ng-disabled='ngDisabled' class='lucca-timespan' placeholder='{{placeholder}}' ng-pattern='pattern' ng-model='strDuration' ng-change='updateValue()' ng-blur='formatInputValue()'>"
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