# Coding Express CLI - A Laravel-like Scaffolding Tool for Express.js

Coding Express CLI is a command-line tool designed to simplify and accelerate the development of Express.js applications by providing a Laravel-inspired scaffolding experience. It automates project setup, dependency installation, authentication scaffolding, and generates boilerplate code for controllers, models, routes, validators, and full resources.

---

## Installation

To use Coding Express CLI, install it globally via npm:

```bash
npm install -g codingexpress-cli
```

---

## Usage

```bash
codingexpress <command> [names...] [options]
```

Coding Express CLI provides commands to initialize projects and generate boilerplate code for various components.

---

## Available Commands

### `codingexpress init`

Initializes a new Express.js project with the following features:

- Creates a structured directory layout (`app/controllers`, `app/models`, `app/routes`, `app/middleware`, `app/validators`, `config`, `public`, `.vscode`).
- Generates core files: `package.json`, `server.js`, `.env`, `.gitignore`, `.prettierrc`, `.prettierignore`, and VS Code settings.
- Sets up a Postman collection for API testing.
- Scaffolds a complete authentication system (JWT-based with email/phone login, OTP, and refresh tokens).
- Installs dependencies (`express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `nodemailer`, `twilio`, `cors`, `express-validator`, `nodemon`, `prettier`).
- Runs `npm audit` to check for vulnerabilities.
- Starts the development server with `nodemon`.

**Example**:

```bash
codingexpress init
```

### `codingexpress make:controller <Name...>`

Creates one or more controller files in `app/controllers` and corresponding validator files in `app/validators`. Each controller includes CRUD methods (`index`, `store`, `show`, `update`, `destroy`) with pagination support for the `index` method.

**Example**:

```bash
codingexpress make:controller Product Order
```

This creates:

- `app/controllers/ProductController.js` and `app/validators/ProductValidator.js`
- `app/controllers/OrderController.js` and `app/validators/OrderValidator.js`

### `codingexpress make:model <Name...>`

Creates one or more Mongoose model files in `app/models` with a basic schema. Supports multiple database connections via the `--connection` option.

**Options**:

- `--connection=<name>`: Specifies the database connection from `config/database.js`. Defaults to `'default'`.

**Example**:

```bash
codingexpress make:model Product Order --connection=secondary
```

This creates:

- `app/models/Product.js` and `app/models/Order.js`, both configured for the `secondary` database connection.

### `codingexpress make:route <name...>`

Creates one or more route files in `app/routes` with RESTful routes (`GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`) linked to the corresponding controller and validator. Routes are protected by authentication middleware.

**Example**:

```bash
codingexpress make:route product order
```

This creates:

- `app/routes/productRoutes.js`
- `app/routes/orderRoutes.js`

**Note**: Manually import and use the route in `app/routes/index.js`, e.g.:

```javascript
const productRoutes = require("./productRoutes");
router.use("/products", productRoutes);
```

### `codingexpress make:resource <Name...>`

Creates a full resource, including a model, validator, controller, and route file for each specified name. Supports the `--connection` option for model database configuration.

**Options**:

- `--connection=<name>`: Specifies the database connection for the model. Defaults to `'default'`.

**Example**:

```bash
codingexpress make:resource Product Order --connection=secondary
```

This creates:

- `app/models/Product.js` and `app/models/Order.js` (using `secondary` connection)
- `app/validators/ProductValidator.js` and `app/validators/OrderValidator.js`
- `app/controllers/ProductController.js` and `app/controllers/OrderController.js`
- `app/routes/productRoutes.js` and `app/routes/orderRoutes.js`

**Note**: Manually import and use the route in `app/routes/index.js`.

---

## Project Structure

Running `codingexpress init` sets up the following directory structure:

```
├── app
│   ├── controllers/        # Controller files (e.g., AuthController.js, ProductController.js)
│   ├── middleware/         # Middleware (e.g., errorHandler.js, authMiddleware.js)
│   ├── models/             # Mongoose models (e.g., User.js, Product.js)
│   ├── routes/             # Route files (e.g., index.js, authRoutes.js, productRoutes.js)
│   ├── validators/         # Validation rules (e.g., authValidator.js, productValidator.js)
├── config
│   ├── database.js         # Database connection configuration
├── public/                 # Static assets
├── .env                    # Environment variables
├── .gitignore              # Git ignore file
├── .prettierrc             # Prettier configuration
├── .prettierignore         # Prettier ignore rules
├── .vscode
│   ├── settings.json       # VS Code settings (auto-format on save)
├── package.json            # Project metadata and dependencies
├── server.js               # Main Express server
├── <appName>.postman_collection.json  # Postman collection for API testing
```

---

## Authentication System

Coding Express CLI scaffolds a robust JWT-based authentication system with support for:

- Email or phone-based registration and login.
- OTP-based login and password reset (6-digit OTP, valid for 10 minutes).
- Refresh tokens for session management (default expiry: 7 days).
- Profile retrieval.
- Email and SMS OTP delivery (via Nodemailer and Twilio, requires configuration).

All authentication routes are prefixed with `/api/auth`. The base URL is `http://localhost:3000` (configurable via `PORT` in `.env`).

### Authentication API Endpoints

#### 1. Register New User

- **URL**: `/api/auth/register`
- **Method**: `POST`
- **Description**: Registers a new user with email/phone and optional password for OTP-based access.

**Request Body Examples**:

**Email & Password**

```json
{
  "email": "newuser@example.com",
  "password": "strongpassword123"
}
```

**Phone & Password**

```json
{
  "phone": "+1234567890",
  "password": "strongpassword123"
}
```

**Email Only (OTP-based)**

```json
{
  "email": "otpuser@example.com"
}
```

**Phone Only (OTP-based)**

```json
{
  "phone": "+19876543210"
}
```

**Response** (Success):

```json
{
  "message": "User registered successfully!"
}
```

#### 2. Send OTP

- **URL**: `/api/auth/send-otp`
- **Method**: `POST`
- **Description**: Sends a 6-digit OTP to the specified email or phone (valid for 10 minutes, configurable via `OTP_EXPIRY_MINUTES` in `.env`).

**Request Body Examples**:

**To Email**

```json
{
  "email": "user@example.com"
}
```

**To Phone**

```json
{
  "phone": "+1234567890"
}
```

**Response** (Success):

```json
{
  "message": "OTP sent to your email."
}
```

**Note**: Email/SMS services require configuration in `.env` (e.g., `EMAIL_SERVICE_HOST`, `TWILIO_ACCOUNT_SID`).

#### 3. User Login

- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Description**: Authenticates a user via email/phone with password or OTP. Returns JWT access and refresh tokens.

**Request Body Examples**:

**With Password (Email)**

```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**With Password (Phone)**

```json
{
  "phone": "+1234567890",
  "password": "yourpassword"
}
```

**With OTP (Email)**

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**With OTP (Phone)**

```json
{
  "phone": "+1234567890",
  "otp": "654321"
}
```

**Response** (Success):

```json
{
  "message": "Login successful!",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 4. Refresh Token

- **URL**: `/api/auth/refresh-token`
- **Method**: `POST`
- **Description**: Generates a new access token using a valid refresh token.

**Request Body**:

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (Success):

```json
{
  "message": "Tokens refreshed successfully!",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 5. Forgot Password

- **URL**: `/api/auth/forgot-password`
- **Method**: `POST`
- **Description**: Sends an OTP to the user's email or phone for password reset.

**Request Body Examples**:

**To Email**

```json
{
  "email": "user@example.com"
}
```

**To Phone**

```json
{
  "phone": "+1234567890"
}
```

**Response** (Success):

```json
{
  "message": "OTP sent for password reset. Please use it to reset your password."
}
```

#### 6. Reset Password

- **URL**: `/api/auth/reset-password`
- **Method**: `POST`
- **Description**: Resets the user's password after verifying the OTP.

**Request Body Examples**:

**Using Email and OTP**

```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "newsecurepassword123"
}
```

**Using Phone and OTP**

```json
{
  "phone": "+1234567890",
  "otp": "654321",
  "newPassword": "newsecurepassword123"
}
```

**Response** (Success):

```json
{
  "message": "Password has been reset successfully."
}
```

#### 7. Get User Profile

- **URL**: `/api/auth/profile`
- **Method**: `GET`
- **Description**: Retrieves the authenticated user's profile (excludes sensitive fields like password).

**Headers**:

```
Authorization: Bearer <your_jwt_token_here>
```

**Response** (Success):

```json
{
  "message": "Profile data",
  "user": {
    "_id": "1234567890abcdef",
    "email": "user@example.com",
    "phone": "+1234567890",
    "createdAt": "2025-06-15T10:00:00.000Z",
    "updatedAt": "2025-06-15T10:00:00.000Z"
  }
}
```

---

## Resource API Endpoints (Example: Products)

Running `codingexpress make:resource Product` generates a full resource with RESTful endpoints accessible at `/api/products`. Below are the endpoints for a `Product` resource.

### 1. Get All Products (Paginated)

- **URL**: `/api/products?page=1&limit=10`
- **Method**: `GET`
- **Description**: Retrieves a paginated list of products.

**Headers**:

```
Authorization: Bearer <your_jwt_token_here>
```

**Response** (Success):

```json
{
  "message": "Product list retrieved successfully",
  "data": [
    {
      "_id": "1234567890abcdef",
      "name": "Test Product",
      "createdAt": "2025-06-15T10:00:00.000Z",
      "updatedAt": "2025-06-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "totalItems": 1,
    "totalPages": 1,
    "currentPage": 1,
    "itemsPerPage": 10
  }
}
```

### 2. Create Product

- **URL**: `/api/products`
- **Method**: `POST`
- **Description**: Creates a new product.

**Headers**:

```
Authorization: Bearer <your_jwt_token_here>
Content-Type: application/json
```

**Request Body**:

```json
{
  "name": "Test Product"
}
```

**Response** (Success):

```json
{
  "message": "Product created successfully",
  "data": {
    "_id": "1234567890abcdef",
    "name": "Test Product",
    "createdAt": "2025-06-15T10:00:00.000Z",
    "updatedAt": "2025-06-15T10:00:00.000Z"
  }
}
```

### 3. Get Product by ID

- **URL**: `/api/products/:id`
- **Method**: `GET`
- **Description**: Retrieves a product by its ID.

**Headers**:

```
Authorization: Bearer <your_jwt_token_here>
```

**Response** (Success):

```json
{
  "message": "Product retrieved successfully",
  "data": {
    "_id": "1234567890abcdef",
    "name": "Test Product",
    "createdAt": "2025-06-15T10:00:00.000Z",
    "updatedAt": "2025-06-15T10:00:00.000Z"
  }
}
```

### 4. Update Product

- **URL**: `/api/products/:id`
- **Method**: `PUT`
- **Description**: Updates an existing product.

**Headers**:

```
Authorization: Bearer <your_jwt_token_here>
Content-Type: application/json
```

**Request Body**:

```json
{
  "name": "Updated Product"
}
```

**Response** (Success):

```json
{
  "message": "Product updated successfully",
  "data": {
    "_id": "1234567890abcdef",
    "name": "Updated Product",
    "createdAt": "2025-06-15T10:00:00.000Z",
    "updatedAt": "2025-06-15T10:10:00.000Z"
  }
}
```

### 5. Delete Product

- **URL**: `/api/products/:id`
- **Method**: `DELETE`
- **Description**: Deletes a product by its ID.

**Headers**:

```
Authorization: Bearer <your_jwt_token_here>
```

**Response** (Success):

```json
{
  "message": "Product deleted successfully"
}
```

---

## Environment Configuration

The `.env` file contains critical configurations. After running `codingexpress init`, update the following variables:

```bash
PORT=3000
DB_URI_DEFAULT=mongodb://127.0.0.1:27017/main_database
DB_URI_SECONDARY=mongodb://127.0.0.1:27017/secondary_database
DB_URI_TERTIARY=mongodb://127.0.0.1:27017/tertiary_database
JWT_SECRET=your-super-secret-key
JWT_REFRESH_SECRET=your-refresh-super-secret-key
REFRESH_TOKEN_EXPIRY_DAYS=7
OTP_LENGTH=6
OTP_EXPIRY_MINUTES=10
EMAIL_SERVICE_HOST=smtp.your-email-provider.com
EMAIL_SERVICE_PORT=587
EMAIL_SERVICE_USER=your-email@example.com
EMAIL_SERVICE_PASS=your-email-password
FROM_EMAIL=no-reply@example.com
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15017122661
CORS_ORIGIN=*
```

**Notes**:

- Replace placeholder values for email (Nodemailer) and SMS (Twilio) services with actual credentials.
- Ensure `JWT_SECRET` and `JWT_REFRESH_SECRET` are strong, unique keys.
- Adjust `CORS_ORIGIN` for production (e.g., `https://yourdomain.com`).

---

## Postman Collection

Coding Express CLI generates a Postman collection (`<appName>.postman_collection.json`) with pre-configured requests for all authentication and sample resource endpoints. Import it into Postman and set the `baseUrl` variable (default: `http://localhost:3000`).

**Features**:

- Automatically saves `accessToken` and `refreshToken` as environment variables during login/refresh.
- Includes requests for all authentication and sample resource (e.g., Product) endpoints.

---

## Additional Features

- **Error Handling**: The `errorHandler` middleware handles validation errors, duplicate key errors, JWT errors, and generic server errors.
- **Code Formatting**: Prettier is configured with VS Code integration (`format on save`). Run `npm run format` for manual formatting.
- **Security**: Routes are protected with JWT-based `authMiddleware`. Passwords and OTPs are hashed using `bcryptjs`.
- **Database Connections**: Supports multiple MongoDB connections via `config/database.js`.
- **Vulnerability Checks**: Runs `npm audit` during initialization to identify dependency vulnerabilities.

---

## Example Workflow

1. Install Coding Express CLI globally:

```bash
npm install -g codingexpress-cli
```

2. Initialize a new project:

```bash
codingexpress init
```

3. Create a full resource (e.g., Product):

```bash
codingexpress make:resource Product
```

4. Update `app/routes/index.js` to include the new route:

```javascript
const productRoutes = require("./productRoutes");
router.use("/products", productRoutes);
```

5. Configure `.env` with your database, email, and SMS credentials.

6. Test APIs using the generated Postman collection.

---

## Notes

- Ensure MongoDB is running locally or provide valid `DB_URI_*` values in `.env`.
- For production, secure your `.env` file and restrict `CORS_ORIGIN`.
- Run `npm audit fix` if vulnerabilities are reported during initialization.
- Customize validators (`app/validators/*.js`) and schemas (`app/models/*.js`) as needed.

---

## Downloading This README

To download this README as a Markdown file:

1. Copy the content above.
2. Save it to a file named `README.md` using a text editor (e.g., VS Code, Notepad).
3. Alternatively, if viewing this in a browser or compatible interface, use the provided download functionality to save it as `README.md`.

Coding Express CLI streamlines Express.js development with a structured, secure, and scalable foundation. Happy coding!
