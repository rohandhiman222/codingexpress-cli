# Coding Express CLI

A modern, scalable backend server built with Node.js and Express, designed to minimize boilerplate and accelerate development. It offers a pre-configured authentication system, ORM integration (Mongoose or Prisma), and a structured architecture. The CLI supports two initialization modes: a basic scaffold with authentication or a fully generated application from an OpenAPI specification.

## Features

- **Robust Routing**: RESTful routing with a clean, organized structure.
- **ORM Integration**: Supports **Mongoose** (MongoDB) or **Prisma** (SQL/NoSQL databases).
- **Full Authentication**: JWT-based authentication with:
  - Registration (Email/Password or Phone/OTP)
  - Login (Password or OTP)
  - Forgot/Reset Password Flow
  - Access & Refresh Tokens
  - Protected Routes Middleware
- **Validation**: Per-route validation using `express-validator`.
- **Environment Configuration**: Managed via `.env` files.
- **Structured Logging & Error Handling**: Centralized error handling middleware.
- **Automatic Scaffolding**: CLI commands to generate models, controllers, validators, and routes.
- **OpenAPI Integration**: Optionally generate a complete application (models, controllers, validators, routes) from an OpenAPI specification.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB (for Mongoose) or a Prisma-compatible database (e.g., PostgreSQL)

## Installation

Install the CLI globally:

```bash
npm install -g codingexpress-cli
```

## Usage

```bash
codingexpress <command> [names...] [options]
```

The CLI provides commands to initialize projects and generate boilerplate code.

## Available Commands

### `codingexpress init [path/to/api.yaml]`

Initializes a new Express.js project. The behavior depends on whether an OpenAPI specification file is provided:

- **Without OpenAPI File** (`codingexpress init`):

  - Scaffolds a project with a structured directory layout, core files, and a complete JWT-based authentication system.
  - Includes dependencies and a Postman collection for API testing.
  - Sets up a basic application ready for manual resource generation.

- **With OpenAPI File** (`codingexpress init ./path/to/api.yaml`):
  - Generates a complete application by parsing the OpenAPI specification (`.yaml` or `.json`).
  - Automatically creates models, controllers, validators, and routes based on the specification.
  - Includes the authentication system and all features of the basic scaffold.

**Common Features:**

- Creates directories: `app/controllers`, `app/models`, `app/routes`, `app/middleware`, `app/validators`, `config`, `public`, `.vscode`.
- Generates files: `package.json`, `server.js`, `.env`, `.gitignore`, `.prettierrc`, `.prettierignore`, VS Code settings.
- Sets up a Postman collection for API testing.
- Installs dependencies: `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `nodemailer`, `twilio`, `cors`, `express-validator`, `nodemon`, `prettier`.
- Runs `npm audit` to check vulnerabilities.
- Starts the development server with `nodemon`.

**Examples:**

```bash
codingexpress init                # Basic scaffold with authentication
codingexpress init ./api.yaml     # Full application from OpenAPI spec
```

### `codingexpress make:controller <Name...>`

Creates controller and validator files with CRUD methods (`index`, `store`, `show`, `update`, `destroy`) and pagination for `index`.

**Example:**

```bash
codingexpress make:controller Product Order
```

**Output:**

- `app/controllers/ProductController.js`, `app/validators/ProductValidator.js`
- `app/controllers/OrderController.js`, `app/validators/OrderValidator.js`

### `codingexpress update:resource Product.getPrice`

It will add new method inside ProductController and also update route file with controller name and route name

**Output:**

- `app/controllers/ProductController.js`, `app/validators/ProductValidator.js`

### `codingexpress make:model <Name...>`

Creates Mongoose model files with a basic schema. Supports multiple database connections.

**Options:**

- `--connection=<name>`: Specifies the database connection from `config/database.js`. Defaults to `'default'`.

**Example:**

```bash
codingexpress make:model Product Order --connection=secondary
```

**Output:**

- `app/models/Product.js`, `app/models/Order.js` (using `secondary` connection)

### `codingexpress make:route <Name...>`

Creates route files with RESTful endpoints (`GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`) linked to controllers and validators. Routes are protected by authentication middleware.

**Example:**

```bash
codingexpress make:route product order
```

**Output:**

- `app/routes/productRoutes.js`, `app/routes/orderRoutes.js`
- Updates `app/routes/index.js` with route registration

### `codingexpress make:resource <Name...>`

Creates a full resource (model, validator, controller, routes). Supports `--connection` for model configuration.

**Options:**

- `--connection=<name>`: Specifies the database connection. Defaults to `'default'`.

**Example:**

```bash
codingexpress make:resource Product Order --connection=secondary
```

**Output:**

- `app/models/Product.js`, `app/models/Order.js`
- `app/validators/ProductValidator.js`, `app/validators/OrderValidator.js`
- `app/controllers/ProductController.js`, `app/controllers/OrderController.js`
- `app/routes/productRoutes.js`, `app/routes/orderRoutes.js`
- Updates `app/routes/index.js`

## API Documentation

While in development mode, an interactive API documentation page is available, powered by Swagger UI.

-   **URL**: [\`http://localhost:3000/api-docs\`](http://localhost:3000/api-docs)

This page is automatically generated from the \`openapi.yaml\` file in the project's root directory. Any changes to this file will be reflected in the documentation.

## OpenAPI Integration

When an OpenAPI file is provided with `codingexpress init ./path/to/api.yaml`, the CLI generates a complete application by processing the specification as follows:

1. **Parsing and Validation**:

   - Reads the OpenAPI file using `swagger-parser`.
   - Validates against OpenAPI 3.0 standards.
   - Resolves internal (`$ref: '#/components/schemas/Product'`) and external references into a single object.

2. **Generating Models**:

   - Identifies schemas in `components.schemas` (e.g., `Product`, `Order`).
   - Maps properties to ORM fields (e.g., OpenAPI `string` to Mongoose `String` or Prisma `String`).
   - Applies constraints (e.g., `required: true`) from the `required` array.
   - Creates model files (e.g., `app/models/Product.js`) or updates `prisma/schema.prisma`.

3. **Generating Controllers and Routes**:

   - Processes paths (e.g., `/products`, `/products/{id}`).
   - Identifies CRUD operations using HTTP methods and `operationId` (e.g., `listProducts` maps to `index`).
   - Generates controller methods:
     - `index`: Search and pagination logic (e.g., `Model.find({ ...filters })`).
     - `store`: Create logic (e.g., `new Model(req.body).save()`).
     - `show`: Retrieve by ID.
   - Creates controller (e.g., `ProductController.js`) and route files (e.g., `productRoutes.js`).

4. **Generating Validators**:

   - Extracts schema rules to build `express-validator` rules (e.g., `body('name').notEmpty().isString()`).
   - Saves to validator files (e.g., `app/validators/ProductValidator.js`).

5. **Automatic Route Registration**:
   - Updates `app/routes/index.js` with `require` and `router.use()` calls at the `// [Coding express-cli-hook]` comment.

**Benefits**:

- Eliminates manual boilerplate for API-driven projects.
- Ensures alignment between OpenAPI spec and implementation.
- Accelerates prototyping and development.

## Running the Application

- **Development Mode**:

  ```bash
  npm run dev
  ```

- **Production Mode**:

  ```bash
  npm start
  ```

Server runs at `http://localhost:3000` (configurable via `.env`).

## Project Structure

```
├── app
│   ├── controllers/          # Controller files
│   ├── middleware/           # Middleware (e.g., errorHandler.js)
│   ├── models/               # Mongoose models
│   ├── routes/               # Route files
│   └── validators/           # Validation rules
├── config
│   └── database.js           # Database configuration
├── public/                   # Static assets
├── .env                      # Environment variables
├── .gitignore                # Git ignore
├── .prettierrc               # Prettier config
├── .prettierignore           # Prettier ignore rules
├── .vscode
│   └── settings.json         # VS Code settings
├── package.json              # Project metadata
├── server.js                 # Main server
└── <appName>.postman_collection.json # Postman collection
```

## Authentication System

The authentication system is included in both initialization modes, providing JWT-based security with:

- Email or phone-based registration/login.
- OTP-based login and password reset (6-digit OTP, 10-minute validity).
- Refresh tokens (7-day default expiry).
- Profile retrieval.
- Email/SMS OTP delivery (via Nodemailer/Twilio).

Routes are prefixed with `/api/auth`.

### Authentication API Endpoints

#### 1. Register New User

- **URL:** `/api/auth/register`
- **Method:** `POST`

**Request Body Examples:**

```json
{
  "email": "newuser@example.com",
  "password": "strongpassword123"
}
```

```json
{
  "phone": "+1234567890"
}
```

**Response:**

```json
{
  "message": "User registered successfully!"
}
```

#### 2. Send OTP

- **URL:** `/api/auth/send-otp`
- **Method:** `POST`

**Request Body Example:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "message": "OTP sent to your email."
}
```

#### 3. User Login

- **URL:** `/api/auth/login`
- **Method:** `POST`

**Request Body Example:**

```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response:**

```json
{
  "message": "Login successful!",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 4. Refresh Token

- **URL:** `/api/auth/refresh-token`
- **Method:** `POST`

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**

```json
{
  "message": "Tokens refreshed successfully!",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 5. Forgot Password

- **URL:** `/api/auth/forgot-password`
- **Method:** `POST`

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "message": "OTP sent for password reset."
}
```

#### 6. Reset Password

- **URL:** `/api/auth/reset-password`
- **Method:** `POST`

**Request Body:**

```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "newsecurepassword123"
}
```

**Response:**

```json
{
  "message": "Password reset successfully."
}
```

#### 7. Get User Profile

- **URL:** `/api/auth/profile`
- **Method:** `GET`
- **Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "message": "Profile data",
  "user": {
    "_id": "1234567890abcdef",
    "email": "user@example.com",
    "createdAt": "2025-06-15T10:00:00Z"
  }
}
```

## Resource API Endpoints (Example: Product)

Generated via `codingexpress make:resource Product` or OpenAPI, accessible at `/api/products`.

#### 1. Get All Products

- **URL:** `/api/products?page=1&limit=10`
- **Method:** `GET`
- **Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "message": "Product list retrieved successfully",
  "data": [
    {
      "_id": "1234567890abcdef",
      "name": "Test Product",
      "createdAt": "2025-06-15T10:00:00Z"
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

#### 2. Create Product

- **URL:** `/api/products`
- **Method:** `POST`
- **Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "Test Product"
}
```

**Response:**

```json
{
  "message": "Product created successfully",
  "data": {
    "_id": "1234567890abcdef",
    "name": "Test Product",
    "createdAt": "2025-06-15T10:00:00Z"
  }
}
```

#### 3. Get Product by ID

- **URL:** `/api/products/:id`
- **Method:** `GET`
- **Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "message": "Product retrieved successfully",
  "data": {
    "_id": "1234567890abcdef",
    "name": "Test Product",
    "createdAt": "2025-06-15T10:00:00Z"
  }
}
```

#### 4. Update Product

- **URL:** `/api/products/:id`
- **Method:** `PUT`
- **Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "Updated Product"
}
```

**Response:**

```json
{
  "message": "Product updated successfully",
  "data": {
    "_id": "1234567890abcdef",
    "name": "Updated Product",
    "createdAt": "2025-06-15T10:00:00Z",
    "updatedAt": "2025-06-15T10:10:00Z"
  }
}
```

#### 5. Delete Product

- **URL:** `/api/products/:id`
- **Method:** `DELETE`
- **Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "message": "Product deleted successfully"
}
```

## Environment Configuration

Update `.env`:

```
PORT=3000
DB_URI_DEFAULT=mongodb://127.0.0.1:27017/main_database
DB_URI_SECONDARY=mongodb://127.0.0.1:27017/secondary_database
JWT_SECRET=your-super-secret-key
JWT_REFRESH_SECRET=your-refresh-super-secret-key
REFRESH_TOKEN_EXPIRY_DAYS=7
OTP_LENGTH=6
OTP_EXPIRY_MINUTES=10
EMAIL_HOST=smtp.your-email-provider.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-password
EMAIL_FROM=no-reply@example.com
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15017122661
CORS_ORIGIN=*
```

**Notes:**

- Configure SMTP (email) and Twilio (SMS) credentials.
- Use strong `JWT_SECRET` and `JWT_REFRESH_SECRET`.
- Restrict `CORS_ORIGIN` in production.

## Postman Collection

A Postman collection (`<appName>.postman_collection.json`) is generated with requests for authentication and resource endpoints. Import into Postman and set `baseUrl` (default: `http://localhost:3000`).

## Additional Features

- **Error Handling**: Handles validation, JWT, and server errors.
- **Code Formatting**: Prettier with VS Code integration. Run `npm run format`.
- **Security**: JWT-protected routes, hashed passwords/OTPs (`bcryptjs`).
- **Database Connections**: Multiple MongoDB connections via `config/database.js`.
- **Vulnerability Checks**: Runs `npm audit` during initialization.

## Example Workflow

1. Install CLI:

   ```bash
   npm install -g codingexpress-cli
   ```

2. Initialize project:

   ```bash
   codingexpress init                # Basic scaffold
   # OR
   codingexpress init ./api.yaml     # OpenAPI-based app
   ```

3. Create resource (if using basic scaffold):

   ```bash
   codingexpress make:resource Product
   ```

4. Configure `.env`.

5. Run server:

   ```bash
   npm run dev
   ```

6. Test APIs with Postman.

## Notes

- Ensure database is running and configured in `.env`.
- Secure `.env` and restrict `CORS_ORIGIN` in production.
- Run `npm audit fix` for vulnerabilities.
- Customize validators and schemas as needed.
