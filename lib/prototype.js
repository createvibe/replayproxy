/*
 * This file is part of the @createvibe/replayproxy project.
 *
 * (c) Anthony Matarazzo <email@anthonym.us>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

const makeReference = require('@createvibe/proxyobserver/lib/makeReference');
const traverseChanges = require('./traverseChanges');

/**
 * The replayproxy interface
 */
const prototype = {
    /**
     * Get a breakpoint representing the current position
     * @returns {number}
     */
    breakpoint() {
        return this.reversals.length - 1;
    },

    /**
     * Replay every action onto a new source object
     * @param {*} source The NEW source object representing some default state
     * @param {number|null} [delay] The traversal delay
     * @param {number|null} [break[oint] The index to break, or stop traversing
     * @returns {Promise}
     */
    replay(source, delay = null, breakpoint =  null) {
        let idx = 0;
        return traverseChanges(this.changes.slice(), observed => {
            if (breakpoint !== null && idx++ > breakpoint) {
                // stop traversing at the breakpoint
                return false;
            }
            const { leaf } = observed;
            const reference = makeReference(observed, source);
            if (leaf.value === undefined) {
                delete reference[leaf.prop];
            } else {
                reference[leaf.prop] = leaf.value;
            }
            return true;
        }, delay);
    },

    /**
     * Undo the SINGLE last modification or mutation
     * @param {number|null} [breakpoint] A value representing an index that may not be undone
     * @returns {boolean} a true value represents a successful reversal
     */
    undo(breakpoint = null) {
        if (this.reversals === undefined) {
            return false;
        }
        if (this.reversals.length === 0) {
            return false;
        }
        if (this.reversals.length - 1 === breakpoint) {
            return false;
        }
        this.reversals.pop().call();
        this.changes.pop();
        return true;
    },

    /**
     * Undo all changes up to a brakpoint 
     * @param {number|null} [breakpoint] A value representing an index that may not be undone
     * @returns {void}
     */
    rollback(breakpoint = null) {
        let hasAction;
        do {
            hasAction = this.undo(breakpoint);
        } while (hasAction);
    },

    /**
     * Add an observed change to the history
     * @param {{}} observed The observed object chain
     * @param {function} reversal The reversal function to apply for this action
     */
    record(observed, reversal) {
        this.changes.push(observed);
        this.reversals.push(reversal);
    }
};

module.exports = prototype;
