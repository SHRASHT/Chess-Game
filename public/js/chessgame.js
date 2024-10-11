const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";
    board.forEach((row, rowIndex) => {
        row.forEach((square, squareIndex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add(
                "square", (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark"
            );

            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = squareIndex;

            if (square !== null) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add(
                    'piece', square.color === 'w' ? "white" : "black"
                );
                pieceElement.innerText = getPieceUnicode(square);
                pieceElement.draggable = playerRole === square.color && chess.turn() === square.color;

                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowIndex, col: squareIndex };
                        e.dataTransfer.setData("text/plain", ""); // Required for drag and drop in some browsers
                    }
                });

                pieceElement.addEventListener("dragend", () => {
                    draggedPiece = null;
                    sourceSquare = null;
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener('dragover', function (e) {
                e.preventDefault();
            });

            squareElement.addEventListener('drop', (e) => {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSquare = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col),
                    };
                    handleMove(sourceSquare, targetSquare);
                }
            });

            boardElement.appendChild(squareElement);
        });
    });

    // Flip the board for black
    if (playerRole === 'b') {
        boardElement.classList.add('flipped');
    } else {
        boardElement.classList.remove('flipped');
    }
};

const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: 'q', // This can be dynamically selected if desired
    };

    const result = chess.move(move);
    if (result) {
        socket.emit("move", move);
    } else {
        // If the move is invalid, revert the board to the current state
        renderBoard();
    }
};

const getPieceUnicode = (piece) => {
    const unicodePieces = {
        p: { w: "♙", b: "♟" },
        r: { w: "♖", b: "♜" },
        n: { w: "♘", b: "♞" },
        b: { w: "♗", b: "♝" },
        q: { w: "♕", b: "♛" },
        k: { w: "♔", b: "♚" },
    };

    return piece ? unicodePieces[piece.type][piece.color] : "";
};

// Handle when the server assigns the player role
socket.on("playerRole", function (role) {
    playerRole = role;
    renderBoard();
});

// Handle spectator mode
socket.on("spectatorRole", function () {
    playerRole = null; // Spectators cannot move pieces
    renderBoard();
});

// Synchronize the board state from the server
socket.on("boardState", function (fen) {
    chess.load(fen);
    renderBoard();
});

// Handle when a move is made on the server
socket.on("move", function (move) {
    const result = chess.move(move);
    if (result) {
        renderBoard(); // Only re-render the board if the move is valid
    }
});

// Render the initial board state
renderBoard();
