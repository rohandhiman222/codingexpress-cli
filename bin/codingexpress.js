#!/usr/bin/env node

// Coding express CLI - A simple, Laravel-like scaffolding tool for Express.js
// Usage:
// 1. Install globally: npm install -g .
// 2. Initialize project: codingexpress init
// 3. Create a resource: codingexpress make:resource Product

const fs = require("fs");
const path = require("path");
const { EOL } = require("os");
const { execSync } = require("child_process");

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];

// --- Main CLI Logic ---

if (!command) {
  displayHelp();
  process.exit(1);
}

const parts = command.split(":");
const action = parts[0];
const feature = parts.length > 1 ? parts[1] : null;

// Use an async IIFE to handle top-level await
(async () => {
  switch (action) {
    case "init":
      console.log(`🚀 Initializing new Express project...`);
      await initProject();
      break;

    case "make":
      const type = feature;
      const makeArgs = args.slice(1);
      const makeOptions = parseArgs(makeArgs);
      const names = makeArgs.filter((arg) => !arg.startsWith("--"));

      if (!type || names.length === 0) {
        console.error(
          "Error: Please provide the type (controller, model, route, resource) and at least one name."
        );
        displayHelp();
        process.exit(1);
      }

      const processName = (name) => {
        const sanitized = name.replace(/[^a-zA-Z0-9]/g, "");
        if (!sanitized) {
          console.error(`Error: The provided name '${name}' is invalid.`);
          return null;
        }
        return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
      };

      for (const name of names) {
        const capitalizedName = processName(name);
        if (capitalizedName) {
          switch (type) {
            case "controller":
            case "model":
            case "route":
            case "resource":
              const config = getProjectConfig();
              const orm = makeOptions.orm || config.orm;

              if (type === "resource") {
                await createResource(capitalizedName, orm);
              } else if (type === "model") {
                await createModel(capitalizedName, orm, makeOptions);
              } else if (type === "controller") {
                createController(capitalizedName, orm);
              } else if (type === "route") {
                const sanitized = name.replace(/[^a-zA-Z0-9-]/g, "");
                if (sanitized) {
                  createRouteFile(sanitized.toLowerCase());
                } else {
                  console.error(
                    `Error: The provided name '${name}' is invalid.`
                  );
                }
              }
              break;
            default:
              console.error(`Error: Unknown type '${type}' for make command.`);
              displayHelp();
              break;
          }
        }
      }
      break;

    default:
      console.error(`Error: Unknown command '${command}'.`);
      displayHelp();
      break;
  }
})();

// --- Helper Functions for Project Config ---

function getProjectConfig() {
  const configPath = path.join(process.cwd(), "expresso.json");
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath));
  }
  console.error(
    "Error: Project not initialized or command is not run from the project root."
  );
  console.error("Please 'cd' into your project directory and try again.");
  process.exit(1);
}

function writeProjectConfig(config, projectPath) {
  const configPath = path.join(projectPath, "expresso.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log("✅ Created config file: expresso.json");
}

// --- Argument Parser ---

function parseArgs(args) {
  const options = {};
  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.substring(2).split("=");
      options[key] = value !== undefined ? value : true;
    }
  }
  return options;
}

// --- Generator Functions ---

async function initProject() {
  const { default: inquirer } = await import("inquirer");

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "appName",
      message: "What is the name of your application?",
      default: path.basename(process.cwd()),
      validate: function (input) {
        if (/^([A-Za-z\-\_\d])+$/.test(input)) return true;
        else
          return "Project name may only include letters, numbers, underscores and hashes.";
      },
    },
    {
      type: "list",
      name: "orm",
      message: "Which ORM would you like to use for this project?",
      choices: ["Mongoose", "Prisma"],
      default: "Mongoose",
    },
  ]);

  const { appName, orm: ormChoice } = answers;
  const orm = ormChoice.toLowerCase();

  const projectPath = path.join(process.cwd(), appName);
  if (fs.existsSync(projectPath)) {
    console.error(
      `Error: Directory '${appName}' already exists at ${projectPath}`
    );
    process.exit(1);
  }

  fs.mkdirSync(projectPath, { recursive: true });
  console.log(`✅ Created project directory: ${appName}`);

  writeProjectConfig({ appName, orm }, projectPath);

  console.log("Setting up directories...");
  const directories = [
    "app/controllers",
    "app/middleware",
    "app/routes",
    "app/validators",
    "config",
    "public",
    ".vscode",
  ];
  if (orm === "mongoose") {
    directories.push("app/models");
  } else if (orm === "prisma") {
    directories.push("prisma");
  }
  directories.forEach((dir) =>
    fs.mkdirSync(path.join(projectPath, dir), { recursive: true })
  );
  console.log("Directories created.");

  console.log("Creating core files...");
  createFile(
    path.join(projectPath, "package.json"),
    getPackageJsonTemplate(appName, orm)
  );
  createFile(path.join(projectPath, "server.js"), getServerTemplate(orm));
  createFile(
    path.join(projectPath, "app/routes/index.js"),
    getMainRouteTemplateWithAuth()
  );
  createFile(
    path.join(projectPath, "app/middleware/errorHandler.js"),
    getErrorHandlerTemplate(orm)
  );
  createFile(path.join(projectPath, ".env"), getEnvTemplate(orm, appName));
  createFile(path.join(projectPath, ".gitignore"), getGitignoreTemplate(orm));
  createFile(
    path.join(projectPath, "config/database.js"),
    getDatabaseConfigTemplate(orm)
  );
  createFile(
    path.join(projectPath, ".prettierrc"),
    getPrettierConfigTemplate()
  );
  createFile(
    path.join(projectPath, ".prettierignore"),
    getPrettierIgnoreTemplate()
  );
  createFile(
    path.join(projectPath, ".vscode/settings.json"),
    getVSCodeSettingsTemplate()
  );
  createFile(
    path.join(projectPath, `${appName}.postman_collection.json`),
    getPostmanCollectionTemplate(appName)
  );
  if (orm === "prisma") {
    createFile(
      path.join(projectPath, "prisma/schema.prisma"),
      getPrismaSchemaTemplate()
    );
  }

  console.log("Core files created.");

  await scaffoldAuth(orm, projectPath);
  await installDependencies(orm, projectPath);
  startDevServer(projectPath);
}

async function createResource(name, orm) {
  console.log(`\n🚀 Scaffolding resource: ${name} (using ${orm})...`);

  await createModel(name, orm, {});
  createController(name, orm);
  createRouteFile(name.toLowerCase());

  console.log(`✅ Resource '${name}' created successfully!`);
  if (orm === "mongoose") {
    console.log(`   - Model:      app/models/${name}.js`);
  } else {
    console.log(`   - Model:      (appended to prisma/schema.prisma)`);
  }
  console.log(`   - Validator:  app/validators/${name}Validator.js`);
  console.log(`   - Controller: app/controllers/${name}Controller.js`);
  console.log(`   - Routes:     app/routes/${name.toLowerCase()}Routes.js`);
  console.log(
    `\n💡 Action Required: Import and use the new route in 'app/routes/index.js'.\n   Example:\n   const ${name.toLowerCase()}Routes = require('./${name.toLowerCase()}Routes.js');\n   router.use('/${name.toLowerCase()}s', ${name.toLowerCase()}Routes);\n`
  );
  if (orm === "prisma") {
    console.log(
      "💡 Action Required: Run 'npx prisma generate' to update your Prisma Client."
    );
  }
}

async function installDependencies(orm, projectPath) {
  console.log("📦 Installing dependencies... This might take a moment.");
  try {
    execSync("npm install inquirer@^8.2.4", {
      cwd: projectPath,
      stdio: "inherit",
    });
    execSync("npm install", { cwd: projectPath, stdio: "inherit" });
    console.log("✅ Dependencies installed successfully.");

    if (orm === "prisma") {
      console.log("✨ Initializing Prisma Client...");
      execSync("npx prisma generate", { cwd: projectPath, stdio: "inherit" });
    }

    console.log("\n⚠️ Checking for vulnerabilities...");
    try {
      execSync("npm audit", { cwd: projectPath, stdio: "inherit" });
    } catch (auditError) {
      console.log(
        "\n⚠️ Vulnerabilities found. Run `npm audit fix` inside the project directory to address them."
      );
    }
  } catch (error) {
    console.error(
      `❌ Failed to install dependencies. Please 'cd ${path.basename(
        projectPath
      )}' and run 'npm install' manually.`
    );
    process.exit(1);
  }
}

function startDevServer(projectPath) {
  console.log("\n✅ Project initialized successfully!");
  console.log("\n---");
  console.log(
    `Your new project is ready in the '${path.basename(
      projectPath
    )}' directory.`
  );
  console.log(`To get started, run the following commands:\n`);
  console.log(`   cd ${path.basename(projectPath)}`);
  console.log(`   npm run dev`);
  console.log("\n---");
}

async function scaffoldAuth(orm, projectPath) {
  console.log(`🔒 Scaffolding authentication for ${orm}...`);

  createFile(
    path.join(projectPath, `app/controllers/AuthController.js`),
    getAuthControllerTemplate(orm)
  );

  if (orm === "mongoose") {
    createFile(
      path.join(projectPath, `app/models/User.js`),
      getAuthUserModelTemplate()
    );
  } else {
    const schemaPath = path.join(projectPath, "prisma/schema.prisma");
    const userModel = getPrismaUserModelTemplate();
    fs.appendFileSync(schemaPath, EOL + userModel);
    console.log(`✅ Appended User model to prisma/schema.prisma`);
  }

  createFile(
    path.join(projectPath, "app/routes/authRoutes.js"),
    getAuthRoutesTemplate()
  );
  createFile(
    path.join(projectPath, "app/middleware/authMiddleware.js"),
    getAuthMiddlewareTemplate()
  );
  createFile(
    path.join(projectPath, "app/validators/authValidator.js"),
    getAuthValidatorTemplate()
  );

  const envPath = path.join(projectPath, ".env");
  const authEnvContent = `
# Secret key for JWT authentication
JWT_SECRET=your-super-secret-key
# Secret key for JWT Refresh Token authentication
JWT_REFRESH_SECRET=your-refresh-super-secret-key
# Refresh Token Expiry (in days)
REFRESH_TOKEN_EXPIRY_DAYS=7
# OTP Settings
OTP_LENGTH=6
OTP_EXPIRY_MINUTES=10
# Email Service (e.g., Nodemailer) - Placeholder Values
EMAIL_SERVICE_HOST=smtp.your-email-provider.com
EMAIL_SERVICE_PORT=587
EMAIL_SERVICE_USER=your-email@example.com
EMAIL_SERVICE_PASS=your-email-password
FROM_EMAIL=no-reply@example.com
# SMS Service (e.g., Twilio) - Placeholder Values
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15017122661
# CORS Configuration
CORS_ORIGIN=*
`;
  fs.appendFileSync(envPath, authEnvContent);
}

function createFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(filePath)) {
    console.log(`Skipped: ${filePath} (already exists)`);
    return;
  }
  fs.writeFileSync(filePath, content);
  console.log(`Created file: ${filePath}`);
}

function createController(name, orm) {
  const modelName = name.replace("Controller", "");
  createFile(
    `app/controllers/${name}Controller.js`,
    getControllerTemplate(modelName, orm)
  );
  createFile(
    `app/validators/${modelName}Validator.js`,
    getValidatorTemplate(modelName)
  );
}

async function createModel(name, orm, options) {
  if (orm === "mongoose") {
    const connectionName = options.connection || "default";
    createFile(
      `app/models/${name}.js`,
      getMongooseModelTemplate(name, connectionName)
    );
  } else if (orm === "prisma") {
    const schemaPath = "prisma/schema.prisma";
    if (!fs.existsSync(schemaPath)) {
      console.error("Error: prisma/schema.prisma not found.");
      process.exit(1);
    }
    const modelSchema = getPrismaModelTemplate(name);
    fs.appendFileSync(schemaPath, EOL + EOL + modelSchema);
    console.log(`✅ Appended Prisma model '${name}' to prisma/schema.prisma`);
  }
}

function createRouteFile(name) {
  const controllerName = `${
    name.charAt(0).toUpperCase() + name.slice(1)
  }Controller`;
  createFile(
    `app/routes/${name}Routes.js`,
    getRouteTemplate(name, controllerName)
  );
}

// --- FULL TEMPLATE GENERATORS ---

function getPackageJsonTemplate(appName, orm) {
  const dependencies = {
    bcryptjs: "^2.4.3",
    cors: "^2.8.5",
    dotenv: "^16.4.5",
    express: "^4.19.2",
    "express-validator": "^7.2.0",
    jsonwebtoken: "^9.0.2",
    nodemailer: "^6.9.15",
    twilio: "^5.3.3",
    inquirer: "^8.2.4",
  };

  const devDependencies = {
    nodemon: "^3.1.7",
    prettier: "^3.3.3",
  };

  if (orm === "mongoose") {
    dependencies["mongoose"] = "^8.7.0";
  } else if (orm === "prisma") {
    dependencies["@prisma/client"] = "^5.17.0";
    devDependencies["prisma"] = "^5.17.0";
  }

  return JSON.stringify(
    {
      name: appName.toLowerCase().replace(/\s+/g, "-"),
      version: "1.0.0",
      description: "A new web application powered by Coding express CLI",
      main: "server.js",
      scripts: {
        start: "node server.js",
        dev: "nodemon server.js",
        format: "prettier --write .",
      },
      dependencies,
      devDependencies,
      keywords: [],
      author: "",
      license: "ISC",
    },
    null,
    2
  );
}

function getServerTemplate(orm) {
  const dbConnection =
    orm === "prisma"
      ? `db.connect();`
      : `db.connect().catch(err => {
  console.error('❌ Failed to connect to the database on startup.', err);
  process.exit(1);
});`;

  return `require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./config/database');
const errorHandler = require('./app/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

${dbConnection}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const mainRouter = require('./app/routes/index');
app.use('/api', mainRouter);

app.use(errorHandler);

app.get('/', (req, res) => {
  res.send('<h1>Welcome to your Coding express App!</h1>');
});

app.listen(PORT, () => {
  console.log(\`🚀 Server is running on http://localhost:\${PORT}\`);
});
`;
}

function getErrorHandlerTemplate(orm) {
  let dbErrorHandling = `
  if (err.name === 'ValidationError') { // Mongoose validation
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: 'Validation failed', errors: messages });
  }

  if (err.code === 11000) { // Mongoose duplicate key
    const field = Object.keys(err.keyValue)[0];
    return res
      .status(400)
      .json({ message: \`Duplicate value for \${field}: \${err.keyValue[field]}\` });
  }`;

  if (orm === "prisma") {
    dbErrorHandling = `
  if (err.code === 'P2002') { // Prisma unique constraint violation
    const field = err.meta?.target?.[0] || 'field';
    return res.status(400).json({ message: \`A record with this \${field} already exists.\` });
  }
  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({ message: 'Invalid data provided.', details: err.message });
  }`;
  }

  return `const { validationResult } = require('express-validator');

function errorHandler(err, req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
${dbErrorHandling}
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired', expiredAt: err.expiredAt });
  }

  console.error('Server error:', err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
}

module.exports = errorHandler;
`;
}

function getDatabaseConfigTemplate(orm) {
  if (orm === "prisma") {
    return `const { PrismaClient } = require('@prisma/client');

let prisma;

function getPrismaClient() {
  if (!prisma) {
    console.log('🔌 Initializing Prisma Client...');
    prisma = new PrismaClient();
    console.log('✅ Prisma Client initialized.');
  }
  return prisma;
}

async function connect() {
  const client = getPrismaClient();
  try {
    await client.$connect();
    console.log('✅ Database connected via Prisma.');
  } catch (e) {
    console.error('❌ Failed to connect to the database using Prisma.', e);
    await client.$disconnect();
    process.exit(1);
  }
}

module.exports = {
  connect,
  prisma: getPrismaClient(),
};
`;
  }
  return `const mongoose = require('mongoose');

const connectionsConfig = {
  default: {
    uri: process.env.DB_URI_DEFAULT || 'mongodb://localhost:27017/expresso_db',
  },
  // Add other connections here if needed
};

const activeConnections = {};

async function connect(name = 'default') {
  if (!connectionsConfig[name]) {
    throw new Error(\`Database connection "\${name}" is not defined\`);
  }
  if (activeConnections[name]) {
    return activeConnections[name];
  }
  console.log(\`🔌 Connecting to database: \${name}...\`);
  const connection = mongoose.createConnection(connectionsConfig[name].uri);
  connection.on('connected', () => console.log(\`✅ Database \${name} connected.\`));
  connection.on('error', (err) => console.error(\`❌ MongoDB error for \${name}:\`, err));
  activeConnections[name] = connection;
  return connection;
}

async function getConnection(name = 'default') {
  if (!activeConnections[name]) {
    return await connect(name);
  }
  return activeConnections[name];
}

module.exports = { connect, getConnection };
`;
}

function getEnvTemplate(orm, appName) {
  const dbName = appName.toLowerCase().replace(/[^a-z0-9]/g, "_");
  let dbEnv = `# MongoDB Connection String
DB_URI_DEFAULT=mongodb://127.0.0.1:27017/${dbName}`;

  if (orm === "prisma") {
    dbEnv = `# Prisma Database Connection URL (e.g., for PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/${dbName}?schema=public"`;
  }

  return `PORT=3000

${dbEnv}
`;
}

function getGitignoreTemplate(orm) {
  let content = `node_modules
.env
.DS_Store
coverage
`;
  if (orm === "prisma") {
    content += `prisma/dev.db\nprisma/dev.db-journal\n`;
  }
  return content;
}

function getPrismaSchemaTemplate() {
  return `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // Or "mysql", "sqlite", "sqlserver", "mongodb"
  url      = env("DATABASE_URL")
}
`;
}

function getControllerTemplate(modelName, orm) {
  const controllerClassName = `${modelName}Controller`;
  if (orm === "prisma") {
    return getPrismaControllerTemplate(controllerClassName, modelName);
  }
  return getMongooseControllerTemplate(controllerClassName, modelName);
}

function getMongooseControllerTemplate(controllerClassName, modelName) {
  return `const getModel = require('../models/${modelName}');

class ${controllerClassName} {
  async index(req, res, next) {
    try {
      const Model = await getModel();
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const [items, totalItems] = await Promise.all([
        Model.find().skip(skip).limit(limit).lean(),
        Model.countDocuments(),
      ]);
      
      const totalPages = Math.ceil(totalItems / limit);

      res.status(200).json({
        message: '${modelName} list retrieved successfully',
        data: items,
        pagination: { totalItems, totalPages, currentPage: page, itemsPerPage: limit },
      });
    } catch (error) { next(error); }
  }

  async store(req, res, next) {
    try {
      const Model = await getModel();
      const item = new Model(req.body);
      await item.save();
      res.status(201).json({ message: '${modelName} created successfully', data: item });
    } catch (error) { next(error); }
  }

  async show(req, res, next) {
    try {
      const { id } = req.params;
      const Model = await getModel();
      const item = await Model.findById(id).lean();
      if (!item) return res.status(404).json({ message: '${modelName} not found' });
      res.status(200).json({ message: '${modelName} retrieved successfully', data: item });
    } catch (error) { next(error); }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const Model = await getModel();
      const item = await Model.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
      if (!item) return res.status(404).json({ message: '${modelName} not found' });
      res.status(200).json({ message: '${modelName} updated successfully', data: item });
    } catch (error) { next(error); }
  }

  async destroy(req, res, next) {
    try {
      const { id } = req.params;
      const Model = await getModel();
      const item = await Model.findByIdAndDelete(id);
      if (!item) return res.status(404).json({ message: '${modelName} not found' });
      res.status(200).json({ message: '${modelName} deleted successfully' });
    } catch (error) { next(error); }
  }
}

module.exports = new ${controllerClassName}();
`;
}

function getPrismaControllerTemplate(controllerClassName, modelName) {
  const modelClientName =
    modelName.charAt(0).toLowerCase() + modelName.slice(1);
  return `const { prisma } = require('../../config/database');
const modelClient = prisma.${modelClientName};

class ${controllerClassName} {
  async index(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const [items, totalItems] = await prisma.$transaction([
        modelClient.findMany({ skip, take: limit }),
        modelClient.count(),
      ]);

      const totalPages = Math.ceil(totalItems / limit);
      res.status(200).json({
        message: '${modelName} list retrieved successfully',
        data: items,
        pagination: { totalItems, totalPages, currentPage: page, itemsPerPage: limit },
      });
    } catch (error) { next(error); }
  }

  async store(req, res, next) {
    try {
      const item = await modelClient.create({ data: req.body });
      res.status(201).json({ message: '${modelName} created successfully', data: item });
    } catch (error) { next(error); }
  }

  async show(req, res, next) {
    try {
      const item = await modelClient.findUnique({ where: { id: parseInt(req.params.id) } });
      if (!item) return res.status(404).json({ message: '${modelName} not found' });
      res.status(200).json({ message: '${modelName} retrieved successfully', data: item });
    } catch (error) { next(error); }
  }

  async update(req, res, next) {
    try {
      const item = await modelClient.update({
        where: { id: parseInt(req.params.id) },
        data: req.body,
      });
      res.status(200).json({ message: '${modelName} updated successfully', data: item });
    } catch (error) { next(error); }
  }

  async destroy(req, res, next) {
    try {
      await modelClient.delete({ where: { id: parseInt(req.params.id) } });
      res.status(200).json({ message: '${modelName} deleted successfully' });
    } catch (error) { next(error); }
  }
}

module.exports = new ${controllerClassName}();
`;
}

function getMongooseModelTemplate(name, conn) {
  return `const mongoose = require('mongoose');
const { Schema } = mongoose;
const { getConnection } = require('../../config/database');

const ${name.toLowerCase()}Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    // Add more fields here
  },
  { timestamps: true }
);

module.exports = async () => {
  const conn = await getConnection('${conn}');
  return conn.model('${name}', ${name.toLowerCase()}Schema);
};
`;
}

function getPrismaModelTemplate(name) {
  return `model ${name} {
  id        Int      @id @default(autoincrement())
  name      String
  // Add other fields here, e.g.,
  // description String?
  // price     Float    @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`;
}

function getPrismaUserModelTemplate() {
  return `
model User {
  id                  Int       @id @default(autoincrement())
  email               String?   @unique
  phone               String?   @unique
  password            String?
  otp                 String?
  otpExpires          DateTime?
  refreshToken        String?
  refreshTokenExpires DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`;
}

function getRouteTemplate(name, controllerName) {
  const modelName = controllerName.replace("Controller", "");
  return `const express = require('express');
const router = express.Router();
const ${controllerName} = require('../controllers/${controllerName}');
const authMiddleware = require('../middleware/authMiddleware');
const ${modelName.toLowerCase()}Validator = require('../validators/${modelName}Validator');

router.get('/', authMiddleware, ${controllerName}.index);
router.post('/', authMiddleware, ${modelName.toLowerCase()}Validator.store, ${controllerName}.store);
router.get('/:id', authMiddleware, ${controllerName}.show);
router.put('/:id', authMiddleware, ${modelName.toLowerCase()}Validator.update, ${controllerName}.update);
router.delete('/:id', authMiddleware, ${controllerName}.destroy);

module.exports = router;
`;
}

function getValidatorTemplate(modelName) {
  return `const { body } = require('express-validator');

const ${modelName.toLowerCase()}Validator = {
  store: [
    body('name')
      .notEmpty().withMessage('Name is required')
      .isString().withMessage('Name must be a string')
      .trim(),
  ],
  update: [
    body('name')
      .optional()
      .isString().withMessage('Name must be a string')
      .trim(),
  ],
};

module.exports = ${modelName.toLowerCase()}Validator;
`;
}

function getPrettierConfigTemplate() {
  return JSON.stringify(
    {
      semi: true,
      trailingComma: "es5",
      singleQuote: true,
      printWidth: 80,
      tabWidth: 2,
    },
    null,
    2
  );
}

function getPrettierIgnoreTemplate() {
  return `node_modules\ndist\nbuild\ncoverage\n.env\n*.min.js\npackage-lock.json\n`;
}

function getVSCodeSettingsTemplate() {
  return JSON.stringify(
    {
      "editor.defaultFormatter": "esbenp.prettier-vscode",
      "editor.formatOnSave": true,
    },
    null,
    2
  );
}

function getMainRouteTemplateWithAuth() {
  return `const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');

router.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Coding express API root!' });
});

router.use('/auth', authRoutes);

// [Coding express-cli-hook] - Add new routes here

module.exports = router;
`;
}

function getAuthUserModelTemplate() {
  return `const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcryptjs');
const { getConnection } = require('../../config/database');

const UserSchema = new Schema({
  email: { type: String, unique: true, lowercase: true, trim: true, sparse: true },
  phone: { type: String, unique: true, trim: true, sparse: true },
  password: { type: String, minlength: 6 },
  otp: { type: String },
  otpExpires: { type: Date },
  refreshToken: { type: String },
  refreshTokenExpires: { type: Date },
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
   if (this.isModified('otp') && this.otp && this.otp.length < 10) {
    this.otp = await bcrypt.hash(this.otp, 10);
  }
  if (this.isModified('refreshToken') && this.refreshToken && this.refreshToken.length < 100) {
    this.refreshToken = await bcrypt.hash(this.refreshToken, 10);
  }
  next();
});

UserSchema.methods.comparePassword = function (candidatePassword) {
  return this.password ? bcrypt.compare(candidatePassword, this.password) : false;
};

UserSchema.methods.compareOtp = function (candidateOtp) {
  if (!this.otp || !this.otpExpires || this.otpExpires < Date.now()) return false;
  return bcrypt.compare(candidateOtp, this.otp);
};

UserSchema.methods.compareRefreshToken = function (candidateRefreshToken) {
  if (!this.refreshToken) return false;
  return bcrypt.compare(candidateRefreshToken, this.refreshToken);
};


module.exports = async () => {
  const conn = await getConnection('default');
  return conn.model('User', UserSchema);
};
`;
}

function getAuthControllerTemplate(orm) {
  if (orm === "mongoose") {
    return getMongooseAuthControllerTemplate();
  } else {
    return getPrismaAuthControllerTemplate();
  }
}

function getMongooseAuthControllerTemplate() {
  return `
  const getUserModel = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const bcrypt = require('bcryptjs');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVICE_HOST || 'smtp.example.com',
  port: parseInt(process.env.EMAIL_SERVICE_PORT || '587'),
  secure: process.env.EMAIL_SERVICE_PORT === '465',
  auth: {
    user: process.env.EMAIL_SERVICE_USER || 'user@example.com',
    pass: process.env.EMAIL_SERVICE_PASS || 'password',
  },
});

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID || 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  process.env.TWILIO_AUTH_TOKEN || 'your_auth_token_here'
);

const generateOtp = () => {
  const otpLength = parseInt(process.env.OTP_LENGTH || '6');
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < otpLength; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

const sendOtpMessage = async (type, recipient, otp) => {
  if (type === 'email') {
    try {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL || 'no-reply@codingexpress.com',
        to: recipient,
        subject: 'Your Coding express App OTP',
        text: \`Your OTP for Coding express App is: \${otp}. It is valid for \${ process.env.OTP_EXPIRY_MINUTES || "10 minutes" }.\`,
        html: \`<p>Your OTP for Coding express App is: <strong>\${otp}</strong>. It is valid for \${process.env.OTP_EXPIRY_MINUTES || "10 minutes"}.</p>\`,
      });
      console.log(\`Email OTP sent to \${recipient}\`);
    } catch (error) {
      console.error('Error sending email OTP:', error);
      throw new Error('Failed to send email OTP.');
    }
  } else if (type === 'phone') {
    try {
        if(process.env.TWILIO_ACCOUNT_SID !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
            await twilioClient.messages.create({
                body: \`Your Coding express App OTP is: \${otp}\`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: recipient
            });
        }
      console.log(\`SMS OTP sent to \${recipient}\`);
    } catch (error) {
      console.error('Error sending SMS OTP:', error);
      throw new Error('Failed to send SMS OTP.');
    }
  }
};

class AuthController {
  async sendOtp(req, res, next) {
    try {
      const { email, phone } = req.body;
      const User = await getUserModel();
      let user;
      const otp = generateOtp();

      const otpExpires = new Date(
        Date.now() +
          parseInt(process.env.OTP_EXPIRY_MINUTES || '10') * 60 * 1000
      );

      if (email) {
        user = await User.findOne({ email });
        if (!user) {
          user = new User({ email });
        }
      } else if (phone) {
        user = await User.findOne({ phone });
        if (!user) {
          user = new User({ phone });
        }
      } else {
          return res.status(400).json({ message: 'Email or phone number is required.' });
      }

      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();
      await sendOtpMessage(email ? 'email' : 'phone', email || phone, otp);
      return res.json({ message: \`OTP sent to your \${email ? 'email' : 'phone'}.\` });
    } catch (error) {
      next(error);
    }
  }

  async register(req, res, next) {
    try {
      const { email, phone, password } = req.body;
      const User = await getUserModel();

      const query = email ? { email } : { phone };
      if(!email && !phone) return res.status(400).json({message: 'Email or phone is required'});
      
      const existingUser = await User.findOne(query);

      if (existingUser) {
        return res.status(400).json({
          message: 'User with this email or phone number already exists.',
        });
      }

      const newUser = new User({ email, phone, password });
      await newUser.save();

      res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, phone, password, otp } = req.body;
      const User = await getUserModel();
      let user;

      if (email) {
        user = await User.findOne({ email });
      } else if (phone) {
        user = await User.findOne({ phone });
      }

      if (!user) {
        return res
          .status(401)
          .json({ message: 'Invalid credentials or user not found.' });
      }

      if (password) {
        if (!(await user.comparePassword(password))) {
          return res.status(401).json({ message: 'Invalid password.' });
        }
      } else if (otp) {
        if (!(await user.compareOtp(otp))) {
          return res.status(401).json({ message: 'Invalid or expired OTP.' });
        }
        user.otp = undefined;
        user.otpExpires = undefined;
      } else {
        return res.status(400).json({ message: 'Password or OTP is required.' });
      }

      const accessToken = jwt.sign(
        { id: user._id, email: user.email, phone: user.phone },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: \`\${process.env.REFRESH_TOKEN_EXPIRY_DAYS || 7}d\` }
      );

      user.refreshToken = refreshToken;
      await user.save();

      res.json({
        message: 'Login successful!',
        accessToken,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if(!refreshToken) return res.status(400).json({message: 'Refresh token is required'});
      
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const User = await getUserModel();
      const user = await User.findById(decoded.id);

      if (!user || !(await user.compareRefreshToken(refreshToken))) {
        return res
          .status(401)
          .json({ message: 'Invalid refresh token. Please log in again.' });
      }
      
      if (user.refreshTokenExpires && user.refreshTokenExpires < Date.now()) {
        return res
          .status(401)
          .json({ message: 'Refresh token expired. Please log in again.' });
      }

      const newAccessToken = jwt.sign(
        { id: user._id, email: user.email, phone: user.phone },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const newRefreshToken = jwt.sign(
        { id: user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: \`\${process.env.REFRESH_TOKEN_EXPIRY_DAYS || 7}d\` }
      );
      
      user.refreshToken = newRefreshToken;
      user.refreshTokenExpires = new Date(Date.now() + parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || 7) * 24 * 60 * 60 * 1000);
      await user.save();

      res.json({
        message: 'Tokens refreshed successfully!',
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { email, phone } = req.body;
      const User = await getUserModel();
      let user;

      if (email) {
        user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found with this email.' });
      } else if (phone) {
        user = await User.findOne({ phone });
        if (!user) return res.status(404).json({ message: 'User not found with this phone number.' });
      } else {
        return res.status(400).json({ message: 'Email or phone number is required.' });
      }

      const otp = generateOtp();
      user.otp = otp;
      user.otpExpires = new Date(Date.now() + parseInt(process.env.OTP_EXPIRY_MINUTES || '10') * 60000);
      await user.save();
      
      await sendOtpMessage(email ? 'email' : 'phone', email || phone, otp);

      res.json({
        message: 'OTP sent for password reset. Please use it to reset your password.',
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { email, phone, otp, newPassword } = req.body;
      const User = await getUserModel();
      let user;

      if (email) {
        user = await User.findOne({ email });
      } else if (phone) {
        user = await User.findOne({ phone });
      }

      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      if (!(await user.compareOtp(otp))) {
        return res.status(401).json({ message: 'Invalid or expired OTP.' });
      }

      user.password = newPassword;
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();

      res.json({ message: 'Password has been reset successfully.' });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const User = await getUserModel();
      const user = await User.findById(req.user.id).select(
        '-password -otp -otpExpires -refreshToken -refreshTokenExpires'
      );
      if (!user) {
        return res.status(404).json({ message: 'User profile not found.' });
      }
      res.json({ message: 'Profile data', user });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
`;
}

function getPrismaAuthControllerTemplate() {
  return `const { prisma } = require('../../config/database');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const bcrypt = require('bcryptjs');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVICE_HOST || 'smtp.example.com',
    port: parseInt(process.env.EMAIL_SERVICE_PORT || '587'),
    secure: process.env.EMAIL_SERVICE_PORT === '465',
    auth: {
        user: process.env.EMAIL_SERVICE_USER || 'user@example.com',
        pass: process.env.EMAIL_SERVICE_PASS || 'password',
    },
});

const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID || 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    process.env.TWILIO_AUTH_TOKEN || 'your_auth_token_here'
);

const generateOtp = () => {
    const otpLength = parseInt(process.env.OTP_LENGTH || '6');
    return Math.floor(Math.pow(10, otpLength - 1) + Math.random() * 9 * Math.pow(10, otpLength - 1)).toString();
};

const sendOtpMessage = async (type, recipient, otp) => {
  if (type === 'email') {
    try {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL || 'no-reply@codingexpress.com',
        to: recipient,
        subject: 'Your Coding express App OTP',
        text: \`Your OTP for Coding express App is: \${otp}. It is valid for \${ process.env.OTP_EXPIRY_MINUTES || "10 minutes" }.\`,
        html: \`<p>Your OTP for Coding express App is: <strong>\${otp}</strong>. It is valid for \${process.env.OTP_EXPIRY_MINUTES || "10 minutes"}.</p>\`,
      });
      console.log(\`Email OTP sent to \${recipient}\`);
    } catch (error) {
      console.error('Error sending email OTP:', error);
      throw new Error('Failed to send email OTP.');
    }
  } else if (type === 'phone') {
    try {
        if(process.env.TWILIO_ACCOUNT_SID !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
            await twilioClient.messages.create({
                body: \`Your Coding express App OTP is: \${otp}\`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: recipient
            });
        }
      console.log(\`SMS OTP sent to \${recipient}\`);
    } catch (error) {
      console.error('Error sending SMS OTP:', error);
      throw new Error('Failed to send SMS OTP.');
    }
  }
};

class AuthController {
    async sendOtp(req, res, next) {
        try {
            const { email, phone } = req.body;
            const otp = generateOtp();
            const hashedOtp = await bcrypt.hash(otp, 10);
            const otpExpires = new Date(Date.now() + parseInt(process.env.OTP_EXPIRY_MINUTES || '10') * 60000);
            
            let whereClause = email ? { email } : { phone };
            if(!email && !phone) return res.status(400).json({ message: 'Email or phone number is required.'});

            await prisma.user.upsert({
                where: whereClause,
                update: { otp: hashedOtp, otpExpires },
                create: { ...whereClause, otp: hashedOtp, otpExpires }
            });
            
            await sendOtpMessage(email ? 'email' : 'phone', email || phone, otp);
            res.json({ message: \`OTP sent to your \${email ? 'email' : 'phone'}.\` });
        } catch (error) {
            next(error);
        }
    }

    async register(req, res, next) {
        try {
            const { email, phone, password } = req.body;
            if(!password) return res.status(400).json({message: 'Password is required'});
            
            const hashedPassword = await bcrypt.hash(password, 10);
            
            const createData = {
                password: hashedPassword,
                ...(email && { email }),
                ...(phone && { phone }),
            };
            if(!email && !phone) return res.status(400).json({message: 'Email or phone is required'});

            await prisma.user.create({ data: createData });
            res.status(201).json({ message: 'User registered successfully!' });
        } catch (error) {
            next(error);
        }
    }

    async login(req, res, next) {
        try {
            const { email, phone, password, otp } = req.body;
            let whereClause = email ? { email } : { phone };
            const user = await prisma.user.findUnique({ where: whereClause });

            if (!user) {
                return res.status(401).json({ message: 'Invalid credentials or user not found.' });
            }

            if (password) {
                if (!user.password || !(await bcrypt.compare(password, user.password))) {
                    return res.status(401).json({ message: 'Invalid password.' });
                }
            } else if (otp) {
                if (!user.otp || !user.otpExpires || user.otpExpires < new Date() || !(await bcrypt.compare(otp, user.otp))) {
                    return res.status(401).json({ message: 'Invalid or expired OTP.' });
                }
                await prisma.user.update({ where: whereClause, data: { otp: null, otpExpires: null } });
            } else {
                 return res.status(400).json({ message: 'Password or OTP is required.' });
            }

            const accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            const refreshTokenValue = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: \`\${process.env.REFRESH_TOKEN_EXPIRY_DAYS || 7}d\` });
            const hashedRefreshToken = await bcrypt.hash(refreshTokenValue, 10);
            const refreshTokenExpires = new Date(Date.now() + parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || 7) * 24 * 60 * 60 * 1000);


            await prisma.user.update({
                where: whereClause,
                data: { refreshToken: hashedRefreshToken, refreshTokenExpires }
            });

            res.json({ message: 'Login successful!', accessToken, refreshToken: refreshTokenValue });
        } catch (error) {
            next(error);
        }
    }

    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            if(!refreshToken) return res.status(400).json({message: 'Refresh token is required'});

            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            const user = await prisma.user.findUnique({ where: { id: decoded.id } });

            if (!user || !user.refreshToken || !(await bcrypt.compare(refreshToken, user.refreshToken))) {
                return res.status(401).json({ message: 'Invalid refresh token. Please log in again.' });
            }

            if (user.refreshTokenExpires && user.refreshTokenExpires < new Date()) {
                return res.status(401).json({ message: 'Refresh token expired. Please log in again.' });
            }

            const newAccessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            const newRefreshTokenValue = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: \`\${process.env.REFRESH_TOKEN_EXPIRY_DAYS || 7}d\` });
            const newHashedRefreshToken = await bcrypt.hash(newRefreshTokenValue, 10);
            const newRefreshTokenExpires = new Date(Date.now() + parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || 7) * 24 * 60 * 60 * 1000);

            await prisma.user.update({
                where: { id: user.id },
                data: { 
                    refreshToken: newHashedRefreshToken,
                    refreshTokenExpires: newRefreshTokenExpires
                }
            });

            res.json({
                message: 'Tokens refreshed successfully!',
                accessToken: newAccessToken,
                refreshToken: newRefreshTokenValue,
            });
        } catch (error) {
            next(error);
        }
    }
    
    async forgotPassword(req, res, next) {
        try {
            const { email, phone } = req.body;
            let whereClause = email ? { email } : { phone };
            if(!email && !phone) return res.status(400).json({ message: 'Email or phone is required' });

            const user = await prisma.user.findUnique({ where: whereClause });
            if (!user) return res.status(404).json({ message: 'User not found.' });
            
            const otp = generateOtp();
            const hashedOtp = await bcrypt.hash(otp, 10);
            const otpExpires = new Date(Date.now() + parseInt(process.env.OTP_EXPIRY_MINUTES || '10') * 60000);
            
            await prisma.user.update({
                where: whereClause,
                data: { otp: hashedOtp, otpExpires }
            });

            await sendOtpMessage(email ? 'email' : 'phone', email || phone, otp);

            res.json({ message: 'OTP sent for password reset.' });
        } catch (error) {
            next(error);
        }
    }

    async resetPassword(req, res, next) {
        try {
            const { email, phone, otp, newPassword } = req.body;
            let whereClause = email ? { email } : { phone };
            if(!email && !phone) return res.status(400).json({ message: 'Email or phone is required' });
            
            const user = await prisma.user.findUnique({ where: whereClause });

            if (!user) return res.status(404).json({ message: 'User not found.' });

            if (!user.otp || !user.otpExpires || user.otpExpires < new Date() || !(await bcrypt.compare(otp, user.otp))) {
                return res.status(401).json({ message: 'Invalid or expired OTP.' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);

            await prisma.user.update({
                where: whereClause,
                data: {
                    password: hashedPassword,
                    otp: null,
                    otpExpires: null
                }
            });

            res.json({ message: 'Password has been reset successfully.' });
        } catch (error) {
            next(error);
        }
    }

    async getProfile(req, res, next) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                select: { id: true, email: true, phone: true, createdAt: true, updatedAt: true }
            });
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }
            res.json({ message: 'Profile data', user });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthController();
`;
}

function getAuthRoutesTemplate() {
  return `const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');
const authMiddleware = require('../middleware/authMiddleware');
const authValidator = require('../validators/authValidator');

router.post('/register', authValidator.register, authController.register);
router.post('/send-otp', authValidator.sendOtp, authController.sendOtp);
router.post('/login', authValidator.login, authController.login);
router.post('/refresh-token', authValidator.refreshToken, authController.refreshToken);
router.post('/forgot-password', authValidator.forgotPassword, authController.forgotPassword);
router.post('/reset-password', authValidator.resetPassword, authController.resetPassword);
router.get('/profile', authMiddleware, authController.getProfile);

module.exports = router;
`;
}

function getAuthMiddlewareTemplate() {
  return `const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Adds { id: ... } to the request object
    next();
  } catch (ex) {
    res.status(400).json({ message: 'Invalid token.' });
  }
}

module.exports = authMiddleware;
`;
}

function getAuthValidatorTemplate() {
  return `const { body } = require('express-validator');

const authValidator = {
  register: [
    body('email').optional().isEmail().withMessage('Invalid email format').normalizeEmail(),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number format'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body().custom((value, { req }) => {
      if (!req.body.email && !req.body.phone) {
        throw new Error('Email or phone number is required');
      }
      return true;
    }),
  ],
  sendOtp: [
    body('email').optional().isEmail().withMessage('Invalid email format').normalizeEmail(),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number format'),
    body().custom((value, { req }) => {
      if (!req.body.email && !req.body.phone) {
        throw new Error('Email or phone number is required');
      }
      return true;
    }),
  ],
  login: [
    body('email').optional().isEmail().withMessage('Invalid email format').normalizeEmail(),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number format'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('otp').optional().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    body().custom((value, { req }) => {
      if (!req.body.email && !req.body.phone) {
        throw new Error('Email or phone number is required');
      }
       if (!req.body.password && !req.body.otp) {
        throw new Error('Password or OTP is required');
      }
      return true;
    }),
  ],
  refreshToken: [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  ],
  forgotPassword: [
    body('email').optional().isEmail().withMessage('Invalid email format').normalizeEmail(),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number format'),
     body().custom((value, { req }) => {
      if (!req.body.email && !req.body.phone) {
        throw new Error('Email or phone number is required');
      }
      return true;
    }),
  ],
  resetPassword: [
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
    body('otp').isLength({min: 6, max: 6}).withMessage('OTP must be 6 digits'),
    body().custom((value, { req }) => {
      if (!req.body.email && !req.body.phone) {
        throw new Error('Email or phone number is required');
      }
      return true;
    }),
  ],
};

module.exports = authValidator;
`;
}

function getPostmanCollectionTemplate(appName) {
  return JSON.stringify(
    {
      info: {
        _postman_id: "{{$guid}}",
        name: `${appName} API Collection`,
        schema:
          "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [
        {
          name: "Authentication",
          item: [
            { name: "Register User", request: {} },
            { name: "Send OTP", request: {} },
            { name: "Login", request: {} },
            { name: "Refresh Token", request: {} },
            { name: "Forgot Password", request: {} },
            { name: "Reset Password", request: {} },
            { name: "Get Profile", request: {} },
          ],
        },
        {
          name: "Products (Sample Resource)",
          item: [
            { name: "Get All Products", request: {} },
            { name: "Create Product", request: {} },
            { name: "Get Product by ID", request: {} },
            { name: "Update Product", request: {} },
            { name: "Delete Product", request: {} },
          ],
        },
      ],
      variable: [
        { key: "baseUrl", value: "http://localhost:3000" },
        { key: "accessToken", value: "" },
        { key: "refreshToken", value: "" },
      ],
    },
    null,
    2
  );
}

function displayHelp() {
  console.log(`
Coding express CLI - A Laravel-like tool for Express.js

Usage:
    codingexpress init
    codingexpress <command> [names...] [options]

Available Commands:
    init                           Initializes a new project by asking for the name and ORM.

    make:resource <Name...>        Creates a model, validator, controller, and route.
                                   (Run inside a project directory)
    
    // ... other make commands

Options:
    --orm=<orm_name>               (For make commands) Specify the ORM ('mongoose' or 'prisma').
    --connection=<name>            (Mongoose only) Specifies the database connection.
  `);
}
