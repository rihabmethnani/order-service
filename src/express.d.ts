// src/express.d.ts
declare module 'express' {
    interface Request {
      user?: {
        _id: string;
        email: string;
        role: string;
      };
    }
  }