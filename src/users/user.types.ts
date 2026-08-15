export type UserRow = {
  id: string
  email: string
  name: string
  password_hash: string
  created_at: Date
  updated_at: Date
}

export type PublicUser = {
  id: string
  email: string
  name: string
}
