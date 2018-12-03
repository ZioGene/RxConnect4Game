import { Component, OnInit } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { retryWhen, switchMap } from 'rxjs/operators';
import { timer } from 'rxjs';


@Component({
    selector: 'app-game',
    templateUrl: './game.component.html',
    styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit {
    supportMatrix: number[][] = Array(6).fill(0).map(x => Array(7).fill(''));

    cells: string[];
    winner: string;
    turn: string;
    webSocket$: WebSocketSubject<any>;
    myColor: string;
    hoverCell: number;

    constructor() {
        this.myColor = sessionStorage.getItem('myColor');
    }

    ngOnInit() {
        this.cells = Array.from({length: 42}, () => '');
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
                            this.resetIntrnal();
                            this.turn = resp.turn;
                            this.cells = resp.cells;
                            break;
                        }
                        case 'move': {
                            console.log('move received: ', resp);
                            this.cells = resp.cells;
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
        this.winner = '';
    }

    changeValue(col: number) {
        // check if my turn
        const index = this.beginHoverEffect(col);
        if (!this.winner && this.myColor === this.turn && this.cells[index].length === 0) {
            this.passTurn(index);
        }
    }


    passTurn(index: number) {
        this.webSocket$.next({type: 'move', turn: this.turn, selected: index});
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
}
