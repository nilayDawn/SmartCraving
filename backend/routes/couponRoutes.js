const express = require("express");

const {
  createCoupon,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  couponValidate,
} = require("../controllers/couponController");
const router = express.Router();

router.route("/").post(createCoupon).get(getCoupon);
router.route("/:couponId").patch(updateCoupon).delete(deleteCoupon);
router.route("/validate").post(couponValidate);

module.exports = router;
