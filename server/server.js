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
    const subscription = new Subscription();
    console.log(`New Client ${clientId} CONNECTED!`);
    
    // client.send(JSON.stringify({sender: 'SERVER', clientId: clientId, type: 'INFO'}));

    client.on('disconnect', function () {
        if (players.red === client) {
            players.red = null
        } else if (players.yellow === client) {
            players.yellow = null
        }
        wss.clients.forEach(c => c.send(JSON.stringify({turn: 'abort'})));
        subscription.unsubscribe();
    });

    client.on('error', (error) => {
        console.log(`client ${clientId} color ${player} ERROR`);
        console.error(error);
        subscription.unsubscribe();
    });

    client.on('message', function (msg) {
        let message;
        console.log(`client ${clientId} -> ${msg}`);
        try {
            message = JSON.parse(msg);
        } catch (err) {
            console.error(`ERROR: client ${clientId} - unable to parse message "${msg}"`);
        }
        switch (message.type) {
            case 'connect': {
                if (players.red == null) {
                    players.red = client;
                    client.send(JSON.stringify({type: 'info', color: 'red'}));
                } else if (players.yellow == null) {
                    players.yellow = client;
                    client.send(JSON.stringify({type: 'info', color: 'yellow'}));
                    wss.clients.forEach(c => c.send(JSON.stringify({type: 'init', turn: 'red'})));
                } else {
                    subscription.unsubscribe();
                    client.unsubscribe();
                }
                break;
            }
            case 'disconnect': {
                players[message.color] = null;
                wss.clients.forEach(c => c.send({turn: 'abort'}));
                break;
            }
            case 'move': {
                if (message.turn === "yellow") {
                    console.log('MOVE send to player YELLOW');
                    //players.yellow.send(JSON.stringify(message)); 
                    wss.clients.forEach(c => c.send(JSON.stringify(message)));
                } else {
                    console.log('MOVE send to player RED');
                    players.red.send(JSON.stringify(message));    
                }
                break;
            }
        }
    });
});

//function reset() {
//    board = Array(6).fill(0).map(x => Array(8).fill('white'));
//    players.red = null;
//    players.yellow = null;
//    turnPlayer = 'red';
//}

//function checkVictory(i, j) {
//    const c = board[i][j];
//
//    // Check horizontally
//    let count = 0;
//    // count to the left
//    for (let k = 1; k < 4; ++k) {
//        if (j - k < 0) {
//            break;
//        }
//        if (board[i][j - k] !== c) {
//            break;
//        }
//        count++;
//    }
//    // count to the right
//    for (let k = 1; k < 4; ++k) {
//        if (j + k > 7) {
//            break;
//        }
//        if (board[i][j + k] !== c) {
//            break;
//        }
//        count++;
//    }
//
//    if (count > 2) {
//        return true;
//    }
//
//    // Check vertically
//    count = 0;
//    // count up
//    for (let k = 1; k < 4; ++k) {
//        if (i - k < 0) {
//            break;
//        }
//        if (board[i - k][j] !== c) {
//            break;
//        }
//        count++;
//    }
//    // count down
//    for (let k = 1; k < 4; ++k) {
//        if (i + k > 5) {
//            break;
//        }
//        if (board[i + k][j] !== c) {
//            break;
//        }
//        count++;
//    }
//
//    if (count > 2) {
//        return true;
//    }
//
//    // Check diagonal top-left -> bottom-right
//    count = 0;
//    // count to top-left
//    for (let k = 1; k < 4; ++k) {
//        if (i - k < 0 || j - k < 0) {
//            break;
//        }
//        if (board[i - k][j - k] !== c) {
//            break;
//        }
//        count++;
//    }
//    // count to bottom-right
//    for (let k = 1; k < 4; ++k) {
//        if (i + k > 5 || j + k > 7) {
//            break;
//        }
//        if (board[i + k][j + k] !== c) {
//            break;
//        }
//        count++;
//    }
//
//    if (count > 2) {
//        return true;
//    }
//
//    // Check diagonal bottom-left -> top-right
//    count = 0;
//    // count to bottom-left
//    for (let k = 1; k < 4; ++k) {
//        if (i + k > 5 || j - k < 0) {
//            break;
//        }
//        if (board[i + k][j - k] !== c) {
//            break;
//        }
//        count++;
//    }
//    // count to top-right
//    for (let k = 1; k < 4; ++k) {
//        if (i - k < 0 || j + k > 7) {
//            break;
//        }
//        if (board[i - k][j + k] !== c) {
//            break;
//        }
//        count++;
//    }
//
//    return count > 2;
//}

//reset();
server.listen(PORT, () => console.log(`server listening on port ${PORT}`));
server.on('request', app);