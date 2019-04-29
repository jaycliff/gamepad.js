/*
    Copyright 2019 Jaycliff Arcilla
*/
(function gamepadEventsSetup(global) {
    "use strict";
    var v_map = { length: 0 },
        gamepads = navigator.getGamepads(),
        k,
        len,
        event_prefix = 'gamepad:',
        changeEvent = new Event(event_prefix + 'change'),
        buttonDownEvent = new Event(event_prefix + 'buttondown'),
        buttonUpEvent = new Event(event_prefix + 'buttonup'),
        gamepad;
    function setupGamePad(gamepad) {
        var index = gamepad.index;
        v_map[index] = {
            active: new Uint8Array(gamepad.buttons.length),
            prevAxes: new Float64Array(gamepad.axes.length),
            prevButtons: new Float64Array(gamepad.buttons.length)
        };
        debug: {
            let values = [], buttons = gamepad.buttons;
            for (let k = 0, len = buttons.length; k < len; k += 1) {
                let entry = buttons[k];
                values.push(entry.value);
            }
            console.log(values);
        }
    }
    global.v_map = v_map;
    global.addEventListener('gamepadconnected', function (event) {
        setupGamePad(event.gamepad);
        v_map.length = navigator.getGamepads().length;
        console.log('GAMEPAD #' + event.gamepad.index, 'connected!');
    }, false);
    global.addEventListener('gamepaddisconnected', function (event) {
        v_map[event.gamepad.index] = null;
        console.log('GAMEPAD #' + event.gamepad.index, 'disconnected!');
    }, false);
    v_map.length = gamepads.length;
    for (k = 0, len = gamepads.length; k < len; k += 1) {
        gamepad = gamepads[k];
        if (gamepad) {
            setupGamePad(gamepad);
        } else {
            v_map[k] = null;
        }
    }
    (function update() {
        var k1,
            len1,
            k2,
            len2,
            gamepads = navigator.getGamepads(),
            gamepad,
            axes,
            buttons,
            axis,
            button,
            button_active,
            map,
            prevAxes,
            prevButtons,
            active;
        requestAnimationFrame(update);
        for (k1 = 0, len1 = gamepads.length; k1 < len1; k1 += 1) {
            gamepad = gamepads[k1];
            if (gamepad) {
                map = v_map[k1];
                active = map.active;
                prevAxes = map.prevAxes;
                prevButtons = map.prevButtons;
                axes = gamepad.axes;
                buttons = gamepad.buttons;
                for (k2 = 0, len2 = axes.length; k2 < len2; k2 += 1) {
                    axis = axes[k2];
                    if (prevAxes[k2] !== axis) {
                        changeEvent.index = k1;
                        changeEvent.name = gamepad.id;
                        changeEvent.kind = 'axis';
                        changeEvent.value = axis;
                        changeEvent.which = k2;
                        document.dispatchEvent(changeEvent);
                        prevAxes[k2] = axis;
                    }
                }
                for (k2 = 0, len2 = buttons.length; k2 < len2; k2 += 1) {
                    button = buttons[k2];
                    if (prevButtons[k2] !== button.value) {
                        button_active = Number(button.pressed || button.touched);
                        if (active[k2] !== button_active) {
                            if (button_active) {
                                buttonDownEvent.index = k1;
                                buttonDownEvent.name = gamepad.id;
                                buttonDownEvent.value = button.value;
                                buttonDownEvent.which = k2;
                                document.dispatchEvent(buttonDownEvent);
                            } else {
                                buttonUpEvent.index = k1;
                                buttonUpEvent.name = gamepad.id;
                                buttonUpEvent.value = button.value;
                                buttonUpEvent.which = k2;
                                document.dispatchEvent(buttonUpEvent);
                            }
                            active[k2] = button_active;
                        }
                        changeEvent.index = k1;
                        changeEvent.name = gamepad.id;
                        changeEvent.kind = 'button';
                        changeEvent.value = button.value;
                        changeEvent.which = k2;
                        document.dispatchEvent(changeEvent);
                        prevButtons[k2] = button.value;
                    }
                }
            }
        }
    }());
    console.log(gamepads, v_map);
}(window));