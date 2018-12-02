import { Component, OnInit } from '@angular/core';
import { webSocket } from 'rxjs/webSocket';
import { switchMap, retryWhen } from 'rxjs/operators';
import { fromEvent, timer, merge } from 'rxjs';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit {
  cells;
  newGameBtn;
  winner;
  turn; 
  nTurn = 1;
  webSocket$;
  color;
  finish = false;
  elementID: string;

  constructor() { }

  ngOnInit() {
    this.cells = Array.from(document.querySelectorAll(".cell"));
    this.newGameBtn = document.querySelector("button");
    this.winner = document.querySelector("#winner");

    // this.newGameBtn.addEventListener("click", newGame);

    this.webSocket$ = webSocket('ws://' + window.location.hostname + ':8081');
    this.webSocket$
      .multiplex(
        () => {
          return { type: 'connect' };
        },
        () => ({ type: 'disconnect' }),
        (_) => true
      )
      .pipe(
        retryWhen(switchMap(() => timer(1000))) // disconnect strategy
      )
      .subscribe((resp) => {
        console.log(resp);
        switch (resp.type) {
          case 'info': {
            this.color = resp.color;
            const element = document.querySelector(".mycolor");
            element.classList.add(this.color);
            break;
          }
          case 'init': {
            this.turn = resp.turn;
            const element = document.querySelector(".color-turn");
            element.classList.remove('red');
            element.classList.remove('yellow');
            element.classList.add(this.turn);
            break;
          }
          case 'move': {
            console.log('move received: ', resp);
            this.turn = resp.turn;
            const element = document.querySelector(".color-turn");
            element.classList.remove('red');
            element.classList.remove('yellow');
            element.classList.add(this.turn);
            // update tabella prendendo "selected" da resp
            const element2 = document.getElementById(resp.selected)
            if (!element2.classList.contains(this.turn === 'red' ? 'yellow' : 'red')) {
              element2.classList.add(this.turn === 'red' ? 'yellow' : 'red');
            }
            break;
          }
        }
      },
        (err) => console.error(err),
        () => console.warn('Completed!')
      );
  }

  // sendMessage(content, sender, isBroadcast, turn) {
  //   if (content && content.length > 0) {
  //     const message = {
  //       type: 'message',
  //       content: { content: content },
  //       from: '',
  //       turn: ''
  //     };
  //     // serverMessages.push(message);
  //     console.log('sendMessage: ', JSON.stringify(message));
  //     this.webSocket$.next(message);
  //   }
  // }

  newGame() {
    this.cells.forEach(cell => {
      cell.classList.remove("red");
      cell.classList.remove("yellow");
    });
    this.winner.textContent = "";
    this.winner.style.color = "black";
    this.turn = 1;
  }

  stopHoverEffect() {
    for (let cell of this.cells) {
      cell.classList.remove("hover-red");
      cell.classList.remove("hover-yellow");
    }
  }

  changeValue(event) {
    // this.elementID = event.target.id;
    // console.log(this.elementID);
    // check if my turn
    if (this.color === this.turn) {
      let row = 5;
      const col = this.cells.indexOf(event.target) % 7;
      while (
        this.cells[row * 7 + col].classList.contains("red") ||
        this.cells[row * 7 + col].classList.contains("yellow")
      ) {
        row--;
      }
      this.cells[row * 7 + col].classList.add(this.color);
      this.elementID = this.cells[row * 7 + col].id;
      console.log(this.elementID);
      for (let check of this.cells) {
        // this.checkRedVictory(check);
        // this.checkYellowVictory(check);
        this.checkVictory(check);
      }
      if (!this.finish) {
        this.passTurn();
      }
    }
  }


  beginHoverEffect(event) {
    let row = 5;
    const col = this.cells.indexOf(event.target) % 7;
    while (
      this.cells[row * 7 + col].classList.contains("red") ||
      this.cells[row * 7 + col].classList.contains("yellow")
    ) {
      row--;
    }
    this.cells[row * 7 + col].classList.add("hover-" + this.color);
  }


  passTurn() {
    this.nTurn++;
    if (this.nTurn > 42) {
      this.announceVictory("None");
    } else {
      const nextTurn = this.turn === 'red' ? 'yellow' : 'red';
      this.turn = nextTurn;
      console.log('passTurn to: ', nextTurn);
      const element = document.querySelector(".color-turn");
            element.classList.remove('red');
            element.classList.remove('yellow');
            element.classList.add(this.turn);
      this.webSocket$.next({ type: 'move', turn: nextTurn, selected: this.elementID });
    }
  }

  checkRow(element) {
    const index = this.cells.indexOf(element);
    if (index % 7 < 3) {
      if (
        element.classList.contains("red") &&
        this.cells[index + 1].classList.contains("red") &&
        this.cells[index + 2].classList.contains("red") &&
        this.cells[index + 3].classList.contains("red")
      ) {
        console.log('checkRow: RED');
        return "Red";
      } else if (
        element.classList.contains("yellow") &&
        this.cells[index + 1].classList.contains("yellow") &&
        this.cells[index + 2].classList.contains("yellow") &&
        this.cells[index + 3].classList.contains("yellow")
      ) {
        console.log('checkRow: YELLOW');
        return "Yellow";
      }
    }
  }

  checkCol(element) {
    const index = this.cells.indexOf(element);
    if (index < 21) {
      if (
        element.classList.contains("red") &&
        this.cells[index + 7].classList.contains("red") &&
        this.cells[index + 14].classList.contains("red") &&
        this.cells[index + 21].classList.contains("red")
      ) {
        console.log('checkCol: RED');
        return "Red";
      } else if (
        element.classList.contains("yellow") &&
        this.cells[index + 7].classList.contains("yellow") &&
        this.cells[index + 14].classList.contains("yellow") &&
        this.cells[index + 21].classList.contains("yellow")
      ) {
        console.log('checkCol: YELLOW');
        return "Yellow";
      }
    }
  }

  checkLeftDiagonal(element) {
    const index = this.cells.indexOf(element);
    if (index < 21 && index % 7 > 2) {
      if (
        element.classList.contains("red") &&
        this.cells[index + 6].classList.contains("red") &&
        this.cells[index + 12].classList.contains("red") &&
        this.cells[index + 18].classList.contains("red")
      ) {
        console.log('checkLeftDiagonal: RED');
        return "Red";
      } else if (
        element.classList.contains("yellow") &&
        this.cells[index + 6].classList.contains("yellow") &&
        this.cells[index + 12].classList.contains("yellow") &&
        this.cells[index + 18].classList.contains("yellow")
      ) {
        console.log('checkLeftDiagonal: YELLOW');
        return "Yellow";
      }
    }
  }

  checkRightDiagonal(element) {
    const index = this.cells.indexOf(element);
    if (index < 21 && index % 7 < 3) {
      if (
        element.classList.contains("red") &&
        this.cells[index + 8].classList.contains("red") &&
        this.cells[index + 16].classList.contains("red") &&
        this.cells[index + 24].classList.contains("red")
      ) {
        console.log('checkRightDiagonal: RED');
        return "Red";
      } else if (
        element.classList.contains("yellow") &&
        this.cells[index + 8].classList.contains("yellow") &&
        this.cells[index + 16].classList.contains("yellow") &&
        this.cells[index + 24].classList.contains("yellow")
      ) {
        console.log('checkRightDiagonal: YELLOW');
        return "Yellow";
      }
    }
  }

  // checkRedVictory(element) {
  //   if (
  //     this.checkRow(element) === "Red" ||
  //     this.checkCol(element) === "Red" ||
  //     this.checkLeftDiagonal(element) === "Red" ||
  //     this.checkRightDiagonal(element) === "Red"
  //   ) {
  //     this.announceVictory("Red");
  //   }
  // }

  // checkYellowVictory(element) {
  //   if (
  //     this.checkRow(element) === "Yellow" ||
  //     this.checkCol(element) === "Yellow" ||
  //     this.checkLeftDiagonal(element) === "Yellow" ||
  //     this.checkRightDiagonal(element) === "Yellow"
  //   ) {
  //     this.announceVictory("Yellow");
  //   }
  // }

  checkVictory(element) {
    if (  // check RED victory
      this.checkRow(element) === "Red" ||
      this.checkCol(element) === "Red" ||
      this.checkLeftDiagonal(element) === "Red" ||
      this.checkRightDiagonal(element) === "Red"
    ) {
      this.announceVictory("Red");
    } else if ( // check YELLOW victory
      this.checkRow(element) === "Yellow" ||
      this.checkCol(element) === "Yellow" ||
      this.checkLeftDiagonal(element) === "Yellow" ||
      this.checkRightDiagonal(element) === "Yellow"
    ) {
      this.announceVictory("Yellow");
    }
  }

  announceVictory(victor) {
    if (victor === "Red") {
      this.winner.textContent = "Red Wins!";
      this.winner.style.color = "#ff1744";
      this.webSocket$.next('WIN RED');
    } else if (victor === "Yellow") {
      this.winner.textContent = "Yellow Wins!";
      this.winner.style.color = "#ffea00";
      this.webSocket$.next('WIN YELLOW');
    } else {  // victor === "none"
      this.winner.textContent = "Tie!";
      this.webSocket$.next('TIE');
    }

    this.finish = true;
    this.turn = NaN;
    this.nTurn = NaN;
  }

}
