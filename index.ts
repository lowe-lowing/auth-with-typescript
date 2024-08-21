// express server
import { PrismaClient } from "@prisma/client";
import cookieParser from "cookie-parser";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
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

function authMiddleware(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const cookies = request.cookies;
  if (cookies && cookies.Authorization) {
    const secret = "qwe";
    try {
      const verificationResponse = jwt.verify(cookies.Authorization, secret);
      console.log(verificationResponse);
      next();

      // const id = verificationResponse._id;
      // const user = await userModel.findById(id);
      // if (user) {
      //   request.user = user;
      //   next();
      // } else {
      //   next(new WrongAuthenticationTokenException());
      // }
    } catch (error) {
      next(new Error("Invalid token"));
    }
  } else {
    response.status(403).json({ message: "Authentication token missing" });
    // next(new Error("Authentication token missing"));
  }
}

// app.use(authMiddleware);

app.post("/login", (req, res) => {
  const token = jwt.sign(
    {
      _id: req.body.id,
    },
    "qwe",
    {
      expiresIn: "1h",
    }
  );
  res.cookie("Authorization", token, {
    maxAge: 900000,
    httpOnly: true,
  });
  res.send("Logged in");
});

app.get("/test", authMiddleware, (req, res) => {
  res.send("auth works");
});

app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany();
  res.send(users);
});

app.post("/users", validateUser, async (req: Request, res: Response) => {
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

app.delete("/users/:id", async (req, res) => {
  await prisma.user.delete({
    where: { id: parseInt(req.params.id) },
  });
  res.send("deleted user with id: " + req.params.id);
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
