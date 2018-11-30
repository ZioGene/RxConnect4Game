const server = require('http').createServer();
const express = require('express');
const path = require('path');
const WebSocketServer = require('ws').Server;
const {Subscription} = require('rxjs');
const cors = require('cors');

const app = express();
const PORT = 8081;

const wss = new WebSocketServer({server});

app.use(cors());
let cid = 0;
let board = null;
const players = {red: null, yellow: null};
let turnPlayer = 'red';

wss.on('connection', function (client) {
    const clientId = cid++;
    let player = 'red';
    const subscription = new Subscription();
    console.log(`New Client ${clientId} CONNECTED!`);

    client.on('disconnect', function () {
        if (players.red === client) {
            players.red = null
        } else if (players.yellow === client) {
            players.yellow = null
        }
        wss.clients.forEach(c => c.send({turn: 'abort'}));
        subscription.unsubscribe();
    });

    client.on('error', (error) => {
        console.log(`client ${clientId} color ${player} ERROR`);
        console.error(error);
        subscription.unsubscribe();
    });

    client.on('message', function (msg) {
        let message;
        console.log(`client ${clientId}: color ${player} -> ${msg}`);
        try {
            message = JSON.parse(msg);
        } catch (err) {
            console.error(`ERROR: client ${clientId} - unable to parse message "${msg}"`);
        }
        switch (message.type) {
            case 'connect': {
                if (players.red == null) {
                    players.red = client;
                    client.send(JSON.stringify({color: 'red'}));
                } else if (players.yellow == null) {
                    players.yellow = client;
                    player = 'yellow';
                    client.send(JSON.stringify({color: 'yellow'}));
                    wss.clients.forEach(c => c.send({turn: 'red'}));
                } else {
                    subscription.unsubscribe();
                    client.unsubscribe();
                }
                wss.clients.forEach(c => c.send(JSON.stringify({board: board})));
                break;
            }
            case 'disconnect': {
                players[message.color] = null;
                wss.clients.forEach(c => c.send({turn: 'abort'}));
                break;
            }
            case 'move': {
                // Ignore players clicking when it's not their turn
                if (message.color !== turnPlayer) {
                    console.log(`move from wrong player color: ${player} -> now is turn of player color: ${turnPlayer}`);
                    return;
                }
                // Ignore clicks on full columns
                if (board[0][message.col] !== 'white') {
                    console.warn('move is not allowed, column is already full!');
                    return;
                }
                // Ignore clicks before both players are connected
                if ((players.red == null) || (players.yellow == null)) {
                    console.warn('Start move before all players are connected!');
                    return;
                }
                // find first open spot in the message
                let row = -1;
                for (row = 5; row >= 0; --row) {
                    if (board[row][message.col] === 'white') {
                        board[row][message.col] = player;
                        break;
                    }
                }

                wss.clients.forEach(c => c.send(JSON.stringify({board: board})));

                // Check victory (only current player can win)
                if (checkVictory(row, message.col)) {
                    wss.clients.forEach(c => c.send(JSON.stringify({victory: player})));
                    // Disconnect players
                    players.red.unsubscribe();
                    players.yellow.unsubscribe();
                    reset();
                    return;
                }

                // Toggle the player
                turnPlayer = player === 'red' ? 'yellow' : 'red';
                wss.clients.forEach(c => c.send(JSON.stringify({turn: turnPlayer})));
                break;
            }
        }
    });
});

function reset() {
    board = Array(6).fill(0).map(x => Array(8).fill('white'));
    players.red = null;
    players.yellow = null;
    turnPlayer = 'red';
}

function checkVictory(i, j) {
    const c = board[i][j];

    // Check horizontally
    let count = 0;
    // count to the left
    for (let k = 1; k < 4; ++k) {
        if (j - k < 0) {
            break;
        }
        if (board[i][j - k] !== c) {
            break;
        }
        count++;
    }
    // count to the right
    for (let k = 1; k < 4; ++k) {
        if (j + k > 7) {
            break;
        }
        if (board[i][j + k] !== c) {
            break;
        }
        count++;
    }

    if (count > 2) {
        return true;
    }

    // Check vertically
    count = 0;
    // count up
    for (let k = 1; k < 4; ++k) {
        if (i - k < 0) {
            break;
        }
        if (board[i - k][j] !== c) {
            break;
        }
        count++;
    }
    // count down
    for (let k = 1; k < 4; ++k) {
        if (i + k > 5) {
            break;
        }
        if (board[i + k][j] !== c) {
            break;
        }
        count++;
    }

    if (count > 2) {
        return true;
    }

    // Check diagonal top-left -> bottom-right
    count = 0;
    // count to top-left
    for (let k = 1; k < 4; ++k) {
        if (i - k < 0 || j - k < 0) {
            break;
        }
        if (board[i - k][j - k] !== c) {
            break;
        }
        count++;
    }
    // count to bottom-right
    for (let k = 1; k < 4; ++k) {
        if (i + k > 5 || j + k > 7) {
            break;
        }
        if (board[i + k][j + k] !== c) {
            break;
        }
        count++;
    }

    if (count > 2) {
        return true;
    }

    // Check diagonal bottom-left -> top-right
    count = 0;
    // count to bottom-left
    for (let k = 1; k < 4; ++k) {
        if (i + k > 5 || j - k < 0) {
            break;
        }
        if (board[i + k][j - k] !== c) {
            break;
        }
        count++;
    }
    // count to top-right
    for (let k = 1; k < 4; ++k) {
        if (i - k < 0 || j + k > 7) {
            break;
        }
        if (board[i - k][j + k] !== c) {
            break;
        }
        count++;
    }

    return count > 2;
}

reset();
server.listen(PORT, () => console.log(`server listening on port ${PORT}`));
server.on('request', app);