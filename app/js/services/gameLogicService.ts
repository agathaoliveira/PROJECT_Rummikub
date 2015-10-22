/**
 * File: app/js/services/gameLogicService.js
 * ----------------------------------------------------------
 * Game logic for Rummikub game.
 *
 * @author: Agatha Oliveira *
 * @date  : 2015.02.14
 * ----------------------------------------------------------
 */

type Board = number[][];

 interface IState{
   board?: Board;
   deltas?: IDelta[];
   trace?: ITrace;
 }

 interface IDelta
 {
   tileIndex: number;
   from: {row: number ,col: number };
   to: {row: number, col: number};
 }

 interface ITrace
 {
   nexttile?: number;
   nplayers?: number;
 }

 interface ITileInfo
 {
   color?: string;
   score?: number;
 }
(function () {

    'use strict';

    /**
     **************************************************************************************
     *
     * I. Elements in game state.
     *
     * 1. board: 2D array.
     *      Each element is tileIndex ([0, 105]), -1 means no tile at that position.
     *      1.1  game board   (6 x 18)
     *      1.2  player board (nplayers x tiles in each player's hand)
     *
     *      e.g. 2-players initial scenario:
     *      row 0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17  col
     *      [ [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]  0  ----------
     *        [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]  1      |
     *        [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]  2  game board
     *        [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]  3      |
     *        [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]  4      |
     *        [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]  5  -----------
     *        [ 1, 2, 3, 4, 5, 6, 7, 8, 9,10,11,12,13],                6 // 1st player's hand
     *        [14,15,16,17,18,19,20,21,22,23,24,25,26]              ]  7 // 2nd player's hand
     *
     * 2. deltas: 1D array, recording the move history in current turn.
     *      Each element is like: {tileIndex:*, from: {row: * ,col: * }, to: {row: * ,col: *} }
     *
     * 3. type:  'INIT' / 'MOVE' / 'PICK' / 'MELD' / 'UNDO' / 'SORT'
     *
     * 4. trace: {nplayers: *, initial: [], nexttile: *}
     *
     * 5. tiles: array of tile, each tile is {tileIndex: {score: *, color: 'red'/'black'/'orange'/'blue'/'joker'}}
     *
     *----------------------------------------------------------------------------------
     *
     * II Moves in game process.
     *
     *  0 - setTurn : {setTurn : {turnIndex: 0}},
     *  0 - endMatch: {endMatch: {endMatchScores: [90, -90]}}
     *  1 - setType : {set: {key: 'type', value: "PICK"}}
     *  2 - setBoard: {set: {key: 'board', value: [[..]]}}
     *  3 - setDelta: {set: {key: 'deltas', value: [...]}}
     *  4 - setTrace: {set: {key: 'trace', value: {}}
     * *5 - setVisibility: {setVisibility: {key: 'tile28', visibleToPlayerIndices: [1]}},
     *
     *
     * II. Operations: the operation player chooses for current move.
     *
     *    "PICK", pick one tile from tile pool. // will ends current turn and shifts to next player
     *
     *    "MELD", make valid groups to meld.    // will ends turn and shifts to next players
     *      | --- "SEND"    , send one tile from player to board.
     *      | --- "RETRIEVE", retrieve one tile (sent to board in current turn) from board back to player.
     *      | --- "REPLACE" , replace one tile in board to another position in board.
     *
     *    "UNDO", undo last move in all moves in this turn.
     *
     *
     **************************************************************************************
     */
    angular.module('myApp').factory('gameLogicService', ['CONFIG', function(CONFIG) {

        /**
         * Checks whether given move is Ok or not.
         *
         * @param param (object) {turnIndexBeforeMove:(int), stateBeforeMove: (object), move:[]}
         * @returns {boolean}
         */
        function isMoveOk(param: IIsMoveOk): boolean {
            var playerIndex: number = param.turnIndexBeforeMove;
            var stateBefore: IState = param.stateBeforeMove;
            var actualMove: IMove  = param.move;
            try {
                var expectedMove = createMove(stateBefore, playerIndex, actualMove);
                if (!angular.equals(actualMove, expectedMove)) {
                    if (CONFIG.SETTING.verbose) {
                        // print debug info
                        var actLen = actualMove.length;
                        var expLen = expectedMove.length;
                        if (actLen !== expLen) {
                            console.log("Different length for actual move and expected move");
                        } else {
                            for (var i = 0; i < actLen; i++) {
                                if ( !angular.equals(actualMove[i], expectedMove[i]) ) {
                                    console.log("act: " + JSON.stringify(actualMove[i]));
                                    console.log("exp: " + JSON.stringify(expectedMove[i]));
                                }
                            }
                        }
                    }
                    return false;
                }
            } catch (e) {
                //if (CONFIG.SETTING.verbose) {
                //    //console.log(e.stack);
                //    console.log(e.message);
                //}
                return false;
            }
            return true;
        }

        /**
         *
         * @param stateBefore
         * @param playerIndex
         * @param actualMove
         * @returns {*}
         */
        function createMove(stateBefore: IState, playerIndex: number, actualMove: IMove): IMove {
            var moveType = actualMove[1].set.value;
            if (moveType !== "INIT") {
                check( !isGameOver(stateBefore),
                    "Game is over, you cannot move any move"
                );
            }
            var expectedMove: IMove;
            var deltas: IDelta[];
            switch (moveType) {
                case "INIT":
                    var nPlayers = actualMove[2].set.value.nplayers;
                    expectedMove = getInitialMove(nPlayers);
                    break;
                case "MOVE":
                    deltas = actualMove[3].set.value;
                    var delta = deltas[deltas.length - 1];
                    expectedMove = getMoveMove(playerIndex, stateBefore, delta, null);
                    break;
                case "PICK":
                    expectedMove = getPickMove(playerIndex, stateBefore);
                    break;
                case "MELD":
                    expectedMove = getMeldMove(playerIndex, stateBefore);
                    break;
                case "SORT":
                    var sortType = actualMove[2].set.value;
                    expectedMove = getSortMove(playerIndex, stateBefore, sortType);
                    break;
                case "UNDO":
                    expectedMove = getSingleUndoMove(playerIndex, stateBefore);
                    break;
                case "COMB":
                    deltas = actualMove[3].set.value;
                    expectedMove = getCombinedMove(playerIndex, stateBefore, deltas);
                    break;
                default:
                    throw new Error("Unexpected move");
            }
            return expectedMove;
        }

        /**
         * Creates the initial move.
         *
         * @param nPlayers (int) number of players in current game.
         * @returns {*[]} array of operations in initial move.
         */
        function getInitialMove(nPlayers: number): IMove {
            // 1. make sure 2 - 4 players are playing the game.
            check(nPlayers <= 4 && nPlayers >= 0,
                "INIT: nPlayers = " + nPlayers + " is given, but only 2 - 4 players are allowed."
            );

            // Initially, set 'initial' to false, i.e. no player has made initial meld
            var initial: IMove = [];
            for (var i = 0; i < nPlayers; i++) {
                initial.push(false);
            }
            // 2. construct the move
            var nTilesPerPlayerInitially = 14;
            var move: IMove = [
                {setTurn: {turnIndex: 0}},
                {set: {key: 'type', value: "INIT"}},
                {set: {key: 'trace', value: {
                    nplayers: nPlayers,
                    initial: initial,
                    nexttile: nPlayers * 14}}},
                {set: {key: 'board', value: getInitialBoard(nPlayers)}},
                {set: {key: 'deltas', value: []}}
            ];

            // 3.1. initialize game tiles and shuffle keys
            var tiles: IOperation[] = [];
            var shuffleKeys: string[] = [];
            for (var tileIndex = 0; tileIndex< 106; tileIndex++) {
                tiles[tileIndex] = {set: {key: "tile" + tileIndex, value: getTileByIndex(tileIndex)}};
                shuffleKeys[tileIndex] = 'tile' + tileIndex;
            }

            // 3.2. initialize tile visibility
            var visibility: IOperation[] = [];
            for (var ii = 0; ii < nPlayers; ii++) {
                for (var jj = 0; jj < nTilesPerPlayerInitially; jj++) {
                    // each player has 14 tiles in hand initially
                    tileIndex = ii * nTilesPerPlayerInitially + jj;
                    visibility[tileIndex] = {setVisibility: {key: 'tile' + tileIndex, visibleToPlayerIndices: [ii]}};
                }
            }

            move = move.concat(tiles);
            move.push({shuffle: {keys: shuffleKeys}});
            move = move.concat(visibility);
            return move;
        }

        /**
         *
         * @param playerIndex
         * @param stateBefore
         * @param delta
         * @param undo
         * @returns {*[]}
         */
        function getMoveMove(playerIndex: number, stateBefore: IState, delta, undo): IMove {
            var tileToMove = delta.tileIndex;
            var from = delta.from;
            var to = delta.to;

            // 1. get game board
            var board: Board = stateBefore.board;
            var deltas = stateBefore.deltas;

            var playerRow = getPlayerRow(playerIndex);

            // 2.1 check from's position is within board, not empty and consistent as declared in delta
            checkPositionWithinBoard(board, from.row, from.col);

            check(board[from.row][from.col] === tileToMove,
                "[MOVE] tile" + tileToMove + " is not at board[" + from.row + "][" + from.col + "]");

            check(tileToMove !== -1,
                "[MOVE] no tile at board[" + from.row + "][" + from.col + "]" );

            // 2.2 check to's position is within board and is empty
            checkPositionWithinBoard(board, to.row, to.col);

            check(board[to.row][to.col] === -1,
                "[MOVE] board[" + to.row + "][" + to.col + "] has been occupied by tile" + board[to.row][to.col] );

            // 2.3 player cannot move one tile from other player's hand
            check( from.row >=0 && from.row < getGameBoardRows() ||   // from game board
                from.row === playerRow,
                "[MOVE] you cannot move tiles from other player's hand" );

            // 2.4 player cannot move one tile to other player's hand
            check( to.row >=0 && to.row < getGameBoardRows() ||     // to game board
                to.row ===  playerRow,
                "[MOVE] you cannot move tiles to other player's hand" );

            // 3. player can only move his own tile if has not finished initial meld
            if (stateBefore.trace.initial[playerIndex] === false) {
                // if player has not yet finished initial meld, he can only move from his hand
                check(from.row === playerRow || isTileSentToBoardInCurrentTurnByPlayer(tileToMove, playerIndex, deltas),
                    "[MOVE] cannot move other player's tiles on board, since you have not finished initial meld" );
            }

            // null means every player can see
            var visibility = null;

            // 4. can only send tile which was sent to game board in current turn
            // back to player hand
            if (to.row === playerRow) {
                check( from.row === playerRow  ||   // move tiles in hand
                    isTileSentToBoardInCurrentTurnByPlayer(tileToMove, playerIndex, deltas), // retrieve own tile from board
                    "[MOVE] cannot retrieve tile" + tileToMove+ " back to hand because" +
                    "it is not sent by board by you in current turn" );
                // after back to hand, only player himself can see that tile
                visibility = [playerIndex];
            }

            // 5. construct move operations.
            var boardAfter = angular.copy(board);
            boardAfter[from.row][from.col] = -1;
            boardAfter[to.row][to.col] = tileToMove;

            var deltasAfter = angular.copy(deltas);
            var moveTypeAfter = "MOVE";
            if (undo !== undefined && undo === true) {
                deltasAfter.splice(deltasAfter.length - 1, 1);
                moveTypeAfter = "UNDO";
            } else {
                deltasAfter.push(delta);
            }

            return [
                {setTurn: {turnIndex: playerIndex}},        // this move will not change turnIndex
                {set: {key: 'type', value: moveTypeAfter}},
                {set: {key: 'board', value: boardAfter}},
                {set: {key: 'deltas', value: deltasAfter}},
                {setVisibility: {key: 'tile' + tileToMove, visibleToPlayerIndices: visibility}}
            ];
        }

        /**
         *
         * @param playerIndex
         * @param stateBefore
         * @returns {*[]}
         */
        function getPickMove(playerIndex, stateBefore: IState) {

            var playerRow = getGameBoardRows() + playerIndex;

            // 1. make sure player did not sent any tile to board during this turn.
            var tilesSentToBoardThisTurn = getTilesSentToBoardThisTurn(stateBefore.deltas, playerRow);
            check(tilesSentToBoardThisTurn.length === 0,
                "[PICK] you cannot pick, since you sent tile to board."
            );

            // 2. player is able to replace tiles throughout the board,
            //    but before picking, he should restore the 'able-to-meld' state
            //    and retrieve all tiles he sent to board in this turn back to his hand.
            check(isMeldOk(stateBefore, stateBefore.board, playerIndex, true),
                "[PICK] you should not mess up the board, if you want to pick" );

            var tileToPick = stateBefore.trace.nexttile;

            // 3. construct move operations.
            var boardAfter = angular.copy(stateBefore.board);
            boardAfter[playerRow].push(tileToPick);
            // sort tiles in hand by finding all sets and put sets at the front
            boardAfter[playerRow] = findAllSetInHand(boardAfter[playerRow], stateBefore);

            var traceAfter = angular.copy(stateBefore.trace);
            traceAfter.nexttile = tileToPick + 1;

            var firstOperation =  {setTurn: {turnIndex: getPlayerIndexOfNextTurn(playerIndex, stateBefore.trace.nplayers)}};
            if (traceAfter.nexttile === 106) {
                firstOperation = {endMatch: {endMatchScores: getEndScores(-1, stateBefore)}};
            }
            return [
                firstOperation,
                {set: {key: 'type', value: "PICK"}},
                {set: {key: 'board', value: boardAfter}},
                {set: {key: 'deltas', value: []}},     // pick move will clear delta history
                {set: {key: 'trace', value: traceAfter}},
                {setVisibility: {key: 'tile' + tileToPick, visibleToPlayerIndices: [playerIndex]}}
            ];
        }

        /**
         *
         * @param playerIndex
         * @param stateBefore
         * @returns {*[]}
         */
        function getMeldMove(playerIndex, stateBefore: IState): IMove {
            var board = stateBefore.board;
            var playerRow = getPlayerRow(playerIndex);
            var deltas = stateBefore.deltas;

            // 0. check player has sent as least one tile from hand to board during this turn.
            var tilesSentToBoardThisTurn = getTilesSentToBoardThisTurn(deltas, playerRow);
            check ( tilesSentToBoardThisTurn.length !== 0,
                "[MELD] you cannot meld since no tiles sent to board in this turn"
            );

            // 1. check all sets in board are valid sets (runs or groups)
            check (isMeldOk(stateBefore, board, playerIndex ,stateBefore.trace.initial[playerIndex]),
                "[MELD] meld is not ok" );

            // 2. check winner: player only has -1 tile in hand, he wins
            var hasPlayerWon = true;
            for (var i = 0; i < board[playerRow].length; i++) {
                if (board[playerRow][i] !== -1) {
                    hasPlayerWon = false;
                    break;
                }
            }

            var firstOperation;
            if ( hasPlayerWon ) {
                firstOperation = {endMatch: {endMatchScores: getEndScores(playerIndex, stateBefore)}};
            } else {
                firstOperation = {setTurn: {
                    turnIndex: getPlayerIndexOfNextTurn(playerIndex, stateBefore.trace.nplayers)}};
            }

            // 3. construct move
            var boardAfter = angular.copy(stateBefore.board);
            // clear all empty slots for player's hand
            for (var col = boardAfter[playerRow].length; col >= 0; col-- ) {
                if (boardAfter[playerRow][col] === -1) {
                    boardAfter[playerRow].splice(col, 1);
                }
            }
            var traceAfter = angular.copy(stateBefore.trace);
            traceAfter.initial[playerIndex] = true;
            return [
                firstOperation,
                {set: {key: 'type', value: "MELD"}},
                {set: {key: 'board', value: boardAfter}},
                {set: {key: 'deltas', value: []}},     // meld move will clear delta history
                {set: {key: 'trace', value: traceAfter}}
            ];

        }

        function getSortMove(playerIndex, stateBefore: IState, sortType): IMove {
            var boardAfter = angular.copy(stateBefore.board);
            var playerHand = boardAfter[getPlayerRow(playerIndex)];
            switch (sortType) {
                case "score":
                case "color":
                    playerHand.sort(sortBy(sortType, stateBefore), stateBefore);
                    break;
                case "set":
                    boardAfter[getPlayerRow(playerIndex)] = findAllSetInHand(playerHand, stateBefore);
                    break;
                default :
                    throw new Error("Unexpected sort type: " + sortType);
            }
            return [
                {setTurn: {turnIndex: playerIndex}},
                {set: {key: 'type', value: "SORT"}},
                {set: {key: 'sorttype', value: sortType}},
                {set: {key: 'board', value: boardAfter}}
            ];
        }

        /**
         *
         * Undo last move by player in current turn
         * @param playerIndex
         * @param stateBefore
         */
        function getSingleUndoMove(playerIndex, stateBefore: IState): IMove {
            var deltas = stateBefore.deltas;
            var delta = deltas[deltas.length - 1];
            // reverse the last delta, and then make that move
            var deltaUndo = {tileIndex: delta.tileIndex , from: delta.to, to: delta.from};
            var moveUndo = getMoveMove(playerIndex, stateBefore, deltaUndo, true);
            moveUndo[1].set.value = "UNDO";
            return moveUndo;
        }

        function getCombinedMove(playerIndex, stateBefore: IState, deltas) : IMove{

            check(deltas.length > 0, "no move to make");

            var board = angular.copy(stateBefore.board);

            for (var i = 0; i < deltas.length; i++) {
                var delta = deltas[i];
                checkDelta(delta, board);
                board[delta.from.row][delta.from.col] = -1;
                board[delta.to.row][delta.to.col] = delta.tileIndex;
            }

            var traceAfter = angular.copy(stateBefore.trace);
            traceAfter.initial[playerIndex] = true;
            var move = [
                {setTurn: {turnIndex: playerIndex}},
                {set: {key: 'type', value: "COMB"}},
                {set: {key: 'board', value: board}},
                {set: {key: 'deltas', value: deltas}},
                {set: {key: 'trace', value: traceAfter}}
            ];
            return move;
        }

        function checkDelta(delta, board: Board) {
            check(delta.tileIndex !== undefined && delta.from !== undefined, delta.to !== undefined,
                "missing part for delta" );

            check (board[delta.from.row][delta.from.col] === delta.tileIndex,
                "tile" + delta.tileIndex + " is not at board[" + delta.from.row + "][" + delta.from.col + "]");

            check (board[delta.to.row][delta.to.col] === -1, "position is occupied");

        }


        function getPossibleMoves(playerIndex, stateBefore: IState): IMove[]{
            var possibleMoves: IMove[] = [];
            possibleMoves.push(getPickMove(playerIndex, stateBefore));

            var computerDeltas = [];
            //var playerRow = getPlayerRow(playerIndex);

            // 1. find all sets in hand (group > set)
            var playerHand = angular.copy(stateBefore.board[getPlayerRow(playerIndex)]);
            var hand = angular.copy(playerHand);

            var findResultOfGroupFirst = findSetsInHand(playerHand, stateBefore, "groupFirst");
            var sets = findResultOfGroupFirst.sets;

            var ableToInitial = true;
            if (stateBefore.trace.initial[playerIndex] === false) {
                if (getScore(sets, stateBefore) < 30) {
                    ableToInitial = false;
                }
            }

            //var remains = findResultOfGroupFirst.remains;

            //var findResultOfRunFirst = findSetsInHand(playerHand, stateBefore, "runFirst");
            //var sets2 = findResultOfRunFirst.sets;
            //var remains2 = findResultOfRunFirst.remains;
            //console.log("sets1: " + sets);
            //console.log("sets2: " + sets2);

            // 2. for rest tiles, try to append them using tiles in board
            var board = angular.copy(stateBefore.board);

            //if (stateBefore.trace.initial[playerIndex] === true) {
            //    // only able to append tile to other tiles on board when finish initial meld
            //    var expectingTiles = getExpectingTiles(stateBefore);
            //    console.log("expect: " + printObj(expectingTiles));
            //
            //    if (expectingTiles.length > 0) {
            //        for (var i = 0 ; i < remains.length; i++) {
            //            var tileIndex = remains[i];
            //            var tile = findTileFromGameStateByIndex(remains[i], stateBefore);
            //            for (var j = 0; j < expectingTiles; j++) {
            //                if (angular.equals(tile, expectingTiles[j].tile)) {
            //                    var delta = {tileIndex: remains[i],
            //                        from: {row: playerRow, col: hand.indexOf(tileIndex)},
            //                        to: expectingTiles[j].pos
            //                    };
            //                    computerDeltas.push(delta);
            //                    board[delta.to.row][delta.to.col] = delta.tileIndex;
            //                    board[delta.from.row][delta.from.col] = -1;
            //                    break;
            //                }
            //            }
            //        }
            //    }
            //}

            // 3. find proper position to place sets
            var start = {row: 0, col: 0};
            for (var i = 0; i < sets.length; i++) {
                var emptySlot = getNextEmptySlotInBoard(board, start, sets[i].length);
                if (emptySlot === null) {
                    break;
                }
                for (var j = 0; j < sets[i].length; j++) {
                    var delta = {tileIndex: sets[i][j],
                        from: {row: getPlayerRow(playerIndex), col: hand.indexOf(sets[i][j])},
                        to: {row: emptySlot.row, col: emptySlot.col + j}
                    };
                    //console.log("aa: " + sets[i][j] + " , "  + hand);
                    computerDeltas.push(delta);
                    board[delta.from.row][delta.from.to] = -1;
                    board[delta.to.row][delta.to.col] = delta.tileIndex;
                }
                start = {row: emptySlot.row, col: emptySlot.col + sets[i].length};
            }
            //console.dir(computerDeltas);
            //console.log("here" + JSON.stringify(computerDeltas, null, 4));


            if (ableToInitial && computerDeltas.length !== 0) {

                var move = getCombinedMove(playerIndex, stateBefore, computerDeltas);
                possibleMoves.push(move);

            }

            return possibleMoves;

        }

        //function getExpectingTiles (gameState) {
        //    var expecting = [];
        //    var board = gameState.board;
        //    var setsOnBoard = getAllSetsOnBoard(board, gameState);
        //
        //    // check each set
        //    for (var i = 0; i < setsOnBoard.length; i++) {
        //        var tileSet = setsOnBoard[i].tileSet;
        //        var start = setsOnBoard[i].start;
        //        //console.log("here: " + printObj(tileSet));
        //        //console.log("at: " + printObj(start) );
        //
        //        //TODO: deal with set that has joker inside
        //        var hasJoker = false;
        //        for (var j = 0; j < tileSet.length; j++) {
        //            if (tileSet[j].color === 'joker') {
        //                hasJoker = true;
        //            }
        //        }
        //
        //        //TODO: let computer rearrange tiles on board
        //        if (hasJoker === false) {
        //            var colToSend;
        //            if (tileSet[0].color === tileSet[1].color) {
        //                // expecting a tile inserted into run
        //                colToSend = start.col + tileSet.length;
        //                var highScore = tileSet[tileSet.length - 1].score;
        //                if (highScore < 13 &&
        //                    colToSend < getGameBoardCols() && colToSend + 1 < getGameBoardCols() &&
        //                        board[start.row][colToSend] === -1 && board[start.row][colToSend + 1] === -1
        //                ) {
        //                    expecting.push({tile: {score: highScore + 1, color: tileSet[0].color}, pos: {row: start.row, col: colToSend}});
        //                }
        //                var lowScore = tileSet[0].score;
        //                if (lowScore > 1 &&
        //                        colToSend >= 0 && colToSend - 1 >= 0 &&
        //                        board[start.row][colToSend] === -1 && board[start.row][colToSend - 1] === -1
        //                ) {
        //                    expecting.push({tile: {score: lowScore - 1, color: tileSet[0].color, pos: {row: start.row, col: colToSend}}});
        //                }
        //
        //            } else {
        //                // expecting a tile inserted into group
        //                if (tileSet.length === 3) {
        //                    var colors = ["black", "red", "blue", "orange"];
        //                    for (var ii = 0; ii < 3; ii++) {
        //                        var index = colors.indexOf(tileSet[i].color);
        //                        if (index !== -1) {
        //                            colors.splice(index, 1);
        //                        }
        //                    }
        //                    colToSend = start.col + tileSet.length;
        //                    if ( colToSend < getGameBoardCols() && colToSend + 1 < getGameBoardCols() &&
        //                        board[start.row][colToSend] === -1 && board[start.row][colToSend + 1] === -1
        //                    ) {
        //                        expecting.push({
        //                            tile: {score: tileSet[0].score, color: colors[0]},
        //                            pos: {row: start.row, col: colToSend}
        //                        });
        //                    }
        //                }
        //
        //            }
        //        }
        //
        //    }
        //    return expecting;
        //
        //}

        //function findTileFromGameStateByIndex(tileIndex, gameState) {
        //    check (gameState["tile" + tileIndex] !== undefined, "undefined tile");
        //    return gameState["tile" + tileIndex];
        //}

        function getScore(sets, gameState: IState): number {
            var score = 0;
            for (var i = 0; i < sets.length; i++) {
                for (var j = 0; j < sets[i].length; j++) {
                    var tileIndex = sets[i][j];
                    var tile = gameState["tile" + tileIndex];
                    // joker's score in initial meld is 0
                    if (tile.color !== "joker") {
                        score += tile.score;
                    }
                }
            }
            return score;
        }

        function getNextEmptySlotInBoard(board: Board, start, slot_size) {
            //if (start.row > getGameBoardRows() ) {
            //    return null;
            //}
            var row = start.row;
            var col = start.col;
            var emptyCount = 0;
            for (var r = row; r < getGameBoardRows(); r++) {
                var colStart = (r === row) ? col : 0;
                for (var c = colStart; c < getGameBoardCols(); c++) {
                    if (board[r][c] === -1) {
                        emptyCount = 0;

                        for (var i = c; i < getGameBoardCols(); i++) {
                            if (board[r][i] !== -1) {
                                c = i + 1;
                                break;
                            }
                            emptyCount++;
                            if (c === 0 && emptyCount > slot_size) {
                                // need one empty cell on right side to separate with next
                                return {row: r, col: 0};
                            }
                            if (c !== 0 && emptyCount > slot_size + 1) {
                                // need one empty cell on both left side and right side
                                return {row: r, col:  c + 1};
                            }
                            if (i === getGameBoardCols() - 1 && emptyCount > slot_size) {
                                // need one empty cell on left side to separate set originally on left side
                                return {row: r, col: c + 1};
                            }
                        }
                        // continue in this row
                    }
                }
            }
            return null;
        }

        function findSetsInHand(tiles, state: IState) {
            var remains = tiles;
            var sets = [];
            var groups = [];
            var runs = [];

            groups = findAllGroups(tiles, state);
            if (groups.length !== 0) {
                // group found in hand
                remains = getRemainTilesFromSets(tiles, groups);
                sets = sets.concat(groups);
            }
            runs = findAllRuns(remains, state);
            if (runs.length !== 0) {
                sets = sets.concat(runs);
                remains = getRemainTilesFromSets(remains, runs);
            }


            //if (option === "groupFirst") {
            //    groups = findAllGroups(tiles, state);
            //    if (groups.length !== 0) {
            //        // group found in hand
            //        remains = getRemainTilesFromSets(tiles, groups);
            //        sets = sets.concat(groups);
            //    }
            //    runs = findAllRuns(remains, state);
            //    if (runs.length !== 0) {
            //        sets = sets.concat(runs);
            //        remains = getRemainTilesFromSets(remains, runs);
            //    }
            //} else {
            //    // "runFirst" option
            //    runs = findAllRuns(tiles, state);
            //    if (runs.length !== 0) {
            //        remains = getRemainTilesFromSets(tiles, runs);
            //        sets = sets.concat(runs);
            //    }
            //    groups = findAllGroups(remains, state);
            //    if (groups.length !== 0) {
            //        sets = sets.concat(groups);
            //        remains = getRemainTilesFromSets(remains, groups);
            //    }
            //}
            return {sets: sets, remains: remains};
        }

        function getRemainTilesFromSets(tiles, sets) {
            var result = angular.copy(tiles);
            for (var i = 0; i < sets.length; i++) {
                for (var j = 0; j < sets[i].length; j++) {
                    var index = result.indexOf(sets[i][j]);
                    if (index !== -1) {
                        result.splice(index, 1);
                    }
                }
            }
            return result;
        }

        /** ******************************************************
         ************        Helper Functions    *****************
         *********************************************************/

        /**
         * checks if given condition is satisfied. Throw error if not satisfied.
         *
         * @param condition condition to be tested and expected to be true.
         * @param message error message when condition is not satisfied.
         */
        function check(condition: boolean, message: string) {
            if (condition === false) {
                throw new Error(message);
            }
        }

        function checkPlayerIndex(playerIndex: number, nPlayers: number) {
            check( playerIndex >= 0 && playerIndex < nPlayers,
                "checkPlayerIndex, [playerIndex:  " + playerIndex + ", nPlayers: " + nPlayers);
        }

        /**
         * gets the player's index of next turn.
         *
         * @param playerIndex
         * @param nPlayers number of players in current game.
         * @returns {number} index of next turn.
         */
        function getPlayerIndexOfNextTurn(playerIndex: number, nPlayers: number) {
            checkPlayerIndex(playerIndex, nPlayers);
            var index = 0;
            if (playerIndex === nPlayers - 1) {
                index = 0;
            } else {
                index = playerIndex + 1;
            }
            return index;
        }

        /**
         * initializes game board.
         *
         * @param nPlayers
         * @returns {Array}
         */
        function getInitialBoard(nPlayers: number) {
            var board: Board = [
                [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
                [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
                [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
                [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
                [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
                [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]
            ];
            var tileIndex = 0;
            var tilesInHandInitially = 14;
            // push 14 tiles for each player
            for (var i = 0; i < nPlayers; i++) {
                var row: number[] = [];
                for (var j = 0; j < tilesInHandInitially; j++) {
                    row.push(tileIndex);
                    tileIndex++;
                }
                board.push(row);
            }
            return board;
        }

        /**
         * checks given (row, col) is within board's boundary,
         * p.s., board is guaranteed not undefined before calling.
         *
         * @param board
         * @param row
         * @param col
         */
        function checkPositionWithinBoard(board: Board, row: number, col: number) {
            check (row !== undefined && col !== undefined,
                "checkPositionWithinBoard: (row, col) = (" + row + "," +  col + ") is undefined"
            );
            var rows = board.length;
            var cols = board[row].length;
            check( row >= 0 && row < rows && col >= 0 && col < cols,
                "checkPositionWithinBoard: position out Of board, [row: " + row + ", col: " + col + "]"
            );
        }

        /**
         * gets tile object by tile index.
         *
         * example: index = 1 -> {color: "blue", score:1}
         *
         * @param index (int)
         * @returns {{color: *, score: *}}
         */
        function getTileByIndex(index: number): ITileInfo {
            check (index >=0  && index < 106, "Illegal index");
            var color: string;
            var score: number;
            if (index === 104 || index === 105) {
                color = "joker";
                score = 0;
            } else {
                if (index < 26) {
                    color = 'blue';
                } else if (index < 52) {
                    color = 'red';
                } else if (index < 78) {
                    color = 'black';
                } else {
                    color = 'orange';
                }
                score = index % 13  + 1;
            }
            return {color: color, score: score};
        }

        /**
         * parses one row in game board into array of 'sets' in this row.
         *
         * example: row = [1,2,3,-1,-1,-1,4,8,9,10,-1,-1] -> [[1,2,3],[4,8,9,10]]
         *
         * @param row (array[int]) array of tile indices.
         * @returns {Array}
         */
        function parseRowToSets(row: number[]): number[][] {
            var result: number[][] = [];
            var tileSet: number[] = [];
            for (var i = 0; i < row.length; i++) {
                var tileIndex = row[i];
                if (tileIndex === -1) {
                    // current set ends
                    if (tileSet.length !== 0) {
                        result.push(tileSet);
                        tileSet = [];
                    }
                } else {
                    check(tileIndex >= 0 && tileIndex < 106,
                        "tileIndex: " + tileIndex
                    );
                    tileSet.push(tileIndex);
                }
            }
            // in case last tileSet ends at last element of row
            if (tileSet.length !== 0) {
                result.push(tileSet);
            }
            return result;
        }

        /**
         * valid runs: contains 3 or more tiles, and
         *             tiles have the same color, and
         *             tile's score are in consecutive number order. Joker can substitute any tile.
         *
         * runs examples: [black3,black4,black5]; [red7,red8,red9,red10,red11]
         *
         * @param sets (array[{color: .., score: ..}])
         * @returns {boolean}
         */
        function isRuns(sets: ITileInfo[]): boolean {
            var len = sets.length;
            if (len < 3 || len > 13) {
                return false;
            }
            var sameColor: string = undefined;
            var expectScore = 0;
            for (var i = 0; i < len; i++) {
                var color = sets[i].color;
                var score = sets[i].score;
                if (color !== 'joker') {
                    // 1. check same color
                    if (sameColor === undefined) {
                        sameColor = color;
                    }
                    if (sameColor !== color) {
                        return false;
                    }

                    // 2. check number, cannot repeat number in current numbers;
                    if (expectScore === 0) {
                        expectScore = score;
                    }
                    if (score !== expectScore) {
                        return false;
                    }
                }
                if (expectScore !== 0) {
                    expectScore += 1;
                }
            }
            return true;
        }

        /**
         * valid groups: sets contain 3 or 4 tiles, and
         *               different colors with each other, and
         *               tiles have the same tile score. joker can substitute any tile in need.
         *
         * groups examples: [black3,red3,joker]; [red7,orange7,blue7,black7]
         *
         * @param sets (array[{color: .., score: ..}])
         * @returns {boolean}
         */
        function isGroups(sets: ITileInfo[]): boolean {
            var length = sets.length;
            if (length !== 3 && length !== 4) {
                return false;
            }
            var sameScore: number = undefined;
            var colors: string[] = [];
            for (var i = 0; i < length; i++) {
                var color = sets[i].color;
                var score = sets[i].score;
                if (color !== 'joker') {
                    // 1. check scores are the same
                    if (sameScore === undefined) {
                        // 1st score from the sets
                        sameScore = score;
                    }
                    if (score !== sameScore) {
                        return false;
                    }

                    // 2. check has different colors.
                    if (colors.indexOf(color) !== -1) {
                        // duplicated color appears
                        return false;
                    }
                    colors.push(color);
                }
            }
            return true;
        }

        function getSetsOfTilesByIndex(setsOfTileIndices: number[], state: IState) {
            var result = [];
            for (var i = 0; i < setsOfTileIndices.length; i++) {
                var tile = state["tile" + setsOfTileIndices[i]];
                result.push(tile);
            }
            return result;
        }

        /**
         * get scores of each player at the end of the game.
         * winner gets the scores of tiles that loser still holds at the end.
         *
         * example: player0: []     // winner
         *          player1: [{color:'blue',score:4}, {color:'black',score:5}] // still in player1's hand
         *       -> player0's score = 9, player1's score = -9
         *
         * @param winnerIndex (int) of player who won the game.
         * @param state
         * @returns {Array}
         */
        function getEndScores(winnerIndex: number, state: IState): number[] {
            var result: number[] = [];
            var nPlayers = state.trace.nplayers;
            if (winnerIndex === -1 ) {
                for (var ii = 0; ii < nPlayers; ii++ ) {
                    result.push(0);
                }
            } else {
                var scoresFromAllLosers = 0;
                for (var i = 0; i < nPlayers; i++) {
                    // calculating score for each player who is not winner
                    if (i !== winnerIndex) {
                        var tilesRemaining = state.board[getPlayerRow(i)];
                        var score = 0;
                        for (var j = 0; j < tilesRemaining.length; j++) {
                            // adding each tile's score
                            var tile = state["tile" + tilesRemaining[j]];
                            if (tile.color === 'joker') {
                                // joker tile's score is 30
                                score -= 30;
                            } else {
                                score -= tile.score;
                            }
                        }
                        result[i] = score;
                        scoresFromAllLosers += score;
                    }
                }
                // winner score is all scores from losers
                result[winnerIndex] = - scoresFromAllLosers;
            }
            return result;
        }

        /**
         * check whether current board can meld.
         *
         * @param stateBefore
         * @param board
         * @param playerIndex
         * @param initial
         * @returns {boolean}
         */
        function isMeldOk(stateBefore: IState, board: Board, playerIndex: number, initial: boolean): boolean {
            var setsInBoard: number[][] = [];
            // get all 'sets' in game board by scanning each row of board
            for (var i = 0; i < getGameBoardRows(); i++) {
                setsInBoard = setsInBoard.concat(parseRowToSets(board[i]));
            }
            for (var ii = 0; ii < setsInBoard.length; ii++) {
                var sets = getSetsOfTilesByIndex(setsInBoard[ii], stateBefore);
                if ( !isRuns(sets) && !isGroups(sets) ) {
                    //console.log("isMeldOk, invalid sets: [" + setsInBoard[ii] + "]");
                    return false;
                }
            }
            if (initial === false) {
                var tilesSentToBoardThisTurn = getTilesSentToBoardThisTurn(stateBefore.deltas, getPlayerRow(playerIndex));
                var score = getInitialMeldScore(stateBefore, setsInBoard, tilesSentToBoardThisTurn);
                check(score >= 30,
                    "[MELD]: you must score at least 30 (without joker tile) for your initial meld" );
            }
            return true;
        }

        //function getAllSetsOnBoard(board, gameState) {
        //    var setsOnBoard = [];
        //    for (var row = 0; row < getGameBoardRows(); row++) {
        //
        //        var tileSet = [];
        //        for (var col  = 0; col < getGameBoardCols(); col++) {
        //            var tileIndex = board[row][col];
        //            if (tileIndex === -1) {
        //                // current set ends
        //                if (tileSet.length !== 0) {
        //                    var obj = {tileSet: tileSet, start: {row: row, col: col - tileSet.length}};
        //                    setsOnBoard.push(obj);
        //                    tileSet = [];
        //                }
        //            } else {
        //                check(tileIndex >= 0 && tileIndex < 106,
        //                    "tileIndex: " + tileIndex
        //                );
        //                tileSet.push(findTileFromGameStateByIndex(tileIndex, gameState));
        //            }
        //        }
        //        // in case last tileSet ends at last element of row
        //        if (tileSet.length !== 0) {
        //            setsOnBoard.push({tileSet: tileSet, start: {row: row, col: col - tileSet.length}});
        //        }
        //    }
        //    return setsOnBoard;
        //}

        /**
         * gets the score for player's initial meld.
         * In initial meld, only sets contain no tiles that from opponents can be calculated,
         * and joker's score is 0.
         *
         * @param state
         * @param setsInBoard
         * @param tilesSentThisTurn
         * @returns {number}
         */
        function getInitialMeldScore(state: IState, setsInBoard: number[][], tilesSentThisTurn: number[]): number {
            var score = 0;
            for (var i = 0; i < setsInBoard.length; i++) {
                var tilesAllFromPlayer = true;
                var setScore = 0;
                for (var j = 0; j < setsInBoard[i].length; j++) {
                    var tileIndex = setsInBoard[i][j];
                    setScore += state["tile" + tileIndex].score;
                    if (tilesSentThisTurn.indexOf(tileIndex) === -1) {
                        // this tile is from opponent
                        tilesAllFromPlayer = false;
                        break;
                    }
                }
                // only add score of sets in which all tiles are from the player who is playing.
                if (tilesAllFromPlayer) {
                    score += setScore;
                }
            }
            return score;
        }

        /**
         * check whether game is over.
         *
         * @param state
         * @returns {boolean}
         */
        function isGameOver(state: IState): boolean {
            return getWinner(state.board, state.deltas) !== -1 || isTie(state);
        }

        /**
         * get index of winning player. returns -1 if no player wins.
         * After game is on, player with no tiles left in hand is the winner.
         *
         * @param board
         * @param deltas
         * @returns {number}
         */
        function getWinner(board: Board, deltas: IDelta[]): number {
            var hasLoser = false;
            var winner = -1;
            // check each player's hand
            for (var i = getGameBoardRows(); i < board.length; i++) {
                if (board[i].length === 0 && deltas.length === 0) {
                    winner = i;
                } else {
                    if (hasLoser === false) {
                        hasLoser = true;
                    }
                }
            }
            return hasLoser ? winner : -1;
        }

        /**
         * check if game is tied. Game is tied when tile pool is empty
         * or no player can make valid move any more.
         * @returns {boolean}
         */
        function isTie(state: IState): boolean {
            return state.trace.nexttile >= 106;
        }

        /**
         * return true if tileIndex is sent from player's hand to game board in current turn.
         * @param tileIndex
         * @param playerIndex
         * @param deltas
         * @returns {boolean}
         */
        function isTileSentToBoardInCurrentTurnByPlayer(tileIndex: number, playerIndex: number, deltas: IDelta[]): boolean {
            var playerRow = getPlayerRow(playerIndex);
            for (var i = 0 ; i < deltas.length; i++) {
                if (deltas[i].tileIndex === tileIndex &&
                    deltas[i].from.row === playerRow ) {
                    return true;
                }
            }
            return false;
        }

        /**
         * get the row in board that belongs to given player's hand
         * @param playerIndex
         * @returns {*}
         */
        function getPlayerRow(playerIndex: number) {
            return getGameBoardRows() + playerIndex;
        }

        function getGameBoardRows() {
            return CONFIG.GAME_BOARD_ROWS;
        }

        function getGameBoardCols() {
            return CONFIG.GAME_BOARD_COLS;
        }

        /**
         * get the array of tiles sent by player to board during current turn.
         *
         * @param deltas
         * @param playerRow
         * @returns {Array} [tileIndex] sent to board by current player in this turn
         */
        function getTilesSentToBoardThisTurn(deltas: IDelta[], playerRow: number): number[] {
            var result: number[] = [];
            var count = 0;
            for (var i = 0; i < deltas.length; i++) {
                var tileIndex = deltas[i].tileIndex;
                var from = deltas[i].from;
                var to = deltas[i].to;
                if (from.row === playerRow && to.row !== playerRow) {
                    count++;
                    result.push(tileIndex);
                } else if (from.row !== playerRow && to.row === playerRow) {
                    count--;
                    var index = result.indexOf(tileIndex);
                    result.splice(index, 1);
                }
            }
            check(result.length === count, "get tiles sent wrong");
            return result;
        }

        /**
         *
         * @param playerHand
         * @param state
         * @returns {Array}
         */
        function findAllSetInHand(playerHand: number[], state: IState) {
            //if (playerHand.length === 0) {
            //    return playerHand;
            //}
            // try to find all groups in hand
            var hand = angular.copy(playerHand);

            // 1. find all groups in hand
            var groups = findAllGroups(hand, state);
            var handAfter: number[] = [];
            for (var i = 0; i < groups.length; i++) {
                //console.log("group: " + groups[i]);
                // append all valid groups
                handAfter = handAfter.concat(groups[i]);
            }
            // 2. get the rest tiles in hand
            var restTiles: number[] = [];
            for (var ii = 0; ii < hand.length; ii++) {
                if (handAfter.indexOf(hand[ii]) === -1) {
                    restTiles.push(hand[ii]);
                }
            }

            // 3. find all runs from the rest tiles in hand
            var runs = findAllRuns(restTiles, state);
            for (var j = 0; j < runs.length; j++) {
                //console.log("run: " + runs[j]);
                handAfter = handAfter.concat(runs[j]);
            }
            for (var k = 0 ; k < restTiles.length; k++) {
                if (handAfter.indexOf(restTiles[k]) === -1) {
                    handAfter.push(restTiles[k]);
                }
            }
            return handAfter;
        }

        /**
         *
         * @param tiles
         * @param state
         * @returns {Array} each array is array of valid run [[1,2,3],[4,5,6]]
         */
        function findAllRuns(tiles: number[], state: IState) {
            if (tiles.length === 0) {
                return [];
            }
            tiles.sort(sortBy("color", state));
            var runs: number[][] = [];
            var fast = getTileColorByIndex(tiles[0], state);
            var sameColor: number[] = [];
            for (var i = 0; i < tiles.length; i++) {
                var tileIndex = tiles[i];
                var color = getTileColorByIndex(tileIndex, state);
                if (color === fast ) {
                    sameColor.push(tileIndex);
                }
                if (color !== fast || i === tiles.length - 1) {
                    var validRuns: number[][] = findRun(sameColor, state);
                    if (validRuns.length > 0) {
                        runs = runs.concat(validRuns);
                    }
                    fast = color;
                    sameColor = [tileIndex];
                }
            }
            return runs;
        }

        function findRun(runCandidate: number[], state: IState): number[][] {
            //console.log("same: " + runCandidate);
            var validRuns: number[][] = [];
            var scoreExpect = getTileScoreByIndex(runCandidate[0], state);
            var consecutive: number[] = [];
            for (var i = 0; i < runCandidate.length; i++) {
                var tileIndex = runCandidate[i];
                var score = getTileScoreByIndex(tileIndex, state);
                if (scoreExpect === score) {
                    consecutive.push(tileIndex);
                    scoreExpect += 1;
                } else {
                    if (consecutive.length >= 3) {
                        validRuns.push(consecutive);
                    }
                    consecutive = [tileIndex];
                    scoreExpect = score + 1;
                }
            }
            if (consecutive.length >= 3) {
                validRuns.push(consecutive);
            }
            return validRuns;
        }

        function findAllGroups(tiles: number[], state: IState): number[][] {
            tiles.sort(sortBy("score", state));
            var groups: number[][] = [];
            var fast = getTileScoreByIndex(tiles[0], state);
            var group: number[] = [];
            for (var i = 0; i < tiles.length; i++) {
                var tileIndex = tiles[i];
                var score = getTileScoreByIndex(tileIndex, state);
                if (score === fast) {
                    group.push(tileIndex);
                }
                if (score !== fast || i === tiles.length - 1) {
                    //meet new number and current group
                    var validGroups = findGroup(group,state);
                    if (validGroups.length > 0) {
                        groups = groups.concat(validGroups);
                    }
                    fast = score;
                    group = [tileIndex];
                }
            }
            return groups;
        }

        /**
         *
         * @param groupCandidate
         * @param state
         * @returns {Array}
         */
        function findGroup(groupCandidate: number[], state: IState) {
            var validGroups: number[][] = [];
            var colors: string[] = [];
            var group: number[] = [];
            for (var i = 0; i < groupCandidate.length; i++) {
                var tileIndex = groupCandidate[i];
                var color = getTileColorByIndex(tileIndex, state);
                if (colors.indexOf(color) === -1) {
                    // new color
                    colors.push(color);
                    group.push(tileIndex);
                }
            }
            if (group.length >= 3) {
                validGroups.push(group);
            }
            return validGroups;
        }

        function getTileScoreByIndex(tileIndex: number, state: IState) {
            check (state["tile" + tileIndex] !== undefined, "undefined tile: tile" + tileIndex);
            return state["tile" + tileIndex].score;
        }

        function getTileColorByIndex(tileIndex: number, state: IState) {
            check (state["tile" + tileIndex] !== undefined, "undefined tile: tile" + tileIndex);
            return state["tile" + tileIndex].color;
        }

        /**
         * usage:
         *   playerHand.sort(sortBy("score", $scope.state));
         *
         * @param type
         * @param state
         * @returns {Function}
         */
        function sortBy(type: string, state: IState) {
            return function (tileIndexA: number, tileIndexB: number) {
                var tileA = state["tile" + tileIndexA];
                var tileB =  state["tile" + tileIndexB];
                if (type === "score") {
                    return tileA.score - tileB.score;
                } else {
                    // sort by "color"
                    return (tileA.color > tileB.color) ? 1 : (tileA.color < tileB.color) ? -1 : (tileA.score - tileB.score);
                }
            };
        }

        /** *********************************
         * ======= Return functions ========
         ***********************************/
        return {
            isMoveOk: isMoveOk,
            createMove: createMove,
            getTileByIndex: getTileByIndex,
            getPossibleMoves: getPossibleMoves,
            findAllSetInHand: findAllSetInHand,
            sortBy: sortBy,
            getTilesSentToBoardThisTurn: getTilesSentToBoardThisTurn,

            createInitialMove: getInitialMove,
            createPickMove: getPickMove,
            createMeldMove: getMeldMove,
            createSingleUndoMove: getSingleUndoMove,
            createMoveMove: getMoveMove,
            createSortMove: getSortMove,
            createCombinedMove: getCombinedMove

        };

    }]);
}());
