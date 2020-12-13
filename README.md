# replayproxy

[![Build Status](https://travis-ci.com/createvibe/proxyobserver.svg?branch=master)](https://travis-ci.com/createvibe/replayproxy)

Use a proxy object to observe deep changes in any javascript object (or array) and maintain the object path,
from the root property to the nested property that was modified.

See [https://github.com/createvibe/proxyobserver](https://github.com/createvibe/proxyobserver).

When each change happens, modification or mutation, it is recorded in a queue.

Methods are exposed directly on the proxy object that is returned.

- `undo` - Undo a single operation
- `rollback` - Undo all operations up to a breakpoint
- `replay` - Replay all operations on a new source option, opionally up to a breakpoint, and with a delay
- `breakpoint` -  Get a breakpoint at the current position
- `record` - Record a new observed changes

# Installation

Using NPM to install the package.

```
npm install --save @createvibe/replayproxy
```

## Usage

Pass your object to `replayproxy` and capture the object that is returned.
The response is a `Proxy` object that will monitor your changes.

You can pass a call back to intercept changes on the proxy object.

```
const replayproxy = require('@createvibe/replayproxy');

const data = {initializing: true};
const proxy = replayproxy(data, function() {
    console.log('A change happened on the data object!');
    console.log(arguments);
});
```
Continue to manipulate and mutate the proxy object instead of your source object.
All changes will be reflected on your source object when you reference it later.

```
delete proxy.initializing;
proxy.something = 'new data';
proxy.data = [1,2,3];
```
### Replaying Changes

You can replay changes, but they are applied on a different object than the original data source.
This can be a new fresh object, or it can be an existing object from your application somewhere.

Pass this new or existing object reference to the `replay` method and all the changes will be repsented on your new object.

```
const replayproxy = require('@createvibe/replayproxy');

const data = {initializing: true};
const proxy = replayproxy(data, function() {
    console.log('A change happened on the data object!');
    console.log(arguments);
});

delete proxy.initializing;
proxy.something = 'new data';
proxy.data = [1,2,3];

const fresh = {};
proxy.replay(fresh).then(() => {

    // fresh.something === 'new data'
    // fresh.data === [1,2,3]

});
```
> NOTE: Any data that is removed will also be removed from the object passed to `replay` (if previously exists).

Replaying changes also replays mutations and so any existing data that is deleted or swapped will be done so on 
the new object reference passed to `replay`.

### Undo a Single Change

```
const replayproxy = require('@createvibe/replayproxy');

const data = {initializing: true};
const proxy = replayproxy(data, function() {
    console.log('A change happened on the data object!');
    console.log(arguments);
});

delete proxy.initializing;
proxy.something = 'new data';
proxy.data = [1,2,3];

proxy.undo();

// proxy.something === 'new data'
// proxy.data === undefined
```
> NOTE: Undoing changes removes them from history and so you can no longer replay them.

### Rollback All Changes

```
const replayproxy = require('@createvibe/replayproxy');

const data = {initializing: true};
const proxy = replayproxy(data, function() {
    console.log('A change happened on the data object!');
    console.log(arguments);
});

delete proxy.initializing;
proxy.something = 'new data';
proxy.data = [1,2,3];

proxy.rollback();

// proxy.something === undefined
// proxy.data === undefined
```

#### Rollback From Error State

```
const replayproxy = require('@createvibe/replayproxy');

const data = {};
let proxy = replayproxy(data);

/* do something with data */

// data is dirty, create a breakpoint before we do something that might fail
const breakpoint = proxy.breakpoint();

// do dangerous task
try {

    performPotentialDangerousTask();

} catch (err) {
    
    console.error(err);
    
    // rollback to our breakpoint!
    proxy.rollback(breakpoint);

}

// you can dismiss the proxy now to let garbage collection to free up memory from stored references
proxy = null;


/* continue working with data instead of proxy */

```

### Breakpoints

Breakpoints tell the system to stop traversing when a specific action index is reached.

Breakpoints can be retrieved by using the `breakpoint` method.

#### Rollback To Breakpoints

You can `rollback` to an earlier breakpoint.

```
const replayproxy = require('@createvibe/replayproxy');

const data = {initializing: true};
const proxy = replayproxy(data, function() {
    console.log('A change happened on the data object!');
    console.log(arguments);
});

delete proxy.initializing;
proxy.something = 'new data';
proxy.data = [1,2,3];

let breakpoint = proxy.breakpoint();

proxy.data.splice(0,1,6,8,3,5,1,9,0,3);
proxy.data.sort((a,b) => (a - b));
proxy.something = 'done sorting!';

proxy.rollback(breakpoint);

// proxy.something === 'new data'
// proxy.data === [1,2,3]
```

#### Replay To Breakpoins

You can `replay` changes up to a specific breakpoint.

```
const replayproxy = require('@createvibe/replayproxy');

const data = {initializing: true};
const proxy = replayproxy(data, function() {
    console.log('A change happened on the data object!');
    console.log(arguments);
});

delete proxy.initializing;
proxy.something = 'new data';
proxy.data = [1,2,3];

let breakpoint = proxy.breakpoint();

proxy.data.splice(0,1,6,8,3,5,1,9,0,3);
proxy.data.sort((a,b) => (a - b));
proxy.something = 'done sorting!';

const initializedState = {};
proxy.replay(initializedState, breakpoint);

const sortedState = {};
proxy.replay(sortedState);

// initializedState === {something: 'new data', data: [1,2,3]}
// sortedState === {something: 'done sorting!', data: [0,1,2,3,3,3,5,6,8,9]}
```
