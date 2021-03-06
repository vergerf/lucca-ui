module lui {
	"use strict";
	export interface IProgressBarService {
		addProgressBar(palette?: string): void;
		startListening(httpRequestMethods?: string[]): void;
		stopListening(): void;
		isListening(): boolean;
		getHttpRequestMethods(): string[];
		start(): void;
		complete(): void;
	}
}

module lui.progressbar {
	"use strict";

//==========================================
// ---- inspired by https://github.com/VictorBjelkholm/ngProgress/blob/master/src/provider.js
// ==========================================
	class ProgressBarService implements IProgressBarService {
		public static IID: string = "luisProgressBar";
		public static $inject: string[] = ["$document", "$window", "$timeout", "$interval", "$log", "luisConfig"];
		public latencyThreshold = 200;
		private httpResquestListening: boolean = false;
		private httpRequestMethods: string[];
		private $document: angular.IDocumentService;
		private $window: angular.IWindowService;
		private $timeout: ng.ITimeoutService;
		private $interval: ng.IIntervalService;
		private $log: ng.ILogService;
		private luisConfig: IConfig;
		private status: number = 0;
		private currentPromiseInterval: ng.IPromise<any>;
		private completeTimeout: ng.IPromise<any>;
		private progressBarTemplate: string = '<div class="lui slim progressing progress progress-bar"><div class="indicator" data-percentage="0" style="width: 0%;"></div></div>';
		private progressbarEl: angular.IAugmentedJQuery;
		private isStarted: boolean;

		constructor(
			$document: angular.IDocumentService,
			$window: angular.IWindowService,
			$timeout: ng.ITimeoutService,
			$interval: ng.IIntervalService,
			$log: ng.ILogService,
			luisConfig: IConfig) {
			this.$document = $document;
			this.$window = $window;
			this.$timeout = $timeout;
			this.$interval = $interval;
			this.$log = $log;
			this.luisConfig = luisConfig;
		}

		public addProgressBar(palette: string = "primary"): void {
			if (!!this.progressbarEl) {
				this.progressbarEl.remove();
			}
			this.progressbarEl = angular.element(this.progressBarTemplate);
			this.progressbarEl.addClass(palette);
			this.luisConfig.parentElt.append(this.progressbarEl);
		};

		public startListening(httpRequestMethods?: string[]): void {
			this.httpResquestListening = true;
			if (!!httpRequestMethods) {
				this.httpRequestMethods = httpRequestMethods;
			} else {
				this.httpRequestMethods = ["GET"];
			}
			this.setStatus(0);
		};

		public stopListening(): void {
			this.httpResquestListening = false;
			this.setStatus(0);
		};

		public isListening(): boolean {
			return this.httpResquestListening;
		};

		public getHttpRequestMethods(): string[] {
			return this.httpRequestMethods;
		};

		public start(): void {
			if (!this.isStarted) {
				this.isStarted = true;
				this.$timeout.cancel(this.completeTimeout);
				this.$interval.cancel(this.currentPromiseInterval);
				this.show();
				this.currentPromiseInterval = this.$interval(() => {
					if (isNaN(this.status)) {
						this.$interval.cancel(this.currentPromiseInterval);
						this.setStatus(0);
						this.hide();
					} else {
						let remaining = 100 - this.status;
						if (remaining > 30) {
							this.setStatus(this.status + (0.5 * Math.sqrt(remaining)));
						} else {
							this.setStatus(this.status + (0.15 * Math.pow(1 - Math.sqrt(remaining), 2)));
						}
					}
				}, this.latencyThreshold);
			}
		};
		public complete(): void {
			this.$interval.cancel(this.currentPromiseInterval);
			this.isStarted = false;
			this.httpResquestListening = false;
			this.setStatus(100);
			this.hide();
		};

		private hide(): void {
			this.$timeout(() => {
				if (!!this.progressbarEl) {
					this.progressbarEl.removeClass("in");
					this.progressbarEl.addClass("out");
					this.setStatus(0);
				}
			}, 300);
		};

		private show(): void {
			if (!!this.progressbarEl) {
				this.progressbarEl.removeClass("out");
				this.progressbarEl.addClass("in");
				this.setStatus(0);
			}
		};

		private setStatus(status: number): void {
			this.status = status;
			if (!!this.progressbarEl) {
				this.progressbarEl.children().css("width", this.status + "%");
				this.progressbarEl.children().attr("data-percentage", this.status);
			}
		};
	}
	angular.module("lui").service(ProgressBarService.IID, ProgressBarService);
}
