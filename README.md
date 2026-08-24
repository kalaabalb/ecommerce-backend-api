# YoMobiles Backend

Node.js and Express REST API for the YoMobiles e-commerce platform.

This repository is the backend source of truth for:

- user authentication
- admin authentication
- catalog data
- products
- orders
- ratings
- payment proof upload and verification
- verification and notification workflows

## Stack

- Node.js
- Express
- MongoDB with Mongoose
- JSON Web Tokens for user and admin sessions
- Cloudinary for media uploads
- Nodemailer for email delivery
- `node:test` and `supertest` for backend smoke tests

## Authentication Model

- Users and admins authenticate with signed JWT access tokens.
- Client applications must send `Authorization: Bearer <token>` for protected routes.
- User and admin sessions are validated on the server.
- The backend rejects unauthorized access to protected user and admin routes.

## Environment Configuration

Copy [`./.env.example`](./.env.example) to `.env` and set real values for your environment.

Required values include:

- `MONGO_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `ADMIN_USERNAME`
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Optional integrations:

- Cloudinary
- email delivery
- OneSignal

Do not commit secrets or live credentials.

## Local Setup

```bash
npm install
npm start
```

The default start command runs `index.js` and listens on `PORT` or `3000`.

## API Surface

The backend exposes endpoints for:

- `/users`
- `/admin-users`
- `/orders`
- `/ratings`
- `/payment`
- `/products`
- `/categories`
- `/subCategories`
- `/brands`
- `/variantTypes`
- `/variants`
- `/posters`
- `/notification`
- `/verification`

## Tests

```bash
npm test
```

The current test suite focuses on authentication and authorization behavior.

## Repository Layout

- `index.js` app bootstrap
- `config/` runtime configuration
- `middleware/` auth and request middleware
- `model/` Mongoose models
- `routes/` API route handlers
- `test/` backend security tests
- `utils/` helper utilities

## License

MIT License. See [`LICENSE`](LICENSE).

## Author

YoMobiles project maintainer
