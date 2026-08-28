# YoMobiles Backend

Node.js and Express REST API for the YoMobiles e-commerce platform.

This repository is the server-side source of truth for the YoMobiles system. It powers the client storefront and the admin dashboard with:

- user and admin authentication
- catalog, brand, category, sub-category, poster, and variant data
- product ratings and reviews
- shopping orders and payment verification
- notification and verification workflows

## Who Uses It

- Flutter customers through the YoMobiles Client app
- administrators through the YoMobiles Admin dashboard

## Stack

- Node.js
- Express
- MongoDB with Mongoose
- JSON Web Tokens for user and admin sessions
- Cloudinary for media uploads
- Nodemailer for email delivery
- `node:test` and `supertest` for backend security tests

## Architecture

- `index.js` boots the Express app, middleware, routes, and database connection
- `config/` holds runtime configuration helpers
- `middleware/` contains authentication and request middleware
- `model/` contains Mongoose models
- `routes/` exposes the REST API surface
- `utils/` contains startup helpers such as admin provisioning
- `test/` contains the security-focused automated tests

## Authentication and Security Model

- Users and admins authenticate with signed JWT access tokens.
- Protected routes expect `Authorization: Bearer <token>`.
- The server validates user and admin roles on protected endpoints.
- Production startup fails closed when required JWT configuration is missing.
- Default admin provisioning is explicit and environment-driven; it does not silently create predictable credentials.

## Environment Configuration

Copy [`./.env.example`](./.env.example) to `.env` and provide real values for your environment.

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
- `/health`

## Testing

```bash
npm test
```

The current test suite focuses on authentication, authorization, token issuance, and admin provisioning behavior.
GitHub Actions now runs the same test suite on pushes and pull requests.

## Deployment / Current Status

- API-only service; there is no UI to screenshot.
- The repository includes a `/health` endpoint for runtime checks.
- Public API deployment: [https://ecommerce-backend-api-jet.vercel.app](https://ecommerce-backend-api-jet.vercel.app)
- Production deployment should use the environment values documented above and a managed MongoDB instance.

## Related YoMobiles Repositories

- [YoMobiles Client](https://github.com/kalaabalb/yomoblies)
- [YoMobiles Admin](https://github.com/kalaabalb/yomobliesctl)

## Contributing

- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Keep authentication, API contracts, and database behavior stable unless a change is explicitly requested.

## Security

- [`SECURITY.md`](SECURITY.md)

Do not commit JWT secrets, database passwords, API keys, or private signing material.

## License

MIT License. See [`LICENSE`](LICENSE).

## Author

YoMobiles project maintainer
