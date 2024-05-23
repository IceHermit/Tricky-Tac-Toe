// --------------
let OTurn = true;
let GameState = [0, 0, 0, 0, 0, 0, 0, 0, 0];
let GameStateHistory = [];

let OReplacements = 2;
let XReplacements = 2;
let ReplacementHistory = [];
let is_game_over = false;

let eval = 0;

let againstComp = false;
let playerTurn = true;  // For Player Vs Comp

let DEPTH = 6; // Todo: make this adjustable
// --------------


function start_new(Computer) {

    GameStateHistory = [];
    ReplacementHistory = [];
    GameState = [0, 0, 0, 0, 0, 0, 0, 0, 0];

    OReplacements = 2;
    XReplacements = 2;

    is_game_over = false;
    OTurn = true;

    eval = 0;

    playerTurn = true;
    againstComp = Computer;

    let label = document.getElementById("playing_against_label")
    if (againstComp)
        label.innerHTML = "Playing against Computer";
    else
        label.innerHTML = "Playing against a Player";

    update_UI();
}


function play_turn(cell, playedByComp = false) {

    //console.log(cell, playedByComp, againstComp);

    if (is_game_over) return;

    if (againstComp) {
        if (!playerTurn & !playedByComp) return;  // make sure that the player cant play on computer's turn


        playerTurn = playedByComp;
    }

    let prevReplacements = [OReplacements, XReplacements]; // temporary variable

    if (GameState[cell - 1] == (OTurn ? 1 : -1)) return; // do not replace your own cell

    else if (GameState[cell - 1] != 0) // attempting to replace an enemy cell
        if (OTurn) {
            if (OReplacements <= 0) return;
            OReplacements -= 1;
        }
        else {
            if (XReplacements <= 0) return;
            XReplacements -= 1;
        }

    // --------------

    GameStateHistory.push(GameState.slice());
    ReplacementHistory.push(prevReplacements.slice());

    GameState[cell - 1] = OTurn ? 1 : -1;

    OTurn = !OTurn;

    // check if someone has won 
    fetch('/get_gamestate?gamestate=' + encodeURIComponent(GameState) + '&replacements=' + encodeURIComponent([OReplacements, XReplacements]) + '&oturn=' + encodeURIComponent(OTurn))
        .then(response => response.json())
        .then(data => {
            eval = data.eval;
            //console.log(data);
            if (data.state != 69) is_game_over = true;
            update_UI();
            if (is_game_over) game_over(data.state, data.tiles);
            
            let best_move = parseInt(data.best_move);
            if (againstComp & !playedByComp) play_turn(best_move, true); // last move was not played by the computer => computer's turn
        });
}


function undo(second_undo = false) {

    if (GameStateHistory.length == 0) return;

    GameState = GameStateHistory.pop();
    let replacements = ReplacementHistory.pop();
    OReplacements = replacements[0];
    XReplacements = replacements[1];

    OTurn = !OTurn;

    is_game_over = false;

    if (againstComp & !second_undo) undo(true);  // always undo twice if we are playing against a computer

    // re-evaluate the position
    fetch('/get_gamestate?gamestate=' + encodeURIComponent(GameState) + '&replacements=' + encodeURIComponent([OReplacements, XReplacements]) + '&oturn=' + encodeURIComponent(OTurn))
        .then(response => response.json())
        .then(data => {
            eval = data.eval;
            if (data.state != 69) is_game_over = true;
            update_UI();
            if (is_game_over) game_over(data.state, data.tiles);
        });
}


function update_UI() {

    document.getElementById("turn_indicator_O").className = OTurn ? "Turn_indicator_O" : "Turn_indicator_disabled";
    document.getElementById("turn_indicator_X").className = (!OTurn) ? "Turn_indicator_X" : "Turn_indicator_disabled";

    document.getElementById("o_replacements").textContent = OReplacements;
    document.getElementById("x_replacements").textContent = XReplacements;

    document.getElementById("undo").disabled = (GameStateHistory.length == 0);

    let label_text = ((eval > 0) ? "+" : "") + eval;

    if (eval >= 1) label_text = "+M" + (DEPTH - eval);
    else if (eval <= -1) label_text = "-M" + (DEPTH + eval);

    if (is_game_over) label_text = (eval == 0) ? "-" : ((eval > 0) ? "O" : "X");

    let _eval = eval;
    if (_eval <= -1) _eval = -1;
    else if (_eval >= 1) _eval = 1;

    if (document.getElementsByName("hide_eval")[0].checked) {
        _eval = 0;
        label_text = "-";   
    }

    document.getElementById("eval_label").textContent = label_text;

    _eval += 1;
    _eval *= 128;
    _eval = parseInt(_eval);

    document.getElementById("eval_red").style = "height: " + (256 - _eval) + "px";

    for (let i = 0; i < 9; i++) {
        let state = GameState[i];
        cell = document.getElementById("cell_" + (i + 1));
        cell.textContent = (state === 1) ? "O" : ((state === -1) ? "X" : "");
        cell.style = (state == 1) ? "color: dodgerblue" : "color: tomato";
    }
}

// winner -> tells who won: O or X
// tiles -> tells which tiles to colour as the winning tiles
function game_over(winner, tiles) {

    // colouring the tiles
    switch (winner) {
        case 1:
            for (let i = 0; i < tiles.length; i++) {
                let cell = document.getElementById("cell_" + (tiles[i] + 1));
                cell.style = "background-color: dodgerblue";
            }
            break
        case -1:
            for (let i = 0; i < tiles.length; i++) {
                let cell = document.getElementById("cell_" + (tiles[i] + 1));
                cell.style = "background-color: tomato";
            }
            break
        case 0:
            for (let i = 1; i <= 9; i++) {
                let cell = document.getElementById("cell_" + i);
                cell.style = "background-color: rgb(119, 119, 119)";
            }
            break
    }
}
