export interface RegisterDTO {
  email: string;
  name: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface JwtPayload {
  userId: string;
}
