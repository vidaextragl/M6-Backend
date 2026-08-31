export interface UserRecord {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  password_hash: string;
  created_at: Date;
}

export interface UpdateUserFields {
  name?: string;
  avatarUrl?: string;
}
