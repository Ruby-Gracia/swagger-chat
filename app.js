const cors = require("cors");
const mongoose = require("mongoose");
const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);

const swaggerUI = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerApiDocs = require("./swagger");
const jsDoc = swaggerJsDoc(swaggerApiDocs);

app.use("/swagger", swaggerUI.serve, swaggerUI.setup(jsDoc));

const room = require("./routes/room");

const allowedOrigins = [
  "http://localhost:5000/",
  "http://localhost:3000/",
  "http://localhost:3001/",
  "https://uberchat2021.herokuapp.com/",
];

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.use(function (req, res, next) {
  //Enabling CORS
  res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  res.header(
    "Access-Control-Allow-Methods",
    "GET,HEAD,OPTIONS,POST,PUT,DELETE"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
    "x-client-key, x-client-token, x-client-secret, Authorization"
  );
  next();
});

app.use("/rooms", room);

const botName = "ChatCord Bot";

const db =
  "mongodb+srv://chat-user:chat123@cluster0.2b4qw.mongodb.net/chatApp?retryWrites=true&w=majority";

mongoose.connect(db, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useFindAndModify: false,
});

mongoose.connection.on("error", (err) => {
  console.log("Mongoose Connection ERROR: " + err.message);
});

mongoose.connection.once("open", () => {
  console.log("MongoDB Connected!");
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const io = require("socket.io")(server);

io.on("connection", (socket) => {
  console.log("Connected: " + socket.userId);

  socket.on("disconnect", () => {
    console.log("Disconnected: " + socket.userId);
  });

  socket.on("joinRoom", ({ roomId }) => {
    socket.join(roomId);
    console.log("A user joined chatroom: " + roomId);
  });

  socket.on("leaveRoom", ({ roomId }) => {
    socket.leave(roomId);
    console.log("A user left chatroom: " + roomId);
  });

  socket.broadcast.emit("userConnected", {
    userId: socket.id,
    userName: socket.username,
  });

  socket.on("receiveMessage", async ({ roomId, message }) => {
    if (message.trim().length > 0) {
      const user = await User.findOne({ _id: socket.userId });

      io.to(roomId).emit("receiveMessage", {
        message,
        name: user.name,
        userId: socket.userId,
        roomId: socket.roomId,
        createdAt: new Date().getTime(),
      });
    }
  });

  socket.on("getAllUsers", async ({ roomId }) => {
    const users = await User.find({ _id: socket.userId });

    io.to(roomId).emit("users", { users });
  });
});
