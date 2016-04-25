module Lui.Service {

	//==========================================
// ---- inspired by https://github.com/chieffancypants/angular-loading-bar/blob/master/src/loading-bar.js
// ==========================================
	"use strict";
	export class LuiHttpInterceptor implements angular.IHttpInterceptor {

		public static IID: string = "luiHttpInterceptor";
		public static $inject: Array<string> = ["$q", "$cacheFactory", "$timeout", "luisProgressBar"];

		public totalGetRequests: number = 0;

		public completedGetRequests: number = 0;

		private startTimeout: ng.IPromise<any>;

		private $q: ng.IQService;
		private $cacheFactory: ng.ICacheFactoryService;
		private $timeout: ng.ITimeoutService;
		private progressBarService: Lui.Service.ProgressBarService;

		constructor(
			$q: angular.IQService,
			$cacheFactory: ng.ICacheFactoryService,
			$timeout: ng.ITimeoutService,
			progressBarService: Lui.Service.ProgressBarService) {
			this.$q = $q;
			this.$cacheFactory = $cacheFactory;
			this.$timeout = $timeout;
			this.progressBarService = progressBarService;
		}

		// Intercept the successful request.
		public request = (config: ng.IRequestConfig): ng.IRequestConfig => {
			if (!this.isCached(config)) {
				this.startRequest(config.method);
			}
			return config;
		};

		// Intercept the failed request.
		public requestError = (rejection: string): ng.IPromise<any> => {
			this.startRequest("GET");
			return this.$q.reject(rejection);
		};

		// Intercept the successful response.
		public response = (response: ng.IHttpPromiseCallbackArg<any>): ng.IHttpPromiseCallbackArg<any> => {
			if (!!response && !this.isCached(response.config)) {
				this.endRequest(this.extractMethod(response));
			}
			return response;
		};

		// Intercept the failed response.
		public responseError = (rejection: string): ng.IPromise<any> => {
			this.endRequest("GET");
			return (this.$q.reject(rejection));
		};

		/**
		 * Determine if the response has already been cached
		 * @param  {Object}  config the config option from the request
		 * @return {Boolean} returns true if cached, otherwise false
		 */
		private isCached = (config) => {
			let cache;
			let defaultCache = this.$cacheFactory.get("$http");

			if ((config.cache)
				&& config.cache !== false
				&& (config.method === "GET" || config.method === "JSONP")) {
				if (angular.isObject(config.cache)) {
					cache = config.cache;
				} else {
					cache = defaultCache;
				}
			}

			let cached = cache !== undefined ? cache.get(config.url) !== undefined : false;

			if (config.cached !== undefined && cached !== config.cached) {
				return config.cached;
			}
			config.cached = cached;
			return cached;
		};

		private extractMethod = (response: any) => {
			try {
				return (response.config.method);
			} catch (error) {
				return("GET");
			}
		};

		private startRequest = (httpMethod: string): void => {
			if (this.progressBarService.isHttpResquestListening()) {
				//We are only interested by 'GET' http request.
				if (httpMethod === "GET") {
					if (this.totalGetRequests === 0) {
						this.progressBarService.start();
					}
					this.totalGetRequests++;
				}
			} else {
				this.totalGetRequests = 0;
				this.completedGetRequests = 0;
			}
		};

		private setComplete = () => {
			this.progressBarService.complete();
			this.$timeout.cancel(this.startTimeout);
			this.totalGetRequests = 0;
			this.completedGetRequests = 0;
		};

		private endRequest = (httpMethod: string): void => {
			if (this.progressBarService.isHttpResquestListening()) {
				//We are only interested by 'GET' http request.
				if (httpMethod === "GET") {
					this.completedGetRequests++;
					if (this.completedGetRequests >= this.totalGetRequests) {
						this.setComplete();
					}
				}
			}
		};
	}

	angular.module("lui.services").service(LuiHttpInterceptor.IID, LuiHttpInterceptor);
}
