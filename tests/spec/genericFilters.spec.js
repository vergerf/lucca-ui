describe('luif.timefilters', function(){
	beforeEach(module('ngMock'));
	beforeEach(module('lui'));
	beforeEach(module('lui.filters'));

	var $filter, moment;
	beforeEach(inject(function (_$filter_) {
		$filter = _$filter_;
	}));
	describe('luifPlaceholder', function(){
		var luifPlaceholder;
		var placeholder = 'placeholder';
		beforeEach(function(){
			luifPlaceholder = $filter('luifPlaceholder');
		});
		it('should work', function(){
			var placeholder = 'placeholder';
			var value = '';
			expect(luifPlaceholder(value,placeholder)).toEqual(placeholder);
			value = 'not something empty';
			expect(luifPlaceholder(value,placeholder)).toEqual(value);
		});
	});
	describe('luifDefaultCode', function(){
		var luifDefaultCode;
		beforeEach(function(){
			luifDefaultCode = $filter('luifDefaultCode');
		});
		it('should work', function(){
			expect(luifDefaultCode()).toEqual('');
			expect(luifDefaultCode('Aa12')).toEqual('AA12');
			expect(luifDefaultCode('Aa Bb Cc')).toEqual('AA_BB_CC');
		});
	});
	describe('luifStartFrom', function(){
		var luifStartFrom;
		beforeEach(function(){
			luifStartFrom = $filter('luifStartFrom');
		});
		it('should work', function(){
			expect(luifStartFrom('abc')).toEqual('abc');
			expect(luifStartFrom('abc',1)).toEqual('bc');
		});
	});
});