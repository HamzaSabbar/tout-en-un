import { hash, verify } from "@node-rs/argon2";

// algorithm: 2 = Argon2id (voir Algorithm dans @node-rs/argon2 ; la valeur
// numérique est utilisée directement car c'est un `const enum` ambiant,
// incompatible avec `isolatedModules`).
const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(motDePasse: string): Promise<string> {
  return hash(motDePasse, ARGON2_OPTIONS);
}

export async function verifyPassword(
  hashStocke: string,
  motDePasse: string,
): Promise<boolean> {
  return verify(hashStocke, motDePasse);
}
