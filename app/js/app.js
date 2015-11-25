/**
 * File: app/js/app.js
 * ------------------------------------------------
 * Starting point for application and configuration
 *
 * @author: Jingxin Zhu
 * @date  : 2015.05.10
 * ------------------------------------------------
 */

'use strict';

angular.module('myApp', ['ngTouch', 'ui.bootstrap', 'gameServices']).constant("CONFIG", {
        GAME_BOARD_ROWS: 6,
        GAME_BOARD_COLS: 18,
        GAME_AREA_PADDING_PERCENTAGE: 0.06,

        SETTING: {
            verbose            : true,
            show_dragging_lines: false
        }
    }
)
    .run(function () {
    $rootScope['game'] = game;
    translate.setLanguage('en', {
        RUMMIKUB_GAME:"Rummikub",
        debug:" ",
        ME:"Me",
        P0:"P1",
        P1:"P2",
        P2:"P3",
        P3:"P4",
        PICK:"pick",
        MELD:"meld",
        SORT:"sort",
        sort:"sort",
        SET:"set",
        COLOR:"color",
        UNDO:"undo",
        HELP:"help",
        123:"123",
        UNDO_ALL:"undo all",
        TILES_LEFT:"tiles left",
        FIRST:"First time to play Rummikub?",
        RULE_1:"Meld tiles in your hand in runs or groups",
        RULE_2:"Valid run: at least 3 tiles, same color, consecutive numbers",
        RULE_3:"Valid groups: different color,same number': \"Valid group: at least 3 tiles, different colors, same number\",",
        RULE_4:"Use joker tile to substitute",
        RULE_5:"To achieve first time meld, tiles sent should sum to 30 scores",
        RULE_6:"If you cannot meld in this turn, click 'pick' button to pick one more tile",
        RULE_7:"First person who has no tiles left in hand is the winner!",
        RULE_8:"See more rules on",
        wiki:"wiki",
        ROTATE_INFO:"Please rotate your phone for better display",
        PICK_ONE:"pick one tile",
        PICK_1:"[PICK] you cannot pick, since you sent tile to board.",
        PICK_2:"[PICK] you should not mess up the board, if you want to pick",
        MELD_1:"[MELD] meld is not ok",
        MELD_2:"[MELD] you cannot meld since no tiles sent to board in this turn",
        MELD_3:"[MELD]: you must score at least 30 (without joker tile) for your initial meld",
        MOVE_1:"[MOVE] you cannot move tiles from other player's hand",
        MOVE_2:"[MOVE] you cannot move tiles to other player's hand",
        CLOSE:"Close"
    });
    // game.init();
});
