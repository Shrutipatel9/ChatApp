const list = document.querySelector("#message-list");
const form = document.querySelector("#message-form");
const input = form.querySelector("input");
const sendButton = form.querySelector(".btn-primary");
const sendLocation = document.querySelector("#send-location");

const messageTemplete = document.querySelector("#message-templete").innerHTML;
const locationTemplete = document.querySelector(
  "#location-message-templete"
).innerHTML;
const roomTemplete = document.querySelector("#room-templete").innerHTML;

const { username, room, imageUrl } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const autoScroll = () => {
  // New message element
  const newMessage = list.lastElementChild;
  // Height of the new message
  const newMessageStyles = getComputedStyle(newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = newMessage.offsetHeight + newMessageMargin;
  // Visible height
  const visibleHeight = list.offsetHeight;
  // Height of messages container
  const containerHeight = list.scrollHeight;
  // How far have I scrolled?
  const scrollOffset = list.scrollTop + visibleHeight;
  if (containerHeight - newMessageHeight >= scrollOffset) {
    list.scrollTop = list.scrollHeight;
  }
};

const socket = io();
socket.on("message", (message, userId) => {
  const htmlTemplete = message.text.startsWith("https://google.com/maps?q=")
    ? locationTemplete
    : messageTemplete;

  const isOwnMessage = userId === socket.id;

  const html = Mustache.render(htmlTemplete, {
    username: isOwnMessage ? null : message.username,
    displayUsername: !isOwnMessage,
    message: message.text,
    createdAt:
      message.text !== "Welcome to the chat app"
        ? moment(message.createdAt).format("HH:mm a")
        : null,
  });
  list.insertAdjacentHTML("beforeend", html);
  autoScroll();
  const msgElement = list.lastElementChild; // Get the newly inserted element

  msgElement.style.color = message.color;

  if (
    message.text.includes("Welcome to the chat app") ||
    message.text.includes("has joined!") ||
    message.text.includes("has left")
  ) {
    msgElement.classList.add("center");
  } else if (userId === socket.id) {
    msgElement.classList.add("flex-end"); // Message sent by the current user
  } else {
    msgElement.classList.add("flex-start"); // Message sent by another user
  }
});

socket.on("roomData", ({ room, users }) => {
  const html = Mustache.render(roomTemplete, {
    room,
    users,
    imageUrl,
  });
  document.querySelector("#sidebar").innerHTML = html;
});

/// return users for current page

form.addEventListener("submit", (e) => {
  e.preventDefault();
  sendButton.setAttribute("disabled", "disabled");

  const message = input.value;

  socket.emit("sendMessage", message, (error) => {
    sendButton.removeAttribute("disabled");
    input.value = "";
    input.focus();
    if (error) {
      return console.log(error);
    }
    console.log("Message Delivered");
  });
});

sendLocation.addEventListener("click", (e) => {
  e.preventDefault();
  if (!navigator.geolocation) {
    return $("#geolocationModal").modal("show");
  }

  sendLocation.setAttribute("disabled", "disabled");
  navigator.geolocation.getCurrentPosition((position) => {
    socket.emit(
      "sendLocation",
      {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      () => {
        console.log("location Shared");

        sendLocation.removeAttribute("disabled");
      }
    );
  });
});
socket.emit("join", { username, room, imageUrl }, (error) => {
  if (error) {
    alert(error);
    location.href = "/";
  }
});
