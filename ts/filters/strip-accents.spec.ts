module lui.test {
	"use strict";


	let $filter: IFilterService;

	describe("luifStripAccents", () => {
		beforeEach(() => angular.mock.module("lui"));

		beforeEach(inject( (_$filter_) => {
			$filter = _$filter_;
		}));

		it("should work", () => {
			expect($filter("luifStripAccents")("string without accented char")).toEqual("string without accented char");
			expect($filter("luifStripAccents")("strîng wïth màny âccënted chars")).toEqual("string with many accented chars");
			expect($filter("luifStripAccents")("Ît work on uppercÂsÉd tÔÕ")).toEqual("It work on uppercAsEd tOO");
		});
	});
}
