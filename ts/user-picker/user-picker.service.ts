module lui.userpicker {
	"use strict";

	export interface IUserPickerService {
		/** Get the Id of the current connected user */
		getMyId(): ng.IPromise<number>;

		/** Get the informations of the current connected users */
		getMe(): ng.IPromise<IUserLookup>;

		/**
		 * Analyzes an array of users and returns an array containing all the homonyms users
		 * @param {IUserLookup[]} user the array of users to analyze
		 */
		getHomonyms(users: IUserLookup[]): IUserLookup[];

		/**
		 * Fetches all the users
		 * @param {string} filters filter given to the API request
		 */
		getUsers(filters: string, paging?: number, offset?: number): ng.IPromise<IUserLookup[]>;

		/**
		 * Fetches additional properties for the given user
		 * @param {IUserLookup} user the user you want additionalProperties
		 * @param {ISimpleProperty[]} properties array of the properties you want to fetch
		 */
		getAdditionalProperties(user: IUserLookup, properties: IHomonymProperty[]): ng.IPromise<IHomonymProperty[]>;

		getUsersByIds(ids: number[]): ng.IPromise<IUserLookup[]>;
		getUserById(id: number): ng.IPromise<IUserLookup>;

		/**
		 * Removes the potential useless additional properties of an array of users who have homonyms.
		 * If two homonyms have an additional property with the same value, this property will be removed.
		 * @param {IUserLookup[]} users Array containing the users who have homonyms.
		 */
		reduceAdditionalProperties(users: IUserLookup[]): IUserLookup[];

		setCustomHttpService(httpService: ng.IHttpService): void;
	}

	class UserPickerService implements IUserPickerService {
		public static IID: string = "userPickerService";
		public static $inject: Array<string> = [
			"$http", "$q", "$filter"
		];

		private $http: ng.IHttpService;
		private defaultHttpService: ng.IHttpService;
		private $q: ng.IQService;

		private meApiUrl = "/api/v3/users/me";
		private userLookUpApiUrl = "/api/v3/users/find";
		private userApiUrl = "/api/v3/users";
		private userLookupFields = "fields=id,firstName,lastName,dtContractStart,dtContractEnd,employeeNumber";

		private meCache: IUserLookup;

		private stripAccents: (str: string) => string;

		constructor($http: ng.IHttpService, $q: ng.IQService, $filter: ng.IFilterService) {
			this.$http = $http;
			this.defaultHttpService = $http;
			this.$q = $q;
			this.stripAccents = <(str: string) => string>$filter("luifStripAccents");
		}

		public getMyId(): ng.IPromise<number> {
			return this.getMe()
			.then((me: IUserLookup) => {
				return me.id;
			});
		}

		public getMe(): ng.IPromise<IUserLookup> {
			if (this.meCache !== undefined) {
				return this.$q.resolve<IUserLookup>(this.meCache);
			}

			return this.$http.get(this.meApiUrl + "?" + this.userLookupFields)
				.then((response: ng.IHttpPromiseCallbackArg<{ data: IUserLookup }>) => {
					this.meCache = response.data.data;
					return this.meCache;
				}).catch((reason: any) => {
					return undefined;
				});
		}

		public getHomonyms(users: IUserLookup[]): IUserLookup[] {
			return _.chain(users)
				.groupBy((user: IUserLookup) => { return this.concatName(user); })
				.filter(groups => { return groups.length > 1; })
				.flatten()
				.value();
		}

		public getUsers(filters: string, paging: number = MAGIC_PAGING, offset: number = 0): ng.IPromise<IUserLookup[]> {
			let pagingfilter = "paging=" + [offset, paging].join(",");
			return this.$http.get(`${this.userLookUpApiUrl}?${filters}&${pagingfilter}&${this.userLookupFields}`)
				.then((response: ng.IHttpPromiseCallbackArg<{ data: { items: IUserLookup[] } }>) => {
					return response.data.data.items;
				});
		}

		public getUserById(id: number): ng.IPromise<IUserLookup> {
			return this.$http.get(`${this.userApiUrl}?id=${id.toString()}&${this.userLookupFields}`)
				.then((response: ng.IHttpPromiseCallbackArg<{ data: any }>) => {
					let users = response.data.data.items;
					// Response can be empty if principal doesn't have the right to see this user
					if (!users || users.length === 0) {
						return undefined;
					}
					return users[0]; // Only one user in the array
				});
		}

		public getUsersByIds(ids: number[]): ng.IPromise<IUserLookup[]> {
			let promises = new Array<ng.IPromise<IUserLookup>>();
			_.each(ids, (id: number) => {
				promises.push(this.getUserById(id));
			});
			return this.$q.all(promises);
		}

		public getAdditionalProperties(user: IUserLookup, properties: IHomonymProperty[]): ng.IPromise<IHomonymProperty[]> {
			let fields = _.map(properties, (prop: IHomonymProperty) => { return prop.name; }).join(",");
			return this.$http.get(`${this.userApiUrl}?id=${user.id.toString()}&fields=${fields}`)
				.then((response: ng.IHttpPromiseCallbackArg<{ data: any }>) => {
					let users = response.data.data.items;
					let result = new Array<IHomonymProperty>();

					// Response can be empty if principal doesn't have the right to see this user
					if (!!users && !!users.length) {
						let usersProperties = users[0]; // Only one user in the array
						_.each(properties, (property: IHomonymProperty) => {
							let value = <string>this.getProperty(usersProperties, property.name);
							if (!!value) {
								result.push(<IHomonymProperty>{
									translationKey: property.translationKey,
									name: property.name,
									icon: property.icon,
									value: value
								});
							}
						});
					}
					return result;
				});
		}

		public reduceAdditionalProperties(users: IUserLookup[]): IUserLookup[] {
			let groupedHomonyms = _.chain(users)
				.groupBy((user: IUserLookup) => { return this.concatName(user); })
				.filter(groups => { return groups.length > 1; })
				.value();

			if (groupedHomonyms.length === 0) {
				return users;
			}
			_.each(groupedHomonyms, (homonyms: IUserLookup[]) => {
				let reducableProperties = new Array<string>();
				let groupedProperties = _.chain(homonyms)
					.map((user: IUserLookup) => { return user.additionalProperties; })
					.flatten()
					.groupBy((property: IHomonymProperty) => { return property.name; })
					.value();
				_.each(groupedProperties, (propertyGroup: IHomonymProperty[]) => {
					let uniq = _.uniq(propertyGroup, (property: IHomonymProperty) => { return property.value; });
					if (uniq.length === 1) {
						// this property can be removed
						reducableProperties.push(propertyGroup[0].name);
					}
				});

				_.each(reducableProperties, (propertyName: string) => {
					_.each(homonyms, (user: IUserLookup) => {
						let propIndex = _.findIndex(user.additionalProperties, property => { return property.name === propertyName; });
						user.additionalProperties.splice(propIndex, 1);
					});
				});
			});

			return users;
		}

		public setCustomHttpService(httpService: ng.IHttpService): void {
			this.$http = !!httpService ? httpService : this.defaultHttpService;
		}

		private getProperty(object: any, prop: string): any {
			let splitted = prop.split(".");
			let curObject = object;
			_.each(splitted, (propName: string) => {
				curObject = !!curObject && !!curObject[propName] ? curObject[propName] : undefined;
			});
			return curObject;
		}

		private concatName(user: IUserLookup): string {
			return this.stripAccents(user.firstName.toLowerCase()) + this.stripAccents(user.lastName.toLowerCase());
		}
	}

	angular.module("lui").service(UserPickerService.IID, UserPickerService);
}
