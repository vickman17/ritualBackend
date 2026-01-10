import { type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import { type AuthRequest } from '../middleware/authMiddleware.js';
import { container } from '../container/index.js';

// Helper to generate a random room code (e.g., "AB12CD")
const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const createRoom = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { title, maxParticipants, timePerQuestion, isPublic, password, startTime, coverPhotoUrl } = req.body;

  if (!title) {
    res.status(400).json({ success: false, message: 'Room title is required' });
    return;
  }

  // If room is private, password is required
  if (isPublic === false && !password) {
    res.status(400).json({ success: false, message: 'Password is required for private rooms' });
    return;
  }

  try {
    const svc = container.roomService;
    const created = await svc.createRoom({
      hostId: req.user.id,
      title,
      maxParticipants,
      timePerQuestion,
      isPublic,
      password: password || null,
      coverPhotoUrl
    });

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      room: {
        id: created.id,
        roomCode: created.roomCode,
        title,
        isPublic: isPublic !== undefined ? isPublic : true,
        startTime: null,
        coverPhotoUrl: coverPhotoUrl || null
      }
    });

  } catch (error: any) {
    console.error('Create Room Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getRooms = async (req: Request, res: Response) => {
    try {
        const rooms = await container.roomService.listRooms();

        res.json({ success: true, rooms });
    } catch (error: any) {
        console.error('Get Rooms Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getRecentPublicRooms = async (_req: Request, res: Response) => {
  try {
    const rooms = await container.roomService.listRecentPublicRooms();
    res.json({ success: true, rooms });
  } catch (error: any) {
    console.error('Get Recent Public Rooms Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getAllPublicRooms = async (_req: Request, res: Response) => {
  try {
    const rooms = await container.roomService.listAllPublicRooms();
    res.json({ success: true, rooms });
  } catch (error: any) {
    console.error('Get All Public Rooms Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMyRooms = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    try {
        const rooms = await container.roomService.listMyRooms(req.user.id);
        res.json({ success: true, rooms });
    } catch (error: any) {
        console.error('Get My Rooms Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getRoomParticipants = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        const participants = await container.roomService.getParticipants(Number(id));
        res.json({ success: true, participants });
    } catch (error: any) {
        console.error('Get Participants Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getRoomInfoForUser = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  const { id } = req.params;
  try {
    const info = await container.roomService.getRoomInfoForUser(Number(id), req.user.id);
    if (info.notFound) {
      res.status(404).json({ success: false, message: 'Room not found' });
      return;
    }
    res.json({ success: true, room: info.room, total: info.total, answered: info.answered, completed: info.completed, total_score: info.total_score, position: info.position });
  } catch (error: any) {
    console.error('Get Room Info Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getRoomById = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    
    const { id } = req.params;

    try {
        const result = await container.roomService.getRoomById(Number(id), req.user.id);
        if (result.notFound) {
          res.status(404).json({ success: false, message: 'Room not found' });
          return;
        }
        if (result.forbidden) {
          res.status(403).json({ success: false, message: 'Not authorized' });
          return;
        }
        res.json({ success: true, room: result.room });
    } catch (error: any) {
        console.error('Get Room By ID Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const updateRoom = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { id } = req.params;
    const { title, maxParticipants, timePerQuestion, isPublic, password, startTime, coverPhotoUrl } = req.body;

    try {
        const fields: any = {
          title,
          maxParticipants,
          timePerQuestion,
          isPublic,
          startTime: startTime || null,
          coverPhotoUrl: coverPhotoUrl ?? null
        };
        if (password) {
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash(password, salt);
          fields.password_hash = passwordHash; // will be ignored
        }
        const result = await container.roomService.updateRoom(Number(id), fields, req.user.id);
        if (result?.notFound) {
          res.status(404).json({ success: false, message: 'Room not found' });
          return;
        }
        if (result?.forbidden) {
          res.status(403).json({ success: false, message: 'Not authorized' });
          return;
        }

        res.json({ success: true, message: 'Room updated successfully' });

    } catch (error: any) {
        console.error('Update Room Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const deleteRoom = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { id } = req.params;

    try {
        const result = await container.roomService.deleteRoom(Number(id), req.user.id);
        if (result?.notFound) {
          res.status(404).json({ success: false, message: 'Room not found' });
          return;
        }
        if (result?.forbidden) {
          res.status(403).json({ success: false, message: 'Not authorized' });
          return;
        }
        res.json({ success: true, message: 'Room deleted successfully' });

    } catch (error: any) {
        console.error('Delete Room Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const joinRoom = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { id } = req.params;
    const { password } = req.body;

    try {
        const result = await container.roomService.joinRoom(Number(id), req.user.id, password);
        if (result.notFound) {
          res.status(404).json({ success: false, message: 'Room not found' });
          return;
        }
        if (result.passwordRequired) {
          res.status(400).json({ success: false, message: 'Password required' });
          return;
        }
        if (result.invalidPassword) {
          res.status(403).json({ success: false, message: 'Invalid password' });
          return;
        }

        res.json({ success: true, message: 'Joined successfully' });

    } catch (error: any) {
        console.error('Join Room Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const leaveRoom = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { id } = req.params;

    try {
        await container.roomService.leaveRoom(Number(id), req.user.id);
        res.json({ success: true, message: 'Left room successfully' });
    } catch (error: any) {
        console.error('Leave Room Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const publishRoom = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  const { id } = req.params;
  try {
    const result = await container.roomService.publishRoom(Number(id), req.user.id);
    if (result.notFound) {
      res.status(404).json({ success: false, message: 'Room not found' });
      return;
    }
    if (result.forbidden) {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }
    if (result.badRequest) {
      res.status(400).json({ success: false, message: result.badRequest });
      return;
    }
    res.json({ success: true, message: 'Room published' });
  } catch (error: any) {
    console.error('Publish Room Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
