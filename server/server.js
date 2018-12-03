const server = require('http').createServer();
const express = require('express');
const path = require('path');
const WebSocketServer = require('ws').Server;
const {Subscription} = require('rxjs');
const cors = require('cors');
const ip = require("ip");

const app = express();

const PORT = 8081;
const wss = new WebSocketServer({server});

app.use(cors());
let cid = 0;
let cells = null;
const players = {red: null, yellow: null};
let turnPlayer = 'red';
let nTurn = 1;

console.log('Your IP address is: ');
console.dir(ip.address());

wss.on('connection', function (client) {
    const clientId = cid++;
    const subscription = new Subscription();
    console.log(`New Client ${clientId} CONNECTED!`);

    // client.send(JSON.stringify({sender: 'SERVER', clientId: clientId, type: 'INFO'}));

    client.on('close', () => {
        if (players.red === client) {
            console.log(`client ${clientId} player RED -> DISCONNECT`);
            players.red = null;
        } else if (players.yellow === client) {
            players.yellow = null;
            console.log(`client ${clientId} player YELLOW -> DISCONNECT`);
        }
        wss.clients.forEach(c => c.send(JSON.stringify({type: 'abort', cells: cells})));
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
                if (message.myColor) {
                    players[message.myColor] = client;
                    client.send(JSON.stringify({type: 'info', color: message.myColor}));
                } else {
                    if (players.red == null) {
                        players.red = client;
                        client.send(JSON.stringify({type: 'info', color: 'red'}));
                    } else if (players.yellow == null) {
                        players.yellow = client;
                        client.send(JSON.stringify({type: 'info', color: 'yellow'}));
                        console.log('turn: ' + turnPlayer);
                        wss.clients.forEach(c => c.send(JSON.stringify({type: 'init', turn: turnPlayer, cells: cells})));
                    } else {
                        subscription.unsubscribe();
                    }
                }
                break;
            }
            case 'disconnect': {
                players[message.myColor] = null;
                wss.clients.forEach(c => c.send({turn: 'abort'}));
                break;
            }
            case 'move': {
                nTurn++;
                cells[message.selected] = message.turn;
                if (nTurn > 42) {
                    announceVictory('none');
                } else {
                    cells.forEach((_, i) => {
                        checkVictory(i);
                    });
                }
                console.log(`MOVE received from player ${message.turn}: ${message.selected}`);
                // switching turn
                message.cells = cells;
                message.turn = message.turn === 'red' ? 'yellow' : 'red';
                wss.clients.forEach(c => c.send(JSON.stringify(message)));
                break;
            }
            case 'finish': {
                console.log(`match finish with result: ${message.result}`);
                if (message.result === 'RESET') {
                    reset();
                    wss.clients.forEach(c => c.send(JSON.stringify({type: 'init', turn: turnPlayer, cells: cells})));
                }
                break;
            }
        }
    });
});

function reset() {
    cells = Array.from({length: 42}, () => '');
    players.red = null;
    players.yellow = null;
    const r = Math.floor(Math.random() * (1 + 1)); // restituisce un numero random tra 0 e 1 inclusi
    turnPlayer = r === 1 ? 'red' : 'yellow';
    nTurn = 1;
}

function checkRow(index) {
    if (index % 7 <= 3) {
        if (cells[index] === 'red' &&
            cells[index + 1] === 'red' &&
            cells[index + 2] === 'red' &&
            cells[index + 3] === 'red'
        ) {
            console.log('checkRow: RED');
            return 'Red';
        } else if (
            cells[index] === 'yellow' &&
            cells[index + 1] === 'yellow' &&
            cells[index + 2] === 'yellow' &&
            cells[index + 3] === 'yellow'
        ) {
            console.log('checkRow: YELLOW');
            return 'Yellow';
        }
    }
}

function checkCol(index) {
    if (index < 21) {
        if (
            cells[index] === 'red' &&
            cells[index + 7] === 'red' &&
            cells[index + 14] === 'red' &&
            cells[index + 21] === 'red'
        ) {
            console.log('checkCol: RED');
            return 'Red';
        } else if (
            cells[index] === 'yellow' &&
            cells[index + 7] === 'yellow' &&
            cells[index + 14] === 'yellow' &&
            cells[index + 21] === 'yellow'
        ) {
            console.log('checkCol: YELLOW');
            return 'Yellow';
        }
    }
}

function checkLeftDiagonal(index) {
    if (index < 21 && index % 7 >= 2) {
        if (
            cells[index] === 'red' &&
            cells[index + 6] === 'red' &&
            cells[index + 12] === 'red' &&
            cells[index + 18] === 'red'
        ) {
            console.log('checkLeftDiagonal: RED');
            return 'Red';
        } else if (
            index === 'yellow' &&
            cells[index + 6] === 'yellow' &&
            cells[index + 12] === 'yellow' &&
            cells[index + 18] === 'yellow'
        ) {
            console.log('checkLeftDiagonal: YELLOW');
            return 'Yellow';
        }
    }
}

function checkRightDiagonal(index) {
    if (index < 21 && index % 7 <= 3) {
        if (
            cells[index] === 'red' &&
            cells[index + 8] === 'red' &&
            cells[index + 16] === 'red' &&
            cells[index + 24] === 'red'
        ) {
            console.log('checkRightDiagonal: RED');
            return 'Red';
        } else if (
            cells[index] === 'yellow' &&
            cells[index + 8] === 'yellow' &&
            cells[index + 16] === 'yellow' &&
            cells[index + 24] === 'yellow'
        ) {
            console.log('checkRightDiagonal: YELLOW');
            return 'Yellow';
        }
    }
}

function checkVictory(index) {
    if (  // check RED victory
        checkRow(index) === 'Red' ||
        checkCol(index) === 'Red' ||
        checkLeftDiagonal(index) === 'Red' ||
        checkRightDiagonal(index) === 'Red'
    ) {
        announceVictory('Red');
    } else if ( // check YELLOW victory
        checkRow(index) === 'Yellow' ||
        checkCol(index) === 'Yellow' ||
        checkLeftDiagonal(index) === 'Yellow' ||
        checkRightDiagonal(index) === 'Yellow'
    ) {
        announceVictory('Yellow');
    }
}

function announceVictory(victor) {
    if (victor !== 'none') {
        wss.clients.forEach(c => c.send(JSON.stringify({type: 'finish', result: `${victor} WIN`})));
    } else {  // victor === 'none'
        wss.clients.forEach(c => c.send(JSON.stringify({type: 'finish', result: 'TIE'})));
    }
}

reset();
server.listen(PORT, () => console.log(`server listening on port ${PORT}`));
server.on('request', app);