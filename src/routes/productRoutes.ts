import express from "express";
import { authenticateJWT, isAdmin } from "../middlewares/authMiddleware";
import {
  getAllProducts,
  deleteProduct,
  getProductByID,
  createProduct,
  updateProduct,
  addToWishlist,
  rating,
  uploadImages,
} from "../controller/ProductController";
import {
  productImgResize,
  uploadPhoto,
} from "../controller/uploadImagesController";
const router = express.Router();
router.get("/", getAllProducts);
router.post("/", authenticateJWT, isAdmin, createProduct);
router.get("/:id", getProductByID);
router.put("/wishlist", authenticateJWT, addToWishlist);
router.put("/rating", authenticateJWT, rating);
router.put("/:id", authenticateJWT, isAdmin, updateProduct);
router.delete("/:id", authenticateJWT, isAdmin, deleteProduct);
router.put(
  "/upload/:id",
  authenticateJWT,
  isAdmin,
  uploadPhoto.array("images", 10),
  productImgResize,
  uploadImages
);
export default router;
