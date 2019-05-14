/*
    Copyright 2019 Jaycliff Arcilla
*/
/*
    ISSUE(S)
        gamepad.node.js:181 Uncaught ReferenceError: id_to_index_map is not defined at EventEmitter.<anonymous> (<anonymous>:2:21)
        Very slow polling!!!
*/
(function gamepadEventsSetup(global) {
    "use strict";
    var gamepads = {
            '0': null,
            '1': null,
            '2': null,
            '3': null,
            length: 4
        },
        id_to_index_map = {},
        GAMEPAD = require('gamepad'),
        event_prefix = 'gamepad:',
        connectedEvent = new Event(event_prefix + 'connected'),
        disconnectedEvent = new Event(event_prefix + 'disconnected'),
        changeEvent = new Event(event_prefix + 'change'),
        buttonDownEvent = new Event(event_prefix + 'buttondown'),
        buttonUpEvent = new Event(event_prefix + 'buttonup');
    global.GAMEPAD = GAMEPAD;
    var button_pool = (function () {
        var pool = [];
        return {
            summon: function summon(value) {
                var button;
                if (pool.length) {
                    button = pool.pop();
                } else {
                    button = {
                        pressed: false,
                        touched: false,
                        value: 0
                    };
                }
                button.pressed = value;
                // button.touched = value;
                button.value = Number(value);
                return button;
            },
            banish: function banish(button) {
                button.pressed = false;
                button.touched = false,
                button.value = 0;
                pool.push(button);
                return this;
            }
        };
    }());
    var gamepad_pool = (function () {
        var pool = [];
        return {
            summon: function summon(item, index) {
                var gamepad, list, k, len;
                if (pool.length) {
                    gamepad = pool.pop();
                } else {
                    gamepad = {
                        axes: [],
                        buttons: [],
                        connected: false,
                        deviceID: -1,
                        id: '',
                        index: -1,
                        mapping: 'standard',
                        productID: -1,
                        timestamp: 0,
                        vendorID: -1
                    };
                }
                for (k = 0, list = item.axisStates, len = list.length; k < len; k += 1) {
                    gamepad.axes.push(list[k]);
                }
                for (k = 0, list = item.buttonStates, len = list.length; k < len; k += 1) {
                    gamepad.buttons.push(button_pool.summon(list[k]));
                }
                gamepad.connected = true;
                gamepad.deviceID = item.deviceID;
                gamepad.id = item.description;
                gamepad.index = index;
                gamepad.productID = item.productID;
                gamepad.timestamp = performance ? performance.now(): Date.now(),
                gamepad.vendorID = item.vendorID;
                return gamepad;
            },
            banish: function banish(gamepad) {
                var k, len, buttons;
                gamepad.axes.length = 0;
                for (k = 0, len = buttons.length; k < len; k += 1) {
                    button_pool.banish(buttons[k]);
                }
                gamepad.buttons.length = 0;
                gamepad.connected = false;
                gamepad.deviceID = -1;
                gamepad.id = '';
                gamepad.index = -1;
                gamepad.mapping = 'standard';
                gamepad.productID = -1;
                gamepad.timestamp = 0;
                gamepad.vendorID = -1;
                pool.push(gamepad);
            }
        }
    }());
    GAMEPAD.on('attach', function (id, rawGamepad) {
        var k, len, inserted = false;
        if (typeof id_to_index_map[rawGamepad.deviceID] !== "number") {
            for (k = 0, len = gamepads.length; k < len; k += 1) {
                if (!gamepads[k]) {
                    gamepads[k] = gamepad_pool.summon(rawGamepad, k);
                    id_to_index_map[rawGamepad.deviceID] = k;
                    inserted = true;
                }
            }
            if (!inserted) {
                gamepads[len] = gamepad_pool.summon(rawGamepad, len);
                id_to_index_map[rawGamepad.deviceID] = len;
                gamepads.length += 1;
                // inserted = true;
            }
        }
        global.dispatchEvent(connectedEvent);
        console.log('attach', id, rawGamepad);
    });
    GAMEPAD.init();
    GAMEPAD.on('move', function (id, axis, value) {
        var index = id_to_index_map[id], gamepad = gamepads[index];
        changeEvent.index = index;
        changeEvent.name = gamepad.id;
        changeEvent.kind = 'axis';
        changeEvent.value = value;
        changeEvent.which = axis;
        global.dispatchEvent(changeEvent);
    });
    GAMEPAD.on('up', function (id, num) {
        var index = id_to_index_map[id], gamepad = gamepads[index];
        gamepad.buttons[num] = 0;
        buttonUpEvent.index = index;
        buttonUpEvent.name = gamepad.id;
        buttonUpEvent.value = 0;
        buttonUpEvent.which = num;
        global.dispatchEvent(buttonUpEvent);
    });
    GAMEPAD.on('down', function (id, num) {
        var index = id_to_index_map[id], gamepad = gamepads[index];
        gamepad.buttons[num] = 1;
        buttonDownEvent.index = index;
        buttonDownEvent.name = gamepad.id;
        buttonDownEvent.value = 1;
        buttonDownEvent.which = num;
        global.dispatchEvent(buttonDownEvent);
    });
    GAMEPAD.on('remove', function (id) {
        var index = id_to_index_map[id], gamepad = gamepads[index];
        gamepads[index] = null;
        delete id_to_index_map[id];
        gamepad_pool.banish(gamepad);
        if (gamepads.length > 4) {
            if (!gamepads[gamepads.length - 1]) {
                delete gamepads[gamepads.length - 1];
                gamepads.length = 4;
            }
        }
        disconnectedEvent.gamepad = gamepad;
        global.dispatchEvent(disconnectedEvent);
        console.log('remove', id);
    });
    (function setupGamepads() {
        var k, len, gamepad;
        for (k = 0, len = GAMEPAD.numDevices(); k < len; k += 1) {
            gamepad = GAMEPAD.deviceAtIndex(k);
            if (gamepad) {
                gamepads[k] = gamepad_pool.summon(GAMEPAD.deviceAtIndex(k), k);
                id_to_index_map[gamepad.deviceID] = k;
            } else {
                gamepads[k] = null;
            }
        }
        gamepads.length = Math.max(len, 4);
    }());
    (function processEvents() {
        requestAnimationFrame(processEvents);
        GAMEPAD.processEvents();
    }());
    (function detectDevices() {
        GAMEPAD.detectDevices();
        requestIdleCallback(detectDevices);
    }());
    navigator.getSystemGamepads = function getSystemGamepads() {
        return gamepads;
    };
}(window));