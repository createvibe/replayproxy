/*
 * This file is part of the @createvibe/replayproxy project.
 *
 * (c) Anthony Matarazzo <email@anthonym.us>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Traverse through a series of actions, considering a time-delay, and apply a callback for each action
 * @param {[]} actions The observed callback chain
 * @param {function} callback
 * @param {number|null} [delay] If provided, this will be used for the value of setTimeout for each iteration
 */
function traverseChanges(actions, callback, delay = null) {
    return new Promise(resolve => {
        if (actions.length === 0) {
            return resolve();
        }
        const bool = callback(actions.shift());
        if (bool === false) {
            return resolve();
        }
        if (!delay || delay < 0) {
            return traverseChanges(actions, callback, delay)
                .then(resolve);
        }
        setTimeout(() => {
            traverseChanges(actions, callback, delay)
                .then(resolve);
        }, delay);
    });
}
module.exports = traverseChanges;