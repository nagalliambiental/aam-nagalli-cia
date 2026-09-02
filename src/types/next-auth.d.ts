import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      perfilNome: string;
      pessoaId: number | null;
      permissoes: string[];
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    perfilNome: string;
    pessoaId: number | null;
    permissoes: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    perfilNome?: string;
    pessoaId?: number;
    permissoes?: string[];
  }
}
