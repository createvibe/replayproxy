/*
 * This file is part of the @createvibe/replayproxy project.
 *
 * (c) Anthony Matarazzo <email@anthonym.us>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

const proxyobserver = require('@createvibe/proxyobserver');
const makeReference = require('@createvibe/proxyobserver/lib/makeReference');

/**
 * No-Op Function
 * @type {function}
 * @returns {void}
 */
const noop = () => { };

/**
 * Add a reversal to the history
 * @param {{}} observed Information about an observed modification / mutation
 * @returns {void}
 */
function reversal(observed) {
    const { leaf } = observed;
    const reference = makeReference(observed, this.source);
    if (leaf.oldValue === undefined) {
        if (Array.isArray(reference)) {
            const idx = reference.indexOf(leaf.value);
            if (idx !== -1) {
                return reference.splice(idx, 1).length > 0;
            }
        }
        return Reflect.deleteProperty(reference, leaf.prop);
    }
    if (leaf.prop in reference) {
        return Reflect.set(reference, leaf.prop, leaf.oldValue, leaf.receiver);
    }
    Reflect.defineProperty(reference, leaf.prop, {
        value: leaf.oldValue,
        enumerable: true,
        configurable: true,
        writable: true
    });    
}

/**
 * proxyobserver callback
 * @see @createvibe/proxyobserver
 */
function observer() {
    const chain = Array.prototype.slice.call(arguments);
    const root = chain[0];
    const leaf = chain[chain.length - 1];
    const path = chain.map(link => link.prop);
    const observed = {chain: chain.slice(), root, leaf, path};
    leaf.value = leaf.value && JSON.parse(JSON.stringify(leaf.value)) || leaf.value;
    leaf.oldValue = leaf.oldValue && JSON.parse(JSON.stringify(leaf.oldValue)) || leaf.oldValue;
    this.record(observed, reversal.bind(this, observed));
}

/**
 * Create a new replayproxy object
 * @param {{}|[[]} source The source object or array that you want to monitor
 * @param {function} [callback] Custom observable callback
 * @returns {Proxy}
 */
function replayproxy(source, callback = noop) {
    const scope = { 
        source, 

        changes: [],
        reversals: [], 
    };
    Reflect.setPrototypeOf(scope, require('./prototype'));
    const proxy = proxyobserver(source, function() {
        callback.call(null, ...arguments);
        observer.call(scope, ...arguments);
    });
    return new Proxy(proxy, {
        get(target, prop, receiver) {
            if (prop in proxy) {
                return Reflect.get(proxy, prop, receiver);
            }
            if (prop in scope) {
                return Reflect.get(scope, prop, receiver);
            }
            if (prop === 'scope') {
                return scope;
            }
            if (prop === 'proxy') {
                return proxy;
            }
        }
    });
 }

 module.exports = replayproxy;