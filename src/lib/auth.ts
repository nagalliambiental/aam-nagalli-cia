import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const usuario = await prisma.usuario.findUnique({
          where: { email: email.toLowerCase().trim() },
          include: {
            perfil: { include: { permissoes: { include: { permissao: true } } } },
            pessoa: true,
          },
        });

        if (!usuario || !usuario.ativo) return null;
        const ok = await bcrypt.compare(password, usuario.senhaHash);
        if (!ok) return null;

        return {
          id: String(usuario.id),
          email: usuario.email,
          nome: usuario.pessoa?.nome ?? usuario.email,
          perfilNome: usuario.perfil.nome,
          pessoaId: usuario.pessoaId,
          permissoes: usuario.perfil.permissoes.map((p) => p.permissao.chave),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.perfilNome = (user as { perfilNome?: string }).perfilNome;
        token.pessoaId = (user as { pessoaId?: number }).pessoaId;
        token.permissoes = (user as { permissoes?: string[] }).permissoes;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.perfilNome = (token.perfilNome as string) ?? "";
        session.user.pessoaId = (token.pessoaId as number) ?? null;
        session.user.permissoes = (token.permissoes as string[]) ?? [];
      }
      return session;
    },
  },
});
