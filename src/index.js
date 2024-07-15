const path = require("path");
const http = require("http");
const express = require("express");
const multer = require("multer");
const socketio = require("socket.io");
const Filter = require("bad-words");
const { generateMessage } = require("./utils/messages");
const { addUser, removeUser, getUser, getUserInRoom } = require("./utils/user");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public", "images")); // Destination folder for images
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
});

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, "../public");

// let count = 0;
io.on("connection", (socket) => {
  console.log("New Web Socket Connection");

  socket.on("join", (options, callback) => {
    const { error, user } = addUser({ id: socket.id, ...options });

    if (error) {
      return callback(error);
    }
    socket.join(user.room);

    socket.emit(
      "message",
      generateMessage(null, "Welcome to the chat app", "blue"),
      socket.id
    );

    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage(null, `${user.username} has joined!`, "green"),
        socket.id
      );

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUserInRoom(user.room),
    });

    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);
    const filter = new Filter();
    if (filter.isProfane(message)) {
      return callback("Profanity is not allowed");
    }
    io.to(user.room).emit(
      "message",
      generateMessage(user.username, message, "black"),
      socket.id
    );
    callback();
  });

  socket.on("sendLocation", (coords, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit(
      "message",
      generateMessage(
        user.username,
        `https://google.com/maps?q=${coords.latitude},${coords.longitude}`,
        "#51344D"
      ),
      socket.id
    );
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage(null, `${user.username} has left!`, "#ff6868"),
        socket.id
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUserInRoom(user.room),
      });
    }
  });
});

app.use(express.static(publicDirectoryPath));

app.post("/chat.html", upload.single("image"), (req, res) => {
  const imageUrl = `/images/${req.file.filename}`;
  //send  url to message.js as when it emit join event we can access imageurl
  res.redirect(
    `http://localhost:3000/chat.html?room=${req.body.room}&username=${req.body.username}&imageUrl=${imageUrl}`
  );
});

server.listen(port, () => {
  console.log(`server is running on ${port}!`);
});
