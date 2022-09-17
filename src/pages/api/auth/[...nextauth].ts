import NextAuth, { type NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import { randomUUID } from "crypto";
import { v4 as uuidv4, v4} from "uuid"; 
import Cookies from 'cookies';
import { encode, decode, JWT } from "next-auth/jwt";

// Prisma adapter for NextAuth, optional and can be removed
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "../../../server/db/client";
import { env } from "../../../env/server.mjs";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  const generateSessionToken = () => {
    // Use `randomUUID` if available. (Node 15.6++)
    return randomUUID?.() ?? v4()
  }
  
  const authOptions: NextAuthOptions = {
    debug: true,
    // Include user.id on session
    callbacks: {
      session({ session, user }) {
        if (session.user) {
          session.user.id = user.id;
        }
        return session;
      },
      async signIn({ user, account, profile, email, credentials }) {
        //@ts-ignore
        if (req.query.nextauth.includes('callback') && req.query.nextauth.includes('credentials') && req.method === 'POST') {
          if (user) {
            const sessionToken = generateSessionToken();
            const sessionExpiry = new Date(Date.now() + ( 3600 * 1000 * 24 ));

            const test = await PrismaAdapter(prisma).createSession({
              sessionToken: sessionToken,
              expires: sessionExpiry,
              //@ts-ignore
              user: {
                connect: {
                  id: user.id
                }
              }
            });

            console.log(test);

            const cookies = new Cookies(req, res);

            cookies.set(`next-auth.session-token`, sessionToken, {
              expires: sessionExpiry
            });
          }
        }

        return true;
      },
    },
    jwt: {
      encode: async ({ token, secret, maxAge }) => {
        if (
          req.query.nextauth!.includes("callback") &&
          req.query.nextauth!.includes("credentials") &&
          req.method === "POST"
        ) {
          const cookies = new Cookies(req, res);
          const cookie = cookies.get("next-auth.session-token");

          if (cookie) return cookie;
          else return "";
        }
        // Revert to default behaviour when not in the credentials provider callback flow
        return encode({ token, secret, maxAge });
      },
      decode: async ({ token, secret }) => {
        if (
          req.query.nextauth!.includes("callback") &&
          req.query.nextauth!.includes("credentials") &&
          req.method === "POST"
        ) {
          return null;
        }

        // Revert to default behaviour when not in the credentials provider callback flow
        return decode({ token, secret });
      }, 
    },
    // Configure one or more authentication providers
    adapter: PrismaAdapter(prisma),
    providers: [
      DiscordProvider({
        clientId: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
      }),
      CredentialsProvider({
        type: 'credentials',
        credentials: {
          username: { label: "Username", type: "text" },
          password: {  label: "Password", type: "password" }
        },
        async authorize(credentials, req){
          const { username, password } = credentials as {
            username: string,
            password: string
          }
           
          if (username === 'harry' && password === 'password') {
            return { name: 'Harry Vince', id: 'cl86fbvha0002w8seo6oia0li' }
          } else {
            return null
          }
          
        }
      })
      // ...add more providers here
    ],
  };
  return await NextAuth(req, res, authOptions) as NextAuthOptions;
}