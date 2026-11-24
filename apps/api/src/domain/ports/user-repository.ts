import type { Transaction } from "./transaction";

export interface User {
  id: string;
  email: string;
  name: string;
  theme: string;
  /**
   * Estudio del usuario (perfil editable). `null` = sin definir.
   * `user_email` NO se edita: la identidad del usuario es el email.
   */
  studio: string | null;
  emailVerified: boolean;
  acceptedTermsAt: Date;
  termsVersion: string;
}

/** Campos de perfil que el usuario puede editar. */
export interface UserProfilePatch {
  name: string;
  studio: string | null;
}

export interface UserRepository {
  findById(id: string, trx?: Transaction): Promise<User | undefined>;
  findByEmail(email: string, trx?: Transaction): Promise<User | undefined>;
  create(user: User, trx?: Transaction): Promise<void>;
  markEmailVerified(id: string, trx?: Transaction): Promise<void>;
  updateTheme(id: string, theme: string, trx?: Transaction): Promise<void>;
  /** Actualiza los campos editables del perfil (nombre y estudio). */
  updateProfile(
    id: string,
    profile: UserProfilePatch,
    trx?: Transaction,
  ): Promise<void>;
}
