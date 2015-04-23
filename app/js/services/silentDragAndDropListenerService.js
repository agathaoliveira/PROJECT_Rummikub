/**
 * Copy from:
 * @link: https://github.com/yoav-zibin/emulator/blob/gh-pages/examples/drag_n_drop/dragAndDropListeners.js
 */

// You need to define a single method:
// function handleDragEvent(type, clientX, clientY) {...}
// type is either: "touchstart", "touchmove", "touchend", "touchcancel", "touchleave"
(function () {
    'use strict';

    var isMouseDown = false;

    function touchHandler(event) {
        var touch = event.changedTouches[0];
        handleEvent(event, event.type, touch.clientX, touch.clientY);
    }

    function mouseDownHandler(event) {
        isMouseDown = true;
        handleEvent(event, "touchstart", event.clientX, event.clientY);
    }

    function mouseMoveHandler(event) {
        if (isMouseDown) {
            handleEvent(event, "touchmove", event.clientX, event.clientY);
        }
    }

    function mouseUpHandler(event) {
        isMouseDown = false;
        handleEvent(event, "touchend", event.clientX, event.clientY);
    }

    function handleEvent(event, type, clientX, clientY) {
        // http://stackoverflow.com/questions/3413683/disabling-the-context-menu-on-long-taps-on-android
        // I also have:  touch-callout:none and user-select:none in main.css
        if (event.preventDefault) {
            event.preventDefault(); // Also prevents generating mouse events for touch.
        }
        if (event.stopPropagation) {
            event.stopPropagation();
        }
        event.cancelBubble = true;
        event.returnValue = false;
        //console.log("handleDragEvent:", type, clientX, clientY);
        handleDragEvent(type, clientX, clientY, event);
    }

    window.addEventListener("load", function () {
        var touchElementId = window.touchElementId ? window.touchElementId : "gameArea";
        var gameArea = document.getElementById(touchElementId);
        if (!gameArea) {
            throw new Error("You must have <div id='gameArea'>...</div>");
        }
        gameArea.addEventListener("touchstart", touchHandler, true);
        gameArea.addEventListener("touchmove", touchHandler, true);
        gameArea.addEventListener("touchend", touchHandler, true);
        gameArea.addEventListener("touchcancel", touchHandler, true);
        gameArea.addEventListener("touchleave", touchHandler, true);
        gameArea.addEventListener("mousedown", mouseDownHandler, true);
        gameArea.addEventListener("mousemove", mouseMoveHandler, true);
        gameArea.addEventListener("mouseup", mouseUpHandler, true);
    }, false );

})();
