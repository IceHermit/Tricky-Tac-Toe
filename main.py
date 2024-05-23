from flask import Flask, render_template, request, jsonify
import random

DEPTH = 6 # Todo: make this adjustable from 2 to 7

WIN_STATES = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],  # Horizontal
        [0, 3, 6], [1, 4, 7], [2, 5, 8],  # Vertical
        [0, 4, 8], [2, 4, 6]              # Diagonal
    ]

app = Flask(__name__)

@app.route('/')
def hello():
    return render_template('index.html')


@app.route('/get_gamestate', methods=["GET"])
def get_gamestate():

    # get arguments
    gamestate = request.args.get('gamestate').split(',')
    replacements = request.args.get('replacements').split(',')
    oTurn = request.args.get('oturn') == "true"

    gamestate = [int(i) for i in gamestate]
    replacements = [int(i) for i in replacements]

    # ----------------
    # this function will either return a single integer (drawn position or game still going on)
    # or a tuple when the game is won by either player (tuple containing the winner and the tiles for colouring)
    state = has_won(gamestate, replacements, oTurn)  

    if isinstance(state, int): # the game is in progress
        evaluation, best_move = evaluate_position(gamestate, replacements, oTurn, DEPTH)
        return jsonify({'state': state, 'eval': evaluation, 'best_move': best_move})
    else: # the game is joeover
        return jsonify({'state': state[0], 'tiles': state[1], 'eval': state[0], 'best_move': -1})


def has_won(board, replacements = [0, 0], oTurn = True):

    # +1 -> O won
    # -1 -> X won
    # 00 -> tie
    # 69 -> game still on
        
    for combination in WIN_STATES: # check for win conditions
        if board[combination[0]] == board[combination[1]] == board[combination[2]] != 0:
            return (board[combination[0]], combination)  # Return the winner and the winning tiles
        
    # no empty spaces left on the board
    if 0 not in board:
        if (oTurn and replacements[0]) or (not oTurn and replacements[1]): # check if replacement moves are remaining
            return 69 # they are => game still going on
        return 0 # they are not => drawn game
    
    return 69 # game still going on (empty spaces are still there)


# function only called if game is still in progress (check get_gamestate())
def evaluate_position(board, replacements = [0, 0], oTurn = True, depth = 0):

    if depth == 0: # recursion termination
        return predict_evaluation(board, replacements, oTurn), -1

    state = has_won(board, replacements, oTurn)  

    if not isinstance(state, int):
        return (state[0] * depth), -1 # position given is either won or drawn
        # we multiply by depth here to ensure that the algo tries to delay the loss for as long as possible
        # higher depth => the move is in the nearer future => more valuable move => more priority
    
    future_evals = [] # stores the results of all the recursions
    max_moves = []; min_moves = [] # for returning the best/worst move in the position

    for (i, cell) in enumerate(board):
        
        future_eval = None # stores the result of recursions
        
        if cell == 0:
            future_board = board.copy()
            future_board[i] = 1 if oTurn else -1
            future_eval, _ = evaluate_position(future_board, replacements, not oTurn, depth - 1)

        if (oTurn and replacements[0]) and cell == -1: # can replace Xs
            future_board = board.copy()
            future_board[i] = 1
            future_replacements = replacements.copy()
            future_replacements[0] -= 1
            future_eval, _ = evaluate_position(future_board, future_replacements, not oTurn, depth - 1)
        
        if (not oTurn and replacements[1]) and cell == 1: # can replace Os
            future_board = board.copy()
            future_board[i] = -1
            future_replacements = replacements.copy()
            future_replacements[1] -= 1
            future_eval, _ = evaluate_position(future_board, future_replacements, not oTurn, depth - 1)


        if (future_eval == None):
            continue # no move possible on this cell

        if len(future_evals) > 0:
                if future_eval > max(future_evals):
                    max_moves = [i] # reset the list
                elif future_eval == max(future_evals):
                    max_moves.append(i)
                 
                if future_eval < min(future_evals):
                    min_moves = [i] # reset the list
                elif future_eval == min(future_evals):
                    min_moves.append(i)
        else:
                min_moves.append(i)
                max_moves.append(i)
                    
        future_evals.append(future_eval)

    if not len(future_evals):
        return 0, -1

    if oTurn:
        return max(future_evals), (random.choice(max_moves) + 1) # js code numbers tiles 1-9
    else:
        return min(future_evals), (random.choice(min_moves) + 1) # => +1 prevent a one-off error


# almost never necessary on higher depths
def predict_evaluation(board, replacements = [0, 0], oTurn = True):

    state = has_won(board, replacements, oTurn)  

    if not isinstance(state, int):
        return state[0] # position given is either won or drawn

    spots_difference = board.count(1) - board.count(-1) + (0 if oTurn else -1)
    
    eval = min(spots_difference / 3, 1)
    eval = max(eval, -1) # clamping the range of eval

    return round(eval, 2)


if __name__ == '__main__':
    app.run(debug=True, port=8000)