// server/socket.js
function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join', (userEmail) => {
      if (!userEmail) return;
      socket.join(`user:${userEmail}`);
      console.log(`User ${userEmail} joined room user:${userEmail}`);
    });

    socket.on('join-conversation', (conversationId) => {
      if (!conversationId) return;
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave-conversation', (conversationId) => {
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = { setupSocket };
