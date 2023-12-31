import expressAsyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { isPasswordMatch } from "../utils/hashpasswords";
import { generateToken } from "../config/jwtToken";
import { generateRefreshToken } from "../config/refreshtoken";
import { User, UserStore } from "../models/User";
import { sendEmail } from "./EmailController";
//create user
export const createUser = expressAsyncHandler(async (req: any, res: any) => {
  const email: string = req?.body?.email;
  const userStore = new UserStore();
  const findUser: User | undefined = userStore.getUserByEmail(email);
  if (!findUser) {
    //create new user
    const newUser: User = {
      id: uuidv4(),
      firstname: req?.body?.firstname,
      lastname: req?.body?.lastname,
      email: req?.body?.email,
      mobile: req?.body?.mobile,
      password: req?.body?.password,
      role: req?.body?.role,
      isBlocked: false,
      cart: [],
      wishlist: [],
    };
    userStore.createUser(newUser);
    res.json({
      message: "User Registered Successfully",
      email: newUser?.email,
      token: generateToken(newUser.id, newUser.email),
    });
  } else {
    throw new Error("User Already Exists");
  }
});
// login user
export const loginUser = expressAsyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const userStore = new UserStore();
  const findUser: User | undefined = userStore.getUserByEmail(email);
  if (findUser && (await isPasswordMatch(password, findUser.password))) {
    const refreshToken = generateRefreshToken(findUser.id, findUser.email);
    userStore.updateUserById(findUser.id, { refreshToken: refreshToken });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    });
    res.json({
      _id: findUser?.id,
      firstname: findUser?.firstname,
      lastname: findUser?.lastname,
      email: findUser?.email,
      mobile: findUser?.mobile,
      token: generateToken(findUser.id, findUser.email),
    });
  } else {
    throw new Error("Invalid Credentials");
  }
});
// refresh token
export const handleRefreshToken = expressAsyncHandler(
  async (req: any, res: any) => {
    const userStore = new UserStore();
    const cookie = req.cookies;
    if (!cookie?.refreshToken) {
      throw new Error("Refresh token not found in Cookies.");
    }
    const refreshToken = cookie?.refreshToken;
    const findUser = userStore.findUserByRefreshToken(refreshToken);
    jwt.verify(
      refreshToken,
      process.env.JWT_SECRET || "mysecret",
      (err: any, user: any) => {
        if (
          err ||
          (user.id !== findUser?.id && user.email === findUser?.email)
        ) {
          throw new Error("Token Expired Please login again.");
        }
        const accessToken = generateToken(findUser?.id, findUser?.email);
        return res.json({ token: accessToken });
      }
    );
  }
);
// logout User
export const logoutUser = expressAsyncHandler(async (req: any, res: any) => {
  const userStore = new UserStore();
  const refreshToken = req?.cookies?.refreshToken;
  const findUser = userStore.findUserByRefreshToken(refreshToken);
  if (!findUser) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
    });
    return res.sendStatus(204);
  }
  userStore.updateUserById(findUser.id, { refreshToken: "" });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
  });
  return res.json({
    message: "User Logged-Out successfully",
  });
});
// update user
export const updatedUser = expressAsyncHandler(async (req: any, res: any) => {
  const { id } = req?.user;
  const userStore = new UserStore();
  const findUser: User | undefined = userStore.getUserById(id);

  if (findUser) {
    const newUser: User = {
      id: findUser.id,
      firstname: req?.user?.firstname ?? findUser.firstname,
      lastname: req?.user?.lastname ?? findUser.lastname,
      email: req?.user?.email ?? findUser.email,
      mobile: req?.user?.mobile ?? findUser.mobile,
      password: findUser.password,
      role: req?.user?.role ?? findUser.role,
      isBlocked: false,
      cart: req?.user?.cart ?? findUser.cart,
      wishlist: req?.user?.wishlist ?? findUser.wishlist,
    };
    userStore.updateUserById(id, newUser);
    const updatedUser: User | undefined = userStore.getUserById(id);
    return res.json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } else {
    throw new Error("User not found.");
  }
});
// get all users
export const getallUser = expressAsyncHandler(async (req: any, res: any) => {
  const userStore = new UserStore();
  const allUsers = userStore.getAllUsers();
  return res.json({
    message: "User fetched successfully",
    user: allUsers,
  });
});
// get a user by id
export const getUserById = expressAsyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const userStore = new UserStore();
  const findUser: User | undefined = userStore.getUserById(id);
  if (!findUser) {
    throw new Error("User not found");
  }
  return res.json({
    user: findUser,
  });
});
// delete a user
export const deleteUserById = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  const userStore = new UserStore();
  try {
    userStore.deleteUserById(id);
    res.json({
      message: `User with id ${id} deleted successfully.`,
    });
  } catch (error) {
    throw new Error("Error occured during deleteUserById");
  }
});
// block user
export const blockUser = expressAsyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const userStore = new UserStore();
  const findUser: User | undefined = userStore.getUserById(id);
  if (findUser) {
    const newUser = {
      isBlocked: true,
    };
    userStore.updateUserById(id, newUser);
    const updatedUser: User | undefined = userStore.getUserById(id);
    return res.json({
      message: "User blocked successfully",
      user: updatedUser,
    });
  } else {
    throw new Error("User not found.");
  }
});
// unblock user
export const unBlockUser = expressAsyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const userStore = new UserStore();
  const findUser: User | undefined = userStore.getUserById(id);
  if (findUser) {
    const newUser = {
      isBlocked: false,
    };
    userStore.updateUserById(id, newUser);
    const updatedUser: User | undefined = userStore.getUserById(id);
    return res.json({
      message: "User un-blocked successfully",
      user: updatedUser,
    });
  } else {
    throw new Error("User not found.");
  }
});
//update password
export const updatePassword = expressAsyncHandler(
  async (req: any, res: any) => {
    const { id } = req.user;
    const { password } = req.body;
    const userStore = new UserStore();
    const findUser: User | undefined = userStore.getUserById(id);
    if (findUser && password) {
      findUser.password = password;
      userStore.updateUserById(id, findUser);
      res.json({ message: "Password updated successfully." });
    } else {
      throw new Error("User not found. Could not update password.");
    }
  }
);
// password reset token
export const forgotPasswordToken = expressAsyncHandler(
  async (req: any, res: any) => {
    const userStore = new UserStore();
    const { email } = req.body;
    const user = userStore.getUserByEmail(email);
    if (!user) throw new Error("User not found with this email");
    try {
      const token = userStore.createPasswordResetToken(user.id);
      const resetURL = `Hi, Please follow this link to reset Your Password. This link is valid till 10 minutes from now. <a href='http://localhost:3000/api/user/reset-password/${token}'>Click Here</>`;
      const data = {
        to: email,
        text: "Hey User",
        subject: "Forgot Password Link",
        htm: resetURL,
      };
      //sendEmail(data, req, res);
      res.json(token);
    } catch (e: any) {
      throw new Error(e);
    }
  }
);
// reset password
export const resetPassword = expressAsyncHandler(async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const userStore = new UserStore();
  const userArray = userStore.getAllUsers();
  const user: User | undefined = userArray.find((user) => {
    return (
      user.passwordResetToken === hashedToken &&
      user.passwordResetExpiresIn !== undefined &&
      new Date(user.passwordResetExpiresIn).getTime() > Date.now()
    );
  });
  if (!user) throw new Error(" Token Expired, Please try again later");
  user.password = password;
  user.passwordChangedAt = new Date(Date.now());
  user.passwordResetToken = undefined;
  user.passwordResetExpiresIn = undefined;
  userStore.updateUserById(user.id, user);
  res.json(user);
});
