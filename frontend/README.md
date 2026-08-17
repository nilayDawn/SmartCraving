# Frontend documentation

## Overview

The frontend is a React 18 single-page application built with Vite. It uses Redux Toolkit for application state, React Router for navigation, Axios for API requests, and Tailwind CSS v4 for styling.

## Local development

```bash
cd frontend
npm install
npm run dev
```

The Vite development server runs on `http://localhost:5173` by default. API requests use `VITE_API_URL` when it is defined; otherwise they target `http://localhost:4000/api`.

Optional frontend environment file:

```env
VITE_API_URL=http://localhost:4000
```

## Application structure

```text
src/
  components/       Screens and reusable UI components
  redux/actions/    Async API workflows
  redux/slices/     Redux Toolkit state and reducers
  redux/store.js    Store configuration
  utils/api.js      Shared Axios client with credentials enabled
  App.jsx           Application routes and shared layout
  index.css         Tailwind entry point and shared component primitives
```

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | Restaurant discovery and search results |
| `/eats/stores/:id/menus` | Restaurant menu |
| `/eats/food/:id` | Food details, cart controls, and food reviews |
| `/cart` | Cart and checkout |
| `/users/login` | Login |
| `/users/signup` | Registration |
| `/users/me` | Profile |
| `/eats/orders/me/myOrders` | Current user orders |

## Styling conventions

- Use Tailwind utilities and semantic HTML for new UI.
- Use emerald for primary actions, amber for ratings/accent states, and slate for text/surfaces.
- Use `rounded-xl` for controls and `rounded-2xl` for cards.
- Add visible `hover`, `focus`, `active`, and `disabled` states to interactive controls.
- Keep forms accessible with labels, required fields, keyboard focus styles, and useful error text.
- Do not add new Bootstrap-style CSS or restore the removed legacy `App.css`.

## Verification

```bash
npm run build
npm run lint
```

The production bundle may report a chunk-size warning; this does not fail the build.
