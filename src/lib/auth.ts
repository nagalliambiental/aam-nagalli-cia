import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { bloqueioRestanteMin, registrarFalha, limparTentativas } from "@/lib/login-rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 24 * 60 * 60, updateAge: 60 * 60 },
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

        const restante = bloqueioRestanteMin(email);
        if (restante > 0) {
          throw new Error(`Muitas tentativas de login. Tente novamente em ${restante} minuto(s).`);
        }

        const usuario = await prisma.usuario.findUnique({
          where: { email: email.toLowerCase().trim() },
          include: {
            perfil: { include: { permissoes: { include: { permissao: true } } } },
            pessoa: true,
          },
        });

        if (!usuario || !usuario.ativo) {
          registrarFalha(email);
          return null;
        }
        const ok = await bcrypt.compare(password, usuario.senhaHash);
        if (!ok) {
          registrarFalha(email);
          return null;
        }
        limparTentativas(email);

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
