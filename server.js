const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  socket.on("join-room", ({ room, role }) => {
    if (typeof room !== "string" || !/^[a-zA-Z0-9_-]{4,40}$/.test(room)) return;
    if (!["host", "viewer"].includes(role)) return;

    // Keep the demo one camera sender and one viewer per room.
    const roomSet = io.sockets.adapter.rooms.get(room);
    if (roomSet && roomSet.size >= 2) {
      socket.emit("room-full");
      return;
    }

    socket.data.room = room;
    socket.data.role = role;
    socket.join(room);
    socket.to(room).emit("peer-joined", { role });
    socket.emit("joined", { room, role });
  });

  for (const event of ["offer", "answer", "ice-candidate", "hangup"]) {
    socket.on(event, (payload) => {
      const room = socket.data.room;
      if (!room) return;
      socket.to(room).emit(event, payload);
    });
  }

  socket.on("disconnect", () => {
    if (socket.data.room) {
      socket.to(socket.data.room).emit("peer-left");
    }
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Demo running on http://localhost:${port}`));
