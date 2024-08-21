// express server
import { PrismaClient, type User } from "@prisma/client";
import cookieParser from "cookie-parser";
import express, { type NextFunction, type Request, type Response } from "express";
import { body, validationResult } from "express-validator";
import * as jwt from "jsonwebtoken";

const app = express();
app.use(express.json());
app.use(cookieParser());

const prisma = new PrismaClient();

const validateUser = [
  body("username")
    .isString()
    .withMessage("Username must be a string")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long"),
  body("email").isEmail().withMessage("Invalid email address").normalizeEmail(),
  body("password")
    .isString()
    .withMessage("Password must be a string")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

const authMiddleware = async (request: Request, response: Response, next: NextFunction) => {
  const cookies = request.cookies;
  if (cookies && cookies.Authorization) {
    const secret = "qwe";
    try {
      const verificationResponse = jwt.verify(cookies.Authorization, secret) as User;
      const id = verificationResponse.id;
      const user = await prisma.user.findUnique({ where: { id } });
      if (user) {
        // request.user = user;
        next();
      } else {
        response.status(403).json({ message: "Authentication token is invalid, no user found" });
      }
    } catch (error) {
      response.status(403).json({ message: "Authentication token is invalid, something went wrong" });
    }
  } else {
    response.status(403).json({ message: "Authentication token missing" });
  }
};

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({
    where: { username, password },
  });

  if (!user) {
    return res.status(401).send("Invalid credentials");
  }
  const token = jwt.sign(user, "qwe", { expiresIn: "1h" });
  res.cookie("Authorization", token, {
    maxAge: 900000,
    httpOnly: true,
  });
  res.send("Logged in");
});

app.get("/logout", (req, res) => {
  res.clearCookie("Authorization");
  res.send("Logged out");
});

app.get("/me", authMiddleware, async (req, res) => {
  const cookies = req.cookies;
  if (cookies && cookies.Authorization) {
    const secret = "qwe";
    const { username, email } = jwt.verify(cookies.Authorization, secret) as User;
    res.send({ username, email });
  }
});

app.get("/users", authMiddleware, async (req, res) => {
  const users = await prisma.user.findMany();
  res.send(users);
});

app.post("/users", authMiddleware, validateUser, async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const newUser = await prisma.user.create({
    data: {
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
    },
  });
  res.status(201).send(newUser);
});

app.put("/", (req, res) => {
  res.send("PUT request to the homepage");
});

app.delete("/users/:id", authMiddleware, async (req, res) => {
  await prisma.user.delete({
    where: { id: parseInt(req.params.id) },
  });
  res.send("deleted user with id: " + req.params.id);
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
