const { Server } = require('socket.io');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:5173').split(',').map((o) => o.trim()).filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    const role = socket.handshake.query.role;

    if (userId) {
      // Support both room naming styles
      socket.join(`user:${userId}`);
      socket.join(`user_${userId}`);
      console.log(`🔌 Socket connected — user ${userId} joined personal room`);
    }

    if (role === 'admin') {
      socket.join('admins');
      console.log(`🔌 Admin socket joined admins room`);
    }

    socket.on('disconnect', () => {
      if (userId) {
        console.log(`🔌 Socket disconnected — user ${userId}`);
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    // Return a dummy object if called before init to prevent crashes
    return {
      to: () => ({ emit: () => {} }),
      emit: () => {},
    };
  }
  return io;
};

/**
 * Emit an event to a specific user's socket room.
 * @param {string} userId
 * @param {string} event
 * @param {object} data
 */
const emitToUser = (userId, event, data) => {
  if (!io) {
    console.warn('Socket.IO not initialized — cannot emit event');
    return;
  }
  const uid = userId.toString();
  io.to(`user:${uid}`).emit(event, data);
  io.to(`user_${uid}`).emit(event, data);
};

module.exports = { initSocket, getIO, emitToUser };
