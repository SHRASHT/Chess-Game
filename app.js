const express = require('express');
const socket = require('socket.io');
const http = require('http');
const { Chess } = require('chess.js');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = socket(server);
const chess = new Chess();
let players = {}; // To store white and black players
let currentPlayer = 'w'; // Track the current player turn

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

// Route to render the homepage
app.get('/', (req, res) => {
    res.render('index');
});

// Socket connection handling
io.on('connection', function (uniquesocket) {
    console.log("A player connected: ", uniquesocket.id);

    // Assign player roles (white or black)
    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit('playerRole', 'w');
    } else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit('playerRole', 'b');
    } else {
        // If both players are assigned, make the connecting player a spectator
        uniquesocket.emit('spectatorRole');
    }

    // Send the current board state to the newly connected client
    uniquesocket.emit('boardState', chess.fen());

    // Handle player disconnection
    uniquesocket.on('disconnect', function () {
        console.log("Player disconnected: ", uniquesocket.id);
        if (uniquesocket.id === players.white) {
            delete players.white;
        } else if (uniquesocket.id === players.black) {
            delete players.black;
        }
    });

    // Handle move from client
    uniquesocket.on("move", (move) => {
        try {
            // Ensure only the correct player can move
            if (chess.turn() === 'w' && uniquesocket.id !== players.white) {
                return;
            }
            if (chess.turn() === 'b' && uniquesocket.id !== players.black) {
                return;
            }

            // Process the move using chess.js
            const result = chess.move(move);
            if (result) {
                currentPlayer = chess.turn(); // Update the current player turn
                io.emit("move", move); // Broadcast the move to all clients
                io.emit('boardState', chess.fen()); // Broadcast the updated board state
            } else {
                console.log("Invalid move:", move);
                uniquesocket.emit("invalidMove", move); // Notify the player of an invalid move
            }
        } catch (err) {
            console.log("Error processing move: ", err);
        }
    });
});

// Start the server on port 3000
server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
