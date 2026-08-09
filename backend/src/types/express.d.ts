declare global {
  namespace Express {
    interface Request {
      auth?: {
        usuarioId: string;
        rol: string;
        permisos: string[];
        correo: string;
        sessionVersion: number;
      };
    }
  }
}

export {};
