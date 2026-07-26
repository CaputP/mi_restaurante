declare global {
  namespace Express {
    interface Request {
      auth?: {
        usuarioId: string;
        rol: string;
        correo: string;
        sessionVersion: number;
      };
    }
  }
}

export {};