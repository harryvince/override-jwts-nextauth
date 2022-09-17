import { NextApiRequest, NextApiResponse } from "next"
import { prisma } from "../../../server/db/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
      switch (req.method) {
        case "POST":
          const { name, username, email, password, confirm, csrfToken } =
            req.body
  
          if (
            !((name && username && email && password && confirm) &&
            password.length >= 1)
          ) {
            res.status(400).json({
              statusText: "Invalid user parameters",
            })
            break
          }
  
          if (password != confirm) {
            res.status(400).json({
              statusText: "Password mismatch",
            })
            break
          }
  
          const profileExists = await prisma.user.findMany({
            where: {
              OR: [
                {
                  username: username,
                },
                {
                  email: email,
                },
              ],
            },
          })
  
          if (
            profileExists &&
            Array.isArray(profileExists) &&
            profileExists.length > 0
          ) {
            res.status(403).json({
              statusText: "User already exists",
            })
            break
          }
  
          const user = await prisma.user.create({
            data: {
              name: name,
              email: email,
              username: username,
              password: password,
            },
          });
  
          if (!user) {
            res.status(500).json({
              statusText: "Unable to create user account",
            })
          }
  
          const account = await prisma.account.create({
            data: {
              userId: user.id,
              type: "credentials",
              provider: "credentials",
              providerAccountId: user.id,
            },
          })
  
          if (user && account) {
            res.status(200).json({
              id: user.id,
              name: user.name,
              email: user.email,
            });
          } else {
            res.status(500).json({
              statusText: "Unable to link account to created user profile",
            })
          }
          break
        default:
          res.setHeader("Allow", ["POST"]);
          res.status(405).json({
            statusText: `Method ${req.method} Not Allowed`,
          })
      }
    } catch {
        return null
    }
}