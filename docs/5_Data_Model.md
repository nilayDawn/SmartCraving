# SmartCraving Data Model

MongoDB is accessed through Mongoose. Object IDs are stored as `ObjectId` values.

## Relationships

```text
User 1 ─── 1 Cart ─── * CartItem ─── 1 FoodItem
User 1 ─── * Order ─── 1 Restaurant
Restaurant 1 ─── * Menu
Menu 1 ─── * category ─── * FoodItem
FoodItem 1 ─── * food reviews
Restaurant 1 ─── * restaurant reviews
```

## Collections

### User

`name`, unique lowercase `email`, hashed `password`, `passwordConfirm` (removed after hashing), ten-digit `phoneNumber`, `role`, avatar `{ public_id, url }`, password-change timestamp, and password-reset token/expiry. Mongoose timestamps add `createdAt` and `updatedAt`.

Roles: `user`, `restaurant-owner`, and `admin`.

### Restaurant

`name`, `isVeg`, `address`, average `ratings`, `numOfReviews`, GeoJSON `location`, `reviews`, AI review fields, image array, and `createdAt`.

Indexes: `location` uses `2dsphere`; `address` uses a text index. Review fields are `name`, numeric `rating`, and `Comment`; review subdocuments have generated IDs for administrative deletion.

### Menu

```json
{
  "restaurant": "RESTAURANT_ID",
  "menu": [{ "category": "Main Course", "items": ["FOOD_ID"] }]
}
```

Menu item references are populated when menus are read.

### FoodItem

Core fields are `name`, `price`, `description`, `ratings`, `images`, `menu`, `stock`, `restaurant`, `numOfReviews`, and `reviews`. AI fields are `aiDescription`, `aiTags`, `aiAllergens`, `aiServes`, and `aiBestFor`; persisted review-summary fields are `reviewSentiment`, `reviewSummaryBullets`, and `reviewTopMentions`. Review summaries are cleared when reviews change.

### Cart

Stores `user`, `restaurant`, `createdAt`, and `items`. Each item contains a required `foodItem` reference and minimum quantity of 1. The controller enforces one restaurant per cart by replacing the cart when a different restaurant is selected.

### Order

Stores delivery information, user, restaurant, order-item snapshots, payment ID/status, unique Stripe session ID, item total, tax, delivery charge, final total, status, paid/delivered timestamps, and creation time.

Order items copy `name`, `quantity`, `image`, and `price`, while retaining the `fooditem` reference. This preserves historical display values if the catalogue changes.

### Coupon

Stores unique `couponName`, subtitle, minimum amount, maximum discount, percentage discount, details, and expiry date.

## Invariants and validation

- User email must be valid and unique.
- User password must be at least six characters; confirmation must match.
- Restaurant location must be GeoJSON Point data.
- Food item name, description, price, and stock are required.
- Food ratings accepted by the food-review controller are 1 through 5.
- Cart quantities must be at least 1 at schema level.
- Orders must have a user, delivery info, order items, and final total.
- Stripe session IDs are unique when present so payment-success retries return the existing order.
- Payment/order creation should reject an empty or missing cart before production use.
