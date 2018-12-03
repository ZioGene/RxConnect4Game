import { Component, OnInit } from '@angular/core';
import { webSocket } from 'rxjs/webSocket';
import { retryWhen, switchMap } from 'rxjs/operators';
import { timer } from 'rxjs';

@Component({
    selector: 'app-game',
    templateUrl: './game.component.html',
    styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit {
    cells: string[];
    supportMatrix: number[][];
    winner: string;
    turn: string;
    nTurn = 1;
    webSocket$;
    myColor: string;
    hoverCell: number;

    constructor() {
        this.myColor = sessionStorage.getItem('myColor');
    }

    ngOnInit() {
        this.cells = Array.from({length: 42}, () => '');
        this.supportMatrix = Array(6).fill(0).map(x => Array(7).fill(''));

        this.webSocket$ = webSocket('ws://' + window.location.hostname + ':8081');
        this.webSocket$
            .multiplex(
                () => {
                    return {type: 'connect', color: this.myColor};
                },
                () => ({type: 'disconnect'}),
                (_) => true
            )
            .pipe(
                retryWhen(switchMap(() => timer(1000))) // disconnect strategy
            )
            .subscribe((resp) => {
                    console.log(resp);
                    switch (resp.type) {
                        case 'info': {
                            this.myColor = resp.color;
                            sessionStorage.setItem('myColor', resp.color);
                            break;
                        }
                        case 'init': {
                            this.turn = resp.turn;
                            this.resetIntrnal();
                            break;
                        }
                        case 'move': {
                            console.log('move received: ', resp);
                            this.cells[resp.selected] = this.turn;
                            this.turn = resp.turn;
                            break;
                        }
                        case 'finish': {
                            this.winner = resp.result;
                            break;
                        }
                    }
                },
                (err) => console.error(err),
                () => console.warn('Completed!')
            );
    }

    newGame() {
        const result = window.confirm('Are you sure to start new match?');
        if (result) {
            this.resetIntrnal();
            this.webSocket$.next({type: 'finish', result: 'RESET'});
        }
    }

    private resetIntrnal() {
        this.cells = Array.from({length: 42}, () => '');
        this.supportMatrix = Array(6).fill(0).map(x => Array(7).fill(''));
        this.winner = '';
        this.nTurn = 1;
    }

    changeValue(col: number) {
        // check if my turn
        const index = this.beginHoverEffect(col);
        if (!this.winner && this.myColor === this.turn && this.cells[index].length === 0) {
            this.cells[index] = this.myColor;
            this.cells.forEach((row, i) => {
                this.checkVictory(i);
            });
            this.passTurn(index);
        }
    }


    passTurn(index: number) {
        this.nTurn++;
        if (this.nTurn > 42) {
            this.announceVictory('none');
        } else {
            this.webSocket$.next({type: 'move', turn: this.turn, selected: index});
        }
    }

    checkRow(index: number) {
        if (index % 7 <= 3) {
            if (this.cells[index] === 'red' &&
                this.cells[index + 1] === 'red' &&
                this.cells[index + 2] === 'red' &&
                this.cells[index + 3] === 'red'
            ) {
                console.log('checkRow: RED');
                return 'Red';
            } else if (
                this.cells[index] === 'yellow' &&
                this.cells[index + 1] === 'yellow' &&
                this.cells[index + 2] === 'yellow' &&
                this.cells[index + 3] === 'yellow'
            ) {
                console.log('checkRow: YELLOW');
                return 'Yellow';
            }
        }
    }

    checkCol(index) {
        if (index < 21) {
            if (
                this.cells[index] === 'red' &&
                this.cells[index + 7] === 'red' &&
                this.cells[index + 14] === 'red' &&
                this.cells[index + 21] === 'red'
            ) {
                console.log('checkCol: RED');
                return 'Red';
            } else if (
                this.cells[index] === 'yellow' &&
                this.cells[index + 7] === 'yellow' &&
                this.cells[index + 14] === 'yellow' &&
                this.cells[index + 21] === 'yellow'
            ) {
                console.log('checkCol: YELLOW');
                return 'Yellow';
            }
        }
    }

    checkLeftDiagonal(index) {
        if (index < 21 && index % 7 >= 2) {
            if (
                this.cells[index] === 'red' &&
                this.cells[index + 6] === 'red' &&
                this.cells[index + 12] === 'red' &&
                this.cells[index + 18] === 'red'
            ) {
                console.log('checkLeftDiagonal: RED');
                return 'Red';
            } else if (
                index === 'yellow' &&
                this.cells[index + 6] === 'yellow' &&
                this.cells[index + 12] === 'yellow' &&
                this.cells[index + 18] === 'yellow'
            ) {
                console.log('checkLeftDiagonal: YELLOW');
                return 'Yellow';
            }
        }
    }

    checkRightDiagonal(index) {
        if (index < 21 && index % 7 <= 3) {
            if (
                this.cells[index] === 'red' &&
                this.cells[index + 8] === 'red' &&
                this.cells[index + 16] === 'red' &&
                this.cells[index + 24] === 'red'
            ) {
                console.log('checkRightDiagonal: RED');
                return 'Red';
            } else if (
                this.cells[index] === 'yellow' &&
                this.cells[index + 8] === 'yellow' &&
                this.cells[index + 16] === 'yellow' &&
                this.cells[index + 24] === 'yellow'
            ) {
                console.log('checkRightDiagonal: YELLOW');
                return 'Yellow';
            }
        }
    }

    checkVictory(index) {
        if (  // check RED victory
            this.checkRow(index) === 'Red' ||
            this.checkCol(index) === 'Red' ||
            this.checkLeftDiagonal(index) === 'Red' ||
            this.checkRightDiagonal(index) === 'Red'
        ) {
            this.announceVictory('Red');
        } else if ( // check YELLOW victory
            this.checkRow(index) === 'Yellow' ||
            this.checkCol(index) === 'Yellow' ||
            this.checkLeftDiagonal(index) === 'Yellow' ||
            this.checkRightDiagonal(index) === 'Yellow'
        ) {
            this.announceVictory('Yellow');
        }
    }

    beginHoverEffect(col: number): number {
        let row = 5;
        while (
            this.cells[row * 7 + col] === 'red' ||
            this.cells[row * 7 + col] === 'yellow'
            ) {
            row--;
        }
        return row * 7 + col;
    }

    announceVictory(victor) {
        this.winner = victor;
        if (victor !== 'none') {
            this.webSocket$.next({type: 'finish', result: `${this.winner} WIN`});
        } else {  // victor === 'none'
            this.webSocket$.next({type: 'finish', result: 'TIE'});
        }
    }

}
