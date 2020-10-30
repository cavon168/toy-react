import { createElement, render, Component } from './toy-react';

/**
 * @description 第三版
 */
class Square extends Component {
  render() {
    console.log(this.props);
    return (
      <button className="square" onClick={this.props.onClick}>
        {this.props.value}
      </button>
    );
  }
}

class Board extends Component {
  renderSquare(i) {
    return (
      <Square
        value={this.props.squares[i]}
        onClick={() => this.props.onClick(i)}
      />
    );
  }

  render() {
    return (
      <div>
        <div className="board-row">
          {this.renderSquare(0)}
          {this.renderSquare(1)}
          {this.renderSquare(2)}
        </div>
        <div className="board-row">
          {this.renderSquare(3)}
          {this.renderSquare(4)}
          {this.renderSquare(5)}
        </div>
        <div className="board-row">
          {this.renderSquare(6)}
          {this.renderSquare(7)}
          {this.renderSquare(8)}
        </div>
      </div>
    );
  }
}

class Game extends Component {
  constructor(props) {
    super(props);
    this.state = {
      history: [
        {
          squares: Array(9).fill(null)
        }
      ],
      stepNumber: 0,
      xIsNext: true
    };
  }

  handleClick(i) {
    const history = this.state.history.slice(0, this.state.stepNumber + 1);
    const current = history[history.length - 1];
    const squares = current.squares.slice();
    if (calculateWinner(squares) || squares[i]) {
      return;
    }
    squares[i] = this.state.xIsNext ? "X" : "O";
    this.setState({
      history: history.concat([
        {
          squares: squares
        }
      ]),
      stepNumber: history.length,
      xIsNext: !this.state.xIsNext
    });
  }

  jumpTo(step) {
    this.setState({
      stepNumber: step,
      xIsNext: (step % 2) === 0
    });
  }

  render() {
    const history = this.state.history;
    const current = history[this.state.stepNumber];
    const winner = calculateWinner(current.squares);

    const moves = history.map((step, move) => {
      const desc = move ?
        'Go to move #' + move :
        'Go to game start';
      return (
        <li key={move}>
          <button onClick={() => this.jumpTo(move)}>{desc}</button>
        </li>
      );
    });

    let status;
    if (winner) {
      status = "Winner: " + winner;
    } else {
      status = "Next player: " + (this.state.xIsNext ? "X" : "O");
    }

    return (
      <div className="game">
        <div className="game-board">
          <Board
            squares={current.squares}
            onClick={i => this.handleClick(i)}
          />
        </div>
        <div className="game-info">
          <div>{status}</div>
          <ol>{moves}</ol>
        </div>
      </div>
    );
  }
}

render(<Game />, document.getElementById("root"));
// let game = <Game />;
// console.log('this is flag game.vdom:', game.vdom);

function calculateWinner(squares) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
}



/**
 * @description 第二版
 */
// class Square extends Component {
//   constructor(props) {
//     super(props);
//     this.state = {
//       value: null,
//     };
//   }

//   render() {
//     return (
//       <button
//         className="square"
//         onClick={() => this.setState({ value: 'X' })}
//       >
//         {this.state.value}
//       </button>
//     );
//   }
// }
// class Board extends Component {
//   renderSquare(i) {
//     return <Square />
//   }
//   render() {
//     const status = 'Next player: X';
//     return (
//       <div>
//         <div className={'status'}>{status}</div>
//         <div className={'board-row'}>
//           {this.renderSquare(0)}
//           {this.renderSquare(1)}
//           {this.renderSquare(2)}
//         </div>
//         <div className={'board-row'}>
//           {this.renderSquare(3)}
//           {this.renderSquare(4)}
//           {this.renderSquare(5)}
//         </div>
//         <div className={'board-row'}>
//           {this.renderSquare(6)}
//           {this.renderSquare(7)}
//           {this.renderSquare(8)}
//         </div>
//       </div>
//     )
//   }
// }
// class Game extends Component {
//   render() {
//     return (
//       <div className={'game'}>
//         <div className={'game-board'}>
//           <Board />
//         </div>
//         <div className={'game-info'}>
//           <div>{/* status */}</div>
//           <ol>{/* TODO */}</ol>
//         </div>
//       </div>
//     )
//   }
// }

// render(
//   <Game />,
//   document.getElementById('root')
// )


/**
 * @description 第一版
 */
// 组件：根据最新的host api来写(可以是自己定义的对象、class，一般默认class；根据最新的host api也可以是函数)
// class MyComponent extends Component { // 如果没有改写方法那就默认继承Component
//   // 1.constructor用来自己实现state，由于跟render同一组。
//   constructor() {
//     super();
//     this.state = {
//       a: 1,
//       b: 2
//     }
//   }
//   // 给一个render接口
//   render() {
//     return (
//       <div>
//         <h1>MyComponent</h1>
//         {/* <button onclick={() => { this.state.a++; this.rerender(); }}>add</button> */}
//         <button onclick={() => { this.setState({ a: this.state.a + 1 }) }}>add</button>
//         <span>{this.state.a.toString()}</span>
//         <span>{this.state.b.toString()}</span>
//       </div>
//     )
//   }
// }
// 组件使用
// render(<MyComponent id='a' class='c'>
//   <div>abc</div>
//   <div></div>
//   <div></div>
// </MyComponent>, document.body)

// 修改成直接在JavaScript里面去写html
// document.body.appendChild(<div id='a' class='c'>
//   <div>abc</div>
//   <div></div>
//   <div></div>
// </div>)

// 由于chrome控制台上找不到全局变量a，加上 window.a 这时候就能找到了
// window.a = <div id='a' class='c'>
//   <div>abc</div>
//   <div></div>
//   <div></div>
// </div>