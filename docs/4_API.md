# OrderIt API Reference

Base URL: `http://localhost:4000/api/v1`

The frontend Axios client adds `/api` to its configured host, so calls such as `/v1/users/login` resolve to this base URL. Browser requests require credentials for cookie authentication.

## Authentication

Protected routes accept `Authorization: Bearer <jwt>` or the `jwt` cookie. Admin routes require a valid user with role `admin`.

## Users

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/users/signup` | Public | Create account and issue token |
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
| PUT | `/eats/item/:foodId/review` | Public | Add food review |

Food creation accepts `imageUrl`; the controller converts it into the `images` array format.

## Cart

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/eats/cart/add-to-cart` | Body currently supplies user ID | Add/increment item |
| POST | `/eats/cart/update-cart-item` | Body currently supplies user ID | Set quantity |
| DELETE | `/eats/cart/delete-cart-item` | Body currently supplies user ID | Remove item |
| GET | `/eats/cart/get-cart` | User | Get populated cart |

Add/update example:

```json
{
  "userId": "USER_ID",
  "foodItemId": "FOOD_ID",
  "restaurantId": "RESTAURANT_ID",
  "quantity": 2
}
```

## Payments and orders

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/payment/process` | User | Create Stripe Checkout Session |
| GET | `/stripeapi` | User | Return publishable Stripe key |
| POST | `/eats/orders/new` | User | Convert Stripe session into order |
| GET | `/eats/orders/me/myOrders` | User | List current user orders |
| GET | `/eats/orders/:id` | User | Get order details |

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
  "restaurant": "RESTAURANT_ID"
}
```

Order creation body: `{ "session_id": "cs_test_..." }`.

## Coupons

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/coupon` | Current route is public | Create coupon |
| GET | `/coupon` | Public | List coupons |
| PATCH | `/coupon/:couponId` | Current route is public | Update coupon |
| DELETE | `/coupon/:couponId` | Current route is public | Delete coupon |
| POST | `/coupon/validate` | Public | Calculate offer result |

## AI and reviews

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/ai/test` | Public | Health check |
| POST | `/ai/generate-food-ai` | Current route is public | Generate food metadata only |
| POST | `/ai/generate-food-ai/:foodId` | Current route is public | Generate and save metadata |
| PUT | `/ai/admin/restaurants/:id/analyze` | Current route is public | Analyze restaurant reviews |
| PUT | `/ai/stores/:id/review` | Current route is public | Add restaurant review and analyze |

Food AI requires `name`, `category`, `spiceLevel`, and `price`.

## Error handling

Typical statuses are `200`/`201` success, `204` delete, `400` invalid input, `401` authentication failure, `404` missing resources, and `500` server/integration failure. Existing controllers use both `message` and `errMessage`; callers should display whichever exists.
