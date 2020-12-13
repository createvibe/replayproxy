/*
 * This file is part of the @createvibe/replayproxy project.
 *
 * (c) Anthony Matarazzo <email@anthonym.us>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

const replayproxy = require('./replayproxy');

/**
 * Fetch the mock data
 * @returns {{}}
 */
function getData() {
	return {
	    one: 'foo',
	    two: [1,'two',3,'four',5,[6,7]],
	    three: {
	        foo: 'test',
	        bar: 'this'
	    }
	};
};

let data, proxy;
beforeEach(() => {
	data = getData();
	proxy = replayproxy(data);			
});

describe('it should work', () => {

	test('it should wrap an object in a Proxy', () => {
		expect(proxy.one).toEqual(data.one);
		expect(proxy.two).toEqual(data.two);
		expect(proxy.three).toEqual(data.three);
		proxy.one = 'modified';
		expect(proxy.one).toEqual('modified');
		expect(data.one).toEqual('modified');
	});

	test('it should undo a modification', () => {
		expect(proxy.one).toEqual('foo');
		proxy.one = 'modified';
		expect(proxy.one).toEqual('modified');
		expect(data.one).toEqual('modified');
		proxy.undo();
		expect(proxy.one).toEqual('foo');
		expect(data.one).toEqual('foo');
	});

	test('it should support a custom observer', () => {
		let chain, leaf;
		const proxy = replayproxy(getData(), function() {
			chain = Array.prototype.slice.call(arguments);
			leaf = chain[chain.length - 1];
		});
		expect(proxy).toEqual(expect.objectContaining(getData()));
		proxy.one = 'bar';
		expect(leaf.prop).toEqual('one');
		expect(leaf.oldValue).toEqual('foo');
		expect(leaf.value).toEqual('bar');
	})

});

describe('it should support mutations', () => {

	test('it should mutate new properties', () => {
		expect(data.newProperty).toBe(undefined);
		expect(proxy.newProperty).toBe(undefined);
		proxy.newProperty = 'mutation!';
		expect(proxy.newProperty).toEqual('mutation!');
		expect(data.newProperty).toEqual('mutation!');
		proxy.undo();
		expect(proxy.newProperty).toBe(undefined);
		expect(data.newProperty).toBe(undefined);

		proxy.newProperty = 'mutation!';
		expect(proxy.newProperty).toEqual('mutation!');
		expect(data.newProperty).toEqual('mutation!');
		delete proxy.newProperty;
		expect(proxy.newProperty).toBe(undefined);
		expect(data.newProperty).toBe(undefined);
		proxy.undo();
		expect(proxy.newProperty).toEqual('mutation!');
		expect(data.newProperty).toEqual('mutation!');

		proxy.undo();
		expect(proxy.newProperty).toBe(undefined);
		expect(data.newProperty).toBe(undefined);
	});

	test('it should mutate existing properties', () => {
		expect(proxy.one).toEqual('foo');
		delete proxy.one;
		expect(proxy.one).toBe(undefined);
		proxy.undo();
		expect(proxy.one).toEqual('foo');
	});

});

describe('it should support rollback', () => {

	test('it should rollback multiple changes', () => {
		expect(proxy).toEqual(expect.objectContaining(getData()));
		proxy.somethingNew = 'cool beans';
		proxy.two[5].push(8,3,10,14,1,12,4,15,11);
		proxy.two[5].sort((a,b) => (a - b));
		proxy.three.data = {foo: 'bar'};
		proxy.three.data.sexy = 'yes';
		proxy.two[5].pop();
		proxy.two[5].shift();
		delete proxy.three.foo;
		delete proxy.three.bar;
		expect(data.somethingNew).toEqual('cool beans');
		expect(data.two[5]).toEqual([3,4,6,7,8,10,11,12,14]);
		expect(data.three.data.sexy).toEqual('yes');
		expect(data.three.foo).toBe(undefined);
		expect(data.three.bar).toBe(undefined);
		proxy.rollback();
		expect(data).toEqual(expect.objectContaining(getData()));
	});

	test('it should support a breakpoint', () => {
		expect(proxy).toEqual(expect.objectContaining(getData()));
		proxy.step = 1;
		proxy.step++;
		proxy.step += 1;
		expect(proxy.step).toBe(3);
		let breakpoint = proxy.breakpoint();
		let oldBreakpoint = breakpoint;
		proxy.status = 'started';
		do {
			proxy.step++;
		} while (proxy.step < 100);
		expect(proxy.step).toBe(100);
		expect(proxy.status).toEqual('started');
		proxy.rollback(breakpoint);
		expect(proxy.status).toBe(undefined);
		expect(proxy.step).toBe(3);
		proxy.undo(breakpoint);
		expect(proxy.status).toBe(undefined);
		expect(proxy.step).toBe(3);
		proxy.step += 1;
		expect(proxy.step).toBe(4);
		proxy.undo(breakpoint);
		expect(proxy.step).toBe(3);
		proxy.status = 'verifying';
		do {
			proxy.step++;
		} while (proxy.step < 100);
		expect(proxy.step).toBe(100);
		expect(proxy.status).toEqual('verifying');
		proxy.undo(breakpoint);
		expect(proxy.step).toBe(99);
		breakpoint = proxy.breakpoint();
		proxy.step += 1;
		proxy.rollback(breakpoint);
		expect(proxy.step).toBe(99);
		proxy.step += 1;
		expect(proxy.step).toBe(100);
		proxy.rollback(breakpoint);
		expect(proxy.step).toBe(99);
		breakpoint = oldBreakpoint;
		proxy.rollback(breakpoint);
		expect(proxy.step).toBe(3);
		expect(proxy.status).toEqual(undefined);
		proxy.rollback();
		expect(proxy.step).toBe(undefined);
	});

});

describe('it should support replay', () => {

	test('it should replay a forward path', async () => {
		expect(proxy).toEqual(expect.objectContaining(getData()));
		proxy.status = 'running';
		proxy.step = 1;
		delete proxy.one;
		delete proxy.three;
		proxy.step++;
		proxy.info = data.two;
		delete proxy.two;
		proxy.step += 1;
		proxy.info.unshift('replay');
		proxy.step **= 2;
		proxy.status = 'finished';
		expect(data.step).toBe(9);
		expect(data.status).toEqual('finished');
		expect(data.info.length).toBe(7);
		expect(data.info[0]).toEqual('replay');

		const copy = getData();
		return proxy.replay(copy).then(() => {
			expect(copy.step).toBe(9);
			expect(copy.status).toEqual('finished');
			expect(copy.info.length).toBe(7);
			expect(copy.info[0]).toEqual('replay');
			expect(copy).toEqual(expect.objectContaining(data));
		});
	});

	test('it should replay with breakpoints', async () => {

		expect(proxy).toEqual(expect.objectContaining(getData()));

		const breakpoints = [];
		
		proxy.status = 'started';
		proxy.step = 1;
		proxy.step++;
		proxy.step += 1;
		
		breakpoints.push({ 
			index: proxy.breakpoint(),
			test: check => {
				expect(check.step).toBe(3);
				expect(check.status).toBe('started');
			}
		});
		
		/* testing rollback - these actions will be discarded - */
		do {
			proxy.step++;
		} while (proxy.step < 100);

		proxy.rollback(breakpoints[0].index);
		breakpoints[0].test(proxy);
		/* end of rollback */

		proxy.step += 1;

		breakpoints.push({
			index: proxy.breakpoint(),
			test: check => {
				expect(check.step).toBe(4);
				expect(check.status).toEqual('started');
			}
		});
		
		proxy.step = 156;
		proxy.undo();

		breakpoints.push({
			index: proxy.breakpoint(),
			test: check => {
				expect(check.step).toBe(4);
			}
		});
		
		proxy.status = 'verifying';
		do {
			proxy.step++;
		} while (proxy.step < 100);

		proxy.two = ['something',  'else'];
		proxy.two.splice(0,2,'like','magic');
		proxy.two.push('where','did','they','go?');

		breakpoints.push({
			index: proxy.breakpoint(),
			test: check => {
				expect(check.step).toBe(100);
				expect(check.status).toEqual('verifying');
				expect(check.two).toEqual(expect.objectContaining([
					'like','magic','where','did','they','go?'
				]));;
			}
		});

		// replay to each breakpoint sequentially
		const replay = (copy) => {
			if (breakpoints.length === 0) {
				return Promise.resolve();
			}
			const breakpoint = breakpoints.shift();
			return proxy.replay(copy, null, breakpoint.index).then(() => {
				// after replaying to each breakpoint, run the breakpoint-test
				breakpoint.test(copy);
				return replay(copy);
			});
		};

		const copy = getData();
		return replay(copy).then(() => {

			// the copy object should match the source object
			expect(copy)
				.toEqual(expect.objectContaining(data));

		}).then(() => {

			const fresh = {};
			return replay(fresh).then(() => {
				// the fresh object should only have the new changes 
				expect(copy)
					.toEqual(expect.objectContaining({ status: 'verifying', step: 100 }));
			});

		});
	});

});