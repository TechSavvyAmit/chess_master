// This is server-side script
const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();

const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();

let players = {};
let currentPlayer = "w";

// Set EJS as the view engine
app.set("view engine", "ejs");

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Chess Game" });
});

io.on("connection", function (uniquesocket) {
  console.log("Player connected:", uniquesocket.id);

  // Assign roles to players
  if (!players.white) {
    players.white = uniquesocket.id;
    uniquesocket.emit("playerRole", "w");
    console.log("Player assigned as white");
  } else if (!players.black) {
    players.black = uniquesocket.id;
    uniquesocket.emit("playerRole", "b");
    console.log("Player assigned as black");
  } else {
    uniquesocket.emit("spectatorRole");
    console.log("Player assigned as spectator");
  }

  // Send the current board state to the newly connected client
  uniquesocket.emit("boardState", chess.fen());

  // Handle player's move
  uniquesocket.on("move", (move) => {
    try {
      if (chess.turn() === "w" && uniquesocket.id !== players.white) {
        console.log("Move rejected: Not white's turn.");
        return;
      }
      if (chess.turn() === "b" && uniquesocket.id !== players.black) {
        console.log("Move rejected: Not black's turn.");
        return;
      }

      const moveObject = chess.move(move);
      if (moveObject) {
        currentPlayer = chess.turn();
        io.emit("move", move); // Broadcast the move to all clients
        io.emit("boardState", chess.fen()); // Send the updated board state to all clients
      } else {
        console.log("Invalid move:", move);
        uniquesocket.emit("invalidMove", move); // Notify the client of an invalid move
      }
    } catch (err) {
      console.log("Error processing move:", err);
      uniquesocket.emit(
        "error",
        "An error occurred while processing the move."
      );
    }
  });

  // Handle player disconnection
  uniquesocket.on("disconnect", function () {
    console.log("Player disconnected:", uniquesocket.id);

    if (uniquesocket.id === players.white) {
      delete players.white;
      console.log("White player left");
    } else if (uniquesocket.id === players.black) {
      delete players.black;
      console.log("Black player left");
    }
  });
});

server.listen(3000, function () {
  console.log("Server listening on port 3000");
});
