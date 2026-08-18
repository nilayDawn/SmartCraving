# SmartCraving API Reference

Base URL: `http://localhost:4000/api/v1`

The frontend Axios client adds `/api` to its configured host, so calls such as `/v1/users/login` resolve to this base URL. Browser requests require credentials for cookie authentication.

## Authentication

Protected routes accept the `jwt` cookie or an `Authorization: Bearer <jwt>` header. The frontend uses the HTTP-only cookie. Admin routes require a valid user with role `admin`.

## Users

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/users/signup` | Public | Create a customer account and issue a session |
| POST | `/users/login` | Public | Authenticate account |
| GET | `/users/logout` | Public | Clear login cookie |
| GET | `/users/me` | User | Get current profile |
| PUT | `/users/me/update` | User | Update name/email/avatar |
| PUT | `/users/password/update` | User | Change password |
| POST | `/users/forgetPassword` | Public | Send reset email |
| PATCH | `/users/resetPassword/:token` | Public | Set new password |

Signup body:

```json
{
  "name": "Asha",
  "email": "asha@example.com",
  "password": "secret123",
  "passwordConfirm": "secret123",
  "phoneNumber": "9876543210"
}
```

## Restaurants

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/eats/stores?keyword=...` | Public | List/search restaurants |
| POST | `/eats/stores` | Admin | Create restaurant |
| GET | `/eats/stores/:storeId` | Public | Get restaurant details |
| DELETE | `/eats/stores/:storeId` | Admin | Delete restaurant |
| GET | `/eats/restaurants/count` | Public | Get restaurant count |

Restaurant creation requires `name`, `address`, and GeoJSON `location` (`type: "Point"`, `coordinates: [longitude, latitude]`).

When `keyword` is supplied, search checks restaurant `name` and `address`, plus `FoodItem.name`; a food match returns its associated restaurant.

## Menus and food items

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/eats/stores/:storeId/menus` | Public | List restaurant menus with items |
| POST | `/eats/stores/:storeId/menus` | Admin | Create menu |
| DELETE | `/eats/stores/:storeId/menus/:menuId` | Admin | Delete menu |
| PATCH | `/eats/stores/:storeId/menus/:menuId/addItem` | Admin | Add item to category |
| POST | `/eats/item` | Admin | Create food item |
| GET | `/eats/items/:storeId` | Public | List restaurant food items |
| GET | `/eats/item/:foodId` | Public | Get food item |
| PATCH | `/eats/item/:foodId` | Admin | Update food item |
| DELETE | `/eats/item/:foodId` | Admin | Delete food item |
| PUT | `/eats/item/:foodId/review` | User | Add food review |

## Reviews and AI summaries

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| PUT | `/ai/stores/:id/review` | User | Add restaurant review |
| DELETE | `/ai/stores/:id/reviews/:reviewId` | Admin | Delete restaurant review |
| DELETE | `/ai/items/:id/reviews/:reviewId` | Admin | Delete food-item review |
| POST | `/ai/stores/:id/summary` | Authenticated user | Get or generate restaurant review summary |
| POST | `/ai/items/:id/summary` | Authenticated user | Get or generate food-item review summary |

AI summary endpoints first return a persisted summary when the review set is unchanged. On a cache miss, the content-hash result is reused for one hour in memory and then saved on the restaurant or food-item document. Adding or deleting a review invalidates the saved summary.

Food creation accepts `imageUrl`; the controller converts it into the `images` array format.

## Cart

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/eats/cart/add-to-cart` | User | Add/increment item |
| POST | `/eats/cart/update-cart-item` | User | Set quantity |
| DELETE | `/eats/cart/delete-cart-item` | User | Remove item |
| GET | `/eats/cart/get-cart` | User | Get populated cart |

Add/update example:

```json
{
  "foodItemId": "FOOD_ID",
  "restaurantId": "RESTAURANT_ID",
  "quantity": 2
}
```

## Payments and orders

Stripe webhook: `POST /stripe/webhook` is called by Stripe with a signed raw request body. Configure `STRIPE_WEBHOOK_SECRET`. Paid checkout completion events finalize the order even if the customer closes the browser; duplicate webhook deliveries are safe because the Stripe session ID is unique.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/payment/process` | User | Create Stripe Checkout Session |
| GET | `/stripeapi` | User | Return publishable Stripe key |
| POST | `/eats/orders/new` | User | Convert Stripe session into order |
| GET | `/eats/orders/me/myOrders` | User | List current user orders |
| GET | `/eats/orders/:id` | Owner/Admin | Get order details |
| GET | `/eats/orders/admin` | Admin | List restaurant orders for administration |
| PATCH | `/eats/orders/:id/status` | Admin | Update order status and delivery timestamp |

Payment body:

```json
{
  "items": [{
    "quantity": 1,
    "foodItem": {
      "name": "Paneer Tikka",
      "price": 250,
      "images": [{ "url": "https://example.com/item.jpg" }]
    }
  }],
  "restaurant": "RESTAURANT_ID",
  "couponCode": "SAVE20"
}
```

Order creation body: `{ "session_id": "cs_test_..." }`.

## Coupons

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/coupon` | Admin | Create coupon |
| GET | `/coupon` | Public | List coupons |
| PATCH | `/coupon/:couponId` | Admin | Update coupon |
| DELETE | `/coupon/:couponId` | Admin | Delete coupon |
| POST | `/coupon/validate` | User | Validate and calculate offer result |

Coupon validation checks expiry, minimum order amount, percentage discount, and maximum discount. The same server-side calculation is applied again when creating Stripe Checkout.

## AI and reviews

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/ai/generate-food-ai` | Admin | Generate food metadata only |
| POST | `/ai/generate-food-ai/:foodId` | Admin | Generate and save metadata |
| PUT | `/ai/admin/restaurants/:id/analyze` | Admin | Analyze restaurant reviews |
| PUT | `/ai/stores/:id/review` | User | Add restaurant review |
| POST | `/ai/stores/:id/summary` | Authenticated user | Read cached or allowed summary |
| POST | `/ai/items/:id/summary` | Authenticated user | Read cached or allowed summary |

Food AI requires `name`, `category`, `spiceLevel`, and `price`.

AI routes are rate-limited. Existing summaries are returned from cached/document data; missing summaries are generated by administrators and saved to the related document.

## Error handling

Typical statuses are `200`/`201` success, `204` delete, `400` invalid input, `401` authentication failure, `404` missing resources, and `500` server/integration failure. Existing controllers use both `message` and `errMessage`; callers should display whichever exists.
