#!/usr/bin/env node

// Expresso CLI - A simple, Laravel-like scaffolding tool for Express.js
// Usage:
// 1. Install globally: npm install -g . (after setting up package.json)
// 2. Initialize project: codingexpress init
// 3. Create a controller: codingexpress make:controller ProductController

const fs = require("fs");
const path = require("path");
const { EOL } = require("os"); // End of Line character
const { execSync } = require("child_process"); // To run shell commands

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

switch (action) {
  case "init":
    console.log("🚀 Initializing new Express project...");
    initProject();
    break;

  case "make":
    const type = feature; // e.g., 'controller', 'model'
    const name = args[1];
    if (!type || !name) {
      console.error(
        "Error: Please provide the type (controller, model, route) and a name."
      );
      displayHelp();
      process.exit(1);
    }

    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, "");
    if (!sanitizedName) {
      console.error("Error: The provided name is invalid.");
      process.exit(1);
    }

    const options = parseArgs(args.slice(2));

    switch (type) {
      case "controller":
        createController(sanitizedName);
        break;
      case "model":
        const connectionName = options.connection || "default";
        createModel(sanitizedName, connectionName);
        break;
      case "route":
        createRouteFile(sanitizedName);
        break;
      default:
        console.error(`Error: Unknown type '${type}' for make command.`);
        displayHelp();
        break;
    }
    break;

  default:
    console.error(`Error: Unknown command '${command}'.`);
    displayHelp();
    break;
}

// --- Argument Parser ---

function parseArgs(args) {
  const options = {};
  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.substring(2).split("=");
      options[key] = value || true;
    }
  }
  return options;
}

// --- Generator Functions ---

function initProject() {
  console.log("Setting up directories...");
  const directories = [
    "app/controllers",
    "app/models",
    "app/routes",
    "app/middleware",
    "app/validators",
    "config",
    "public",
    ".vscode",
  ];
  directories.forEach((dir) => fs.mkdirSync(dir, { recursive: true }));
  console.log("Directories created.");

  console.log("Creating core files...");
  const appName = path.basename(process.cwd());
  createFile("package.json", getPackageJsonTemplate(appName));
  createFile("server.js", getServerTemplate());
  createFile("app/routes/index.js", getMainRouteTemplateWithAuth());
  createFile("app/middleware/errorHandler.js", getErrorHandlerTemplate());
  createFile(".env", getEnvTemplate());
  createFile(".gitignore", getGitignoreTemplate());
  createFile("config/database.js", getDatabaseConfigTemplate());
  createFile(".prettierrc", getPrettierConfigTemplate());
  createFile(".prettierignore", getPrettierIgnoreTemplate());
  createFile(".vscode/settings.json", getVSCodeSettingsTemplate());
  createFile(
    `${appName}.postman_collection.json`,
    getPostmanCollectionTemplate(appName)
  );

  console.log("Core files created.");

  scaffoldAuth();

  installDependencies();

  startDevServer();
}

function installDependencies() {
  console.log("📦 Installing dependencies... This might take a moment.");
  try {
    execSync("npm install", { stdio: "inherit" });
    console.log("✅ Dependencies installed successfully.");
    console.log("\n⚠️ Checking for vulnerabilities...");
    try {
      execSync("npm audit", { stdio: "inherit" });
    } catch (auditError) {
      console.log(
        "\n⚠️ Vulnerabilities found. Run `npm audit fix` to address them, or `npm audit fix --force` for breaking changes if necessary."
      );
    }
  } catch (error) {
    console.error(
      "❌ Failed to install dependencies. Please run `npm install` manually."
    );
    process.exit(1);
  }
}

function startDevServer() {
  console.log("✅ Project initialized successfully!");
  console.log("\n---");
  console.log("Your project is ready! Starting the development server now...");
  console.log("➡️   Application URL: http://localhost:3000/");
  console.log(
    "💡 A Postman collection has been created for you. Import the .json file into Postman to start testing."
  );
  console.log(
    '💡 Prettier is set up for code formatting. For VS Code, "Format On Save" is enabled by default. For other editors, enable "format on save" or run `npx prettier --write .` manually.'
  );
  console.log(
    "⚠️ If vulnerabilities were reported during installation, run `npm audit fix` to resolve them."
  );
  console.log("---");
  console.log("Press CTRL+C to stop the server.");

  try {
    execSync("npm run dev", { stdio: "inherit" });
  } catch (error) {
    console.error("❌ Failed to start the development server.");
  }
}

function scaffoldAuth() {
  console.log("🔒 Scaffolding authentication...");

  createFile("app/models/User.js", getAuthUserModelTemplate());
  createFile("app/controllers/AuthController.js", getAuthControllerTemplate());
  createFile("app/routes/authRoutes.js", getAuthRoutesTemplate());
  createFile("app/middleware/authMiddleware.js", getAuthMiddlewareTemplate());
  createFile("app/validators/authValidator.js", getAuthValidatorTemplate());

  const envPath = ".env";
  fs.appendFileSync(
    envPath,
    `${EOL}# Secret key for JWT authentication${EOL}JWT_SECRET=your-super-secret-key${EOL}`
  );
  fs.appendFileSync(
    envPath,
    `${EOL}# Secret key for JWT Refresh Token authentication${EOL}JWT_REFRESH_SECRET=your-refresh-super-secret-key${EOL}`
  );
  fs.appendFileSync(
    envPath,
    `${EOL}# Refresh Token Expiry (in days)${EOL}REFRESH_TOKEN_EXPIRY_DAYS=7${EOL}`
  );
  fs.appendFileSync(
    envPath,
    `${EOL}# OTP Settings${EOL}OTP_LENGTH=6${EOL}OTP_EXPIRY_MINUTES=10${EOL}`
  );
  fs.appendFileSync(
    envPath,
    `${EOL}# Email Service (e.g., Nodemailer) - Placeholder Values${EOL}EMAIL_SERVICE_HOST=smtp.your-email-provider.com${EOL}EMAIL_SERVICE_PORT=587${EOL}EMAIL_SERVICE_USER=your-email@example.com${EOL}EMAIL_SERVICE_PASS=your-email-password${EOL}FROM_EMAIL=no-reply@example.com${EOL}`
  );
  fs.appendFileSync(
    envPath,
    `${EOL}# SMS Service (e.g., Twilio) - Placeholder Values${EOL}TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx${EOL}TWILIO_AUTH_TOKEN=your_auth_token_here${EOL}TWILIO_PHONE_NUMBER=+15017122661${EOL}`
  );
  fs.appendFileSync(
    envPath,
    `${EOL}# CORS Configuration${EOL}CORS_ORIGIN=*${EOL}`
  );

  console.log(
    "Updated file: .env (added JWT_SECRET, JWT_REFRESH_SECRET, REFRESH_TOKEN_EXPIRY_DAYS, OTP, Email/SMS, and CORS settings)"
  );
}

function createFile(filePath, content) {
  if (fs.existsSync(filePath)) {
    console.log(`Skipped: ${filePath} (already exists)`);
    return;
  }
  fs.writeFileSync(filePath, content);
  console.log(`Created file: ${filePath}`);
}

function createController(name) {
  const modelName = name.replace("Controller", "");
  createFile(
    `app/controllers/${name}Controller.js`,
    getControllerTemplate(name, modelName)
  );
  createFile(
    `app/validators/${modelName}Validator.js`,
    getValidatorTemplate(modelName)
  );
  console.log(
    `💡 Validator created at app/validators/${modelName}Validator.js. Update validation rules as needed.`
  );
}

function createModel(name, connectionName) {
  createFile(`app/models/${name}.js`, getModelTemplate(name, connectionName));
  console.log(`✅ Model created for connection '${connectionName}'`);
}

function createRouteFile(name) {
  const controllerName = `${
    name.charAt(0).toUpperCase() + name.slice(1)
  }Controller`;
  createFile(
    `app/routes/${name}Routes.js`,
    getRouteTemplate(name, controllerName)
  );
  console.log(
    `💡 Remember to import and use the new route file in 'app/routes/index.js' and implement the logic in '${controllerName}.js'.`
  );
}

// --- Template Generators ---

function getPackageJsonTemplate(appName) {
  return JSON.stringify(
    {
      name: appName.toLowerCase().replace(/\s+/g, "-"),
      version: "1.0.0",
      description: "A new web application powered by Expresso CLI",
      main: "server.js",
      scripts: {
        start: "node server.js",
        dev: "nodemon server.js",
        format: "prettier --write .",
      },
      dependencies: {
        bcryptjs: "^2.4.3",
        cors: "^2.8.5",
        dotenv: "^16.4.5",
        express: "^4.19.2",
        "express-validator": "^7.2.0",
        jsonwebtoken: "^9.0.2",
        mongoose: "^8.7.0",
        nodemailer: "^6.9.15",
        twilio: "^5.3.3",
      },
      devDependencies: {
        nodemon: "^3.1.7",
        prettier: "^3.3.3",
      },
      keywords: [],
      author: "",
      license: "ISC",
    },
    null,
    2
  );
}

function getServerTemplate() {
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

db.connect().catch((err) => {
  console.error('❌ Failed to connect to the database on startup.', err);
  process.exit(1);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const mainRouter = require('./app/routes/index');
app.use('/api', mainRouter);

app.use(errorHandler);

app.get('/', (req, res) => {
  res.send('<h1>Welcome to your Expresso App!</h1>');
});

app.listen(PORT, () => {
  console.log(\`🚀 Server is running on http://localhost:\${PORT}\`);
});
`;
}

function getErrorHandlerTemplate() {
  return `const { validationResult } = require('express-validator');

function errorHandler(err, req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: 'Validation failed', errors: messages });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res
      .status(400)
      .json({ message: \`Duplicate value for \${field}: \${err.keyValue[field]}\` });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired', expiredAt: err.expiredAt });
  }

  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
}

module.exports = errorHandler;
`;
}

function getDatabaseConfigTemplate() {
  return `const mongoose = require('mongoose');

const connectionsConfig = {
  default: {
    uri: process.env.DB_URI_DEFAULT || 'mongodb://localhost:27017/expresso_db',
  },
  secondary: {
    uri:
      process.env.DB_URI_SECONDARY ||
      'mongodb://localhost:27017/expresso_secondary_db',
  },
  tertiary: {
    uri:
      process.env.DB_URI_TERTIARY ||
      'mongodb://localhost:27017/expresso_tertiary_db',
  },
};

const activeConnections = {};

async function connect(name = 'default') {
  if (!connectionsConfig[name]) {
    throw new Error(
      \`Database connection "\${name}" is not defined in config/database.js\`
    );
  }
  if (activeConnections[name]) {
    return activeConnections[name];
  }
  console.log(\`🔌 Connecting to database: \${name}...\`);
  const connection = mongoose.createConnection(connectionsConfig[name].uri);
  connection.on('connected', () => {
    console.log(\`✅ Database \${name} connected.\`);
  });
  connection.on('error', (err) => {
    console.error(\`❌ MongoDB connection error for \${name}: \`, err);
  });
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

function getEnvTemplate() {
  return `PORT=3000

# MongoDB Connection Strings
DB_URI_DEFAULT=mongodb://127.0.0.1:27017/main_database
DB_URI_SECONDARY=mongodb://127.0.0.1:27017/secondary_database
DB_URI_TERTIARY=mongodb://127.0.0.1:27017/tertiary_database
`;
}

function getGitignoreTemplate() {
  return `node_modules
.env
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
      useTabs: false,
      bracketSpacing: true,
      arrowParens: "avoid",
    },
    null,
    2
  );
}

function getPrettierIgnoreTemplate() {
  return `node_modules
dist
build
coverage
.env
*.min.js
package-lock.json
`;
}

function getVSCodeSettingsTemplate() {
  return JSON.stringify(
    {
      "editor.defaultFormatter": "esbenp.prettier-vscode",
      "editor.formatOnSave": true,
      "[javascript]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "editor.formatOnSave": true,
      },
      "[json]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "editor.formatOnSave": true,
      },
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
  res.json({ message: 'Welcome to the Expresso API root!' });
});

router.use('/auth', authRoutes);

module.exports = router;
`;
}

function getControllerTemplate(name, modelName) {
  return `// Controller for ${name}
const getModel = require('../models/${modelName}');

class ${name} {
  /**
   * Display a listing of the resource with pagination.
   */
  async index(req, res, next) {
    try {
      const Model = await getModel();
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      if (page < 1 || limit < 1) {
        return res.status(400).json({ message: 'Page and limit must be positive integers' });
      }

      const items = await Model.find()
        .skip(skip)
        .limit(limit)
        .lean();
      const totalItems = await Model.countDocuments();
      const totalPages = Math.ceil(totalItems / limit);

      res.status(200).json({
        message: '${modelName} list retrieved successfully',
        data: items,
        pagination: {
          totalItems,
          totalPages,
          currentPage: page,
          itemsPerPage: limit,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Store a newly created resource in storage.
   */
  async store(req, res, next) {
    try {
      const Model = await getModel();
      const item = new Model(req.body);
      await item.save();
      res.status(201).json({ message: '${modelName} created successfully', data: item });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Display the specified resource.
   */
  async show(req, res, next) {
    try {
      const { id } = req.params;
      const Model = await getModel();
      const item = await Model.findById(id).lean();
      if (!item) {
        return res.status(404).json({ message: '${modelName} not found' });
      }
      res.status(200).json({ message: '${modelName} retrieved successfully', data: item });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update the specified resource in storage.
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const Model = await getModel();
      const item = await Model.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!item) {
        return res.status(404).json({ message: '${modelName} not found' });
      }
      res.status(200).json({ message: '${modelName} updated successfully', data: item });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove the specified resource from storage.
   */
  async destroy(req, res, next) {
    try {
      const { id } = req.params;
      const Model = await getModel();
      const item = await Model.findByIdAndDelete(id);
      if (!item) {
        return res.status(404).json({ message: '${modelName} not found' });
      }
      res.status(200).json({ message: '${modelName} deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ${name}();
`;
}

function getValidatorTemplate(modelName) {
  return `const { body } = require('express-validator');

const ${modelName.toLowerCase()}Validator = {
  store: [
    body('name')
      .notEmpty()
      .withMessage('Name is required')
      .isString()
      .withMessage('Name must be a string')
      .trim(),
  ],
  update: [
    body('name')
      .optional()
      .isString()
      .withMessage('Name must be a string')
      .trim(),
  ],
};

module.exports = ${modelName.toLowerCase()}Validator;
`;
}

function getModelTemplate(name, conn) {
  return `const mongoose = require('mongoose');
const { Schema } = mongoose;
const { getConnection } = require('../../config/database');

const ${name.toLowerCase()}Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const getModel = async () => {
  const conn = await getConnection('${conn}');
  return conn.model('${name}', ${name.toLowerCase()}Schema);
};

module.exports = getModel;
`;
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

function getAuthUserModelTemplate() {
  return `const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcryptjs');
const { getConnection } = require('../../config/database');

const UserSchema = new Schema(
  {
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      sparse: true,
    },
    phone: {
      type: String,
      unique: true,
      trim: true,
      sparse: true,
    },
    password: {
      type: String,
      minlength: 6,
    },
    otp: {
      type: String,
    },
    otpExpires: {
      type: Date,
    },
    refreshToken: {
      type: String,
      required: false,
    },
    refreshTokenExpires: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  if (this.isModified('otp') && this.otp && this.otp.length < 10) {
    const salt = await bcrypt.genSalt(10);
    this.otp = await bcrypt.hash(this.otp, salt);
  }
  if (this.isModified('refreshToken') && this.refreshToken && this.refreshToken.length < 100) {
    const salt = await bcrypt.genSalt(10);
    this.refreshToken = await bcrypt.hash(this.refreshToken, salt);
  }
  next();
});

UserSchema.methods.comparePassword = function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.compareOtp = function (candidateOtp) {
  if (!this.otp || !this.otpExpires || this.otpExpires < Date.now()) {
    return false;
  }
  return bcrypt.compare(candidateOtp, this.otp);
};

UserSchema.methods.compareRefreshToken = function (candidateRefreshToken) {
  if (!this.refreshToken) return false;
  return bcrypt.compare(candidateRefreshToken, this.refreshToken);
};

const getModel = async () => {
  const conn = await getConnection('default');
  return conn.model('User', UserSchema);
};

module.exports = getModel;
`;
}

function getAuthControllerTemplate() {
  return `const getUserModel = require('../models/User');
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
        from: process.env.FROM_EMAIL || 'no-reply@expresso.com',
        to: recipient,
        subject: 'Your Expresso App OTP',
        text: \`Your OTP for Expresso App is: \\\`\${otp}\\\`. It is valid for \${ process.env.OTP_EXPIRY_MINUTES || "10 minutes" }.\`,
        html: \`<p>Your OTP for Expresso App is: <strong>\${otp}</strong>. It is valid for \${process.env.OTP_EXPIRY_MINUTES || "10 minutes"}.</p>\`,
      });
      console.log(\`Email OTP sent to \${recipient}\`);
    } catch (error) {
      console.error('Error sending email OTP:', error);
      throw new Error('Failed to send email OTP.');
    }
  } else if (type === 'phone') {
    try {
      console.log(
        \`SMS OTP sent to \${recipient} (Twilio integration is a placeholder and needs configuration).\`
      );
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
        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();
        await sendOtpMessage('email', email, otp);
        return res.json({ message: 'OTP sent to your email.' });
      } else if (phone) {
        user = await User.findOne({ phone });
        if (!user) {
          user = new User({ phone });
        }
        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();
        await sendOtpMessage('phone', phone, otp);
        return res.json({ message: 'OTP sent to your phone.' });
      }
    } catch (error) {
      next(error);
    }
  }

  async register(req, res, next) {
    try {
      const { email, phone, password } = req.body;
      const User = await getUserModel();

      let existingUser;
      if (email) {
        existingUser = await User.findOne({ email });
      } else if (phone) {
        existingUser = await User.findOne({ phone });
      }

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
      }

      const accessToken = jwt.sign(
        { id: user._id, email: user.email, phone: user.phone },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY_DAYS || '7d' }
      );

      user.refreshToken = refreshToken;
      user.refreshTokenExpires = new Date(
        Date.now() +
          parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || 7) *
            24 *
            60 *
            60 *
            1000
      );
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
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const User = await getUserModel();
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      if (!(await user.compareRefreshToken(refreshToken))) {
        user.refreshToken = undefined;
        user.refreshTokenExpires = undefined;
        await user.save();
        return res
          .status(401)
          .json({ message: 'Invalid refresh token. Please log in again.' });
      }

      if (user.refreshTokenExpires && user.refreshTokenExpires < Date.now()) {
        user.refreshToken = undefined;
        user.refreshTokenExpires = undefined;
        await user.save();
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
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY_DAYS || '7d' }
      );

      user.refreshToken = newRefreshToken;
      user.refreshTokenExpires = new Date(
        Date.now() +
          parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || 7) *
            24 *
            60 *
            60 *
            1000
      );
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
      const otp = generateOtp();
      const otpExpires = new Date(
        Date.now() +
          parseInt(process.env.OTP_EXPIRY_MINUTES || '10') * 60 * 1000
      );

      if (email) {
        user = await User.findOne({ email });
        if (!user)
          return res
            .status(404)
            .json({ message: 'User not found with this email.' });
        await sendOtpMessage('email', email, otp);
      } else if (phone) {
        user = await User.findOne({ phone });
        if (!user)
          return res
            .status(404)
            .json({ message: 'User not found with this phone number.' });
        await sendOtpMessage('phone', phone, otp);
      }

      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();

      res.json({
        message:
          'OTP sent for password reset. Please use it to reset your password.',
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

function getAuthValidatorTemplate() {
  return `const { body } = require('express-validator');

const authValidator = {
  register: [
    body('email')
      .optional()
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Invalid phone number format'),
    body('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body()
      .custom((value, { req }) => {
        if (!req.body.email && !req.body.phone) {
          throw new Error('Email or phone number is required');
        }
        if (!req.body.password && (!req.body.email || !req.body.phone)) {
          throw new Error('Password is required when registering with email or phone');
        }
        return true;
      }),
  ],
  sendOtp: [
    body('email')
      .optional()
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Invalid phone number format'),
    body()
      .custom((value, { req }) => {
        if (!req.body.email && !req.body.phone) {
          throw new Error('Email or phone number is required');
        }
        return true;
      }),
  ],
  login: [
    body('email')
      .optional()
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Invalid phone number format'),
    body('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('otp')
      .optional()
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits'),
    body()
      .custom((value, { req }) => {
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
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required'),
  ],
  forgotPassword: [
    body('email')
      .optional()
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Invalid phone number format'),
    body()
      .custom((value, { req }) => {
        if (!req.body.email && !req.body.phone) {
          throw new Error('Email or phone number is required');
        }
        return true;
      }),
  ],
  resetPassword: [
    body('email')
      .optional()
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Invalid phone number format'),
    body('otp')
      .notEmpty()
      .withMessage('OTP is required')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits'),
    body('newPassword')
      .notEmpty()
      .withMessage('New password is required')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long'),
    body()
      .custom((value, { req }) => {
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
  if (!authHeader) {
    return res
      .status(401)
      .json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7, authHeader.length)
    : null;
  if (!token) {
    return res
      .status(401)
      .json({ message: 'Access denied. Malformed token.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (ex) {
    next(ex);
  }
}

module.exports = authMiddleware;
`;
}

function getPostmanCollectionTemplate(appName) {
  const collection = {
    info: {
      _postman_id: "{{$guid}}",
      name: appName,
      schema:
        "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      _exporter_id: "2",
    },
    item: [
      {
        name: "Authentication",
        item: [
          {
            name: "Register New User (Email & Password)",
            request: {
              method: "POST",
              header: [{ key: "Content-Type", value: "application/json" }],
              body: {
                mode: "raw",
                raw: JSON.stringify(
                  { email: "newuser@example.com", password: "password123" },
                  null,
                  2
                ),
              },
              url: {
                raw: "{{baseUrl}}/api/auth/register",
                host: ["{{baseUrl}}"],
                path: ["api", "auth", "register"],
              },
            },
            response: [],
          },
          {
            name: "Register New User (Phone Only)",
            request: {
              method: "POST",
              header: [{ key: "Content-Type", value: "application/json" }],
              body: {
                mode: "raw",
                raw: JSON.stringify(
                  { phone: "+1234567890", password: "password123" },
                  null,
                  2
                ),
              },
              url: {
                raw: "{{baseUrl}}/api/auth/register",
                host: ["{{baseUrl}}"],
                path: ["api", "auth", "register"],
              },
            },
            response: [],
          },
          {
            name: "Send OTP (to Email)",
            request: {
              method: "POST",
              header: [{ key: "Content-Type", value: "application/json" }],
              body: {
                mode: "raw",
                raw: JSON.stringify({ email: "user@example.com" }, null, 2),
              },
              url: {
                raw: "{{baseUrl}}/api/auth/send-otp",
                host: ["{{baseUrl}}"],
                path: ["api", "auth", "send-otp"],
              },
            },
            response: [],
          },
          {
            name: "Send OTP (to Phone)",
            request: {
              method: "POST",
              header: [{ key: "Content-Type", value: "application/json" }],
              body: {
                mode: "raw",
                raw: JSON.stringify({ phone: "+1234567890" }, null, 2),
              },
              url: {
                raw: "{{baseUrl}}/api/auth/send-otp",
                host: ["{{baseUrl}}"],
                path: ["api", "auth", "send-otp"],
              },
            },
            response: [],
          },
          {
            name: "Login User (with Password)",
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    `try {`,
                    `  var jsonData = pm.response.json();`,
                    `  if (jsonData.accessToken) {`,
                    `    pm.environment.set("accessToken", jsonData.accessToken);`,
                    `  }`,
                    `  if (jsonData.refreshToken) {`,
                    `    pm.environment.set("refreshToken", jsonData.refreshToken);`,
                    `  }`,
                    `} catch (e) {`,
                    `  console.log('Could not parse response JSON or find tokens.');`,
                    `}`,
                  ],
                  type: "text/javascript",
                },
              },
            ],
            request: {
              method: "POST",
              header: [{ key: "Content-Type", value: "application/json" }],
              body: {
                mode: "raw",
                raw: JSON.stringify(
                  { email: "user@example.com", password: "password123" },
                  null,
                  2
                ),
              },
              url: {
                raw: "{{baseUrl}}/api/auth/login",
                host: ["{{baseUrl}}"],
                path: ["api", "auth", "login"],
              },
            },
            response: [],
          },
          {
            name: "Login User (with OTP)",
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    `try {`,
                    `  var jsonData = pm.response.json();`,
                    `  if (jsonData.accessToken) {`,
                    `    pm.environment.set("accessToken", jsonData.accessToken);`,
                    `  }`,
                    `  if (jsonData.refreshToken) {`,
                    `    pm.environment.set("refreshToken", jsonData.refreshToken);`,
                    `  }`,
                    `} catch (e) {`,
                    `  console.log('Could not parse response JSON or find tokens.');`,
                    `}`,
                  ],
                  type: "text/javascript",
                },
              },
            ],
            request: {
              method: "POST",
              header: [{ key: "Content-Type", value: "application/json" }],
              body: {
                mode: "raw",
                raw: JSON.stringify(
                  { email: "user@example.com", otp: "123456" },
                  null,
                  2
                ),
              },
              url: {
                raw: "{{baseUrl}}/api/auth/login",
                host: ["{{baseUrl}}"],
                path: ["api", "auth", "login"],
              },
            },
            response: [],
          },
          {
            name: "Refresh Token",
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    `try {`,
                    `  var jsonData = pm.response.json();`,
                    `  if (jsonData.accessToken) {`,
                    `    pm.environment.set("accessToken", jsonData.accessToken);`,
                    `  }`,
                    `  if (jsonData.refreshToken) {`,
                    `    pm.environment.set("refreshToken", jsonData.refreshToken);`,
                    `  }`,
                    `} catch (e) {`,
                    `  console.log('Could not parse response JSON or find tokens.');`,
                    `}`,
                  ],
                  type: "text/javascript",
                },
              },
            ],
            request: {
              method: "POST",
              header: [{ key: "Content-Type", value: "application/json" }],
              body: {
                mode: "raw",
                raw: JSON.stringify(
                  { refreshToken: "{{refreshToken}}" },
                  null,
                  2
                ),
              },
              url: {
                raw: "{{baseUrl}}/api/auth/refresh-token",
                host: ["{{baseUrl}}"],
                path: ["api", "auth", "refresh-token"],
              },
            },
            response: [],
          },
          {
            name: "Forgot Password (Send OTP to Email)",
            request: {
              method: "POST",
              header: [{ key: "Content-Type", value: "application/json" }],
              body: {
                mode: "raw",
                raw: JSON.stringify({ email: "user@example.com" }, null, 2),
              },
              url: {
                raw: "{{baseUrl}}/api/auth/forgot-password",
                host: ["{{baseUrl}}"],
                path: ["api", "auth", "forgot-password"],
              },
            },
            response: [],
          },
          {
            name: "Forgot Password (Send OTP to Phone)",
            request: {
              method: "POST",
              header: [{ key: "Content-Type", value: "application/json" }],
              body: {
                mode: "raw",
                raw: JSON.stringify({ phone: "+1234567890" }, null, 2),
              },
              url: {
                raw: "{{baseUrl}}/api/auth/forgot-password",
                host: ["{{baseUrl}}"],
                path: ["api", "auth", "forgot-password"],
              },
            },
            response: [],
          },
          {
            name: "Reset Password (with OTP)",
            request: {
              method: "POST",
              header: [{ key: "Content-Type", value: "application/json" }],
              body: {
                mode: "raw",
                raw: JSON.stringify(
                  {
                    email: "user@example.com",
                    otp: "123456",
                    newPassword: "newpassword123",
                  },
                  null,
                  2
                ),
              },
              url: {
                raw: "{{baseUrl}}/api/auth/reset-password",
                host: ["{{baseUrl}}"],
                path: ["api", "auth", "reset-password"],
              },
            },
            response: [],
          },
          {
            name: "Get User Profile",
            request: {
              method: "GET",
              header: [
                {
                  key: "Authorization",
                  value: "Bearer {{accessToken}}",
                  type: "text",
                },
              ],
              url: {
                raw: "{{baseUrl}}/api/auth/profile",
                host: ["{{baseUrl}}"],
                path: ["api", "auth", "profile"],
              },
            },
            response: [],
          },
        ],
      },
      {
        name: "Products", // Added sample resource
        item: [
          {
            name: "Get All Products (Paginated)",
            request: {
              method: "GET",
              header: [
                {
                  key: "Authorization",
                  value: "Bearer {{accessToken}}",
                  type: "text",
                },
              ],
              url: {
                raw: "{{baseUrl}}/api/products?page=1&limit=10",
                host: ["{{baseUrl}}"],
                path: ["api", "products"],
                query: [
                  { key: "page", value: "1" },
                  { key: "limit", value: "10" },
                ],
              },
            },
            response: [],
          },
          {
            name: "Create Product",
            request: {
              method: "POST",
              header: [
                { key: "Content-Type", value: "application/json" },
                {
                  key: "Authorization",
                  value: "Bearer {{accessToken}}",
                  type: "text",
                },
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({ name: "Test Product" }, null, 2),
              },
              url: {
                raw: "{{baseUrl}}/api/products",
                host: ["{{baseUrl}}"],
                path: ["api", "products"],
              },
            },
            response: [],
          },
          {
            name: "Get Product by ID",
            request: {
              method: "GET",
              header: [
                {
                  key: "Authorization",
                  value: "Bearer {{accessToken}}",
                  type: "text",
                },
              ],
              url: {
                raw: "{{baseUrl}}/api/products/:id",
                host: ["{{baseUrl}}"],
                path: ["api", "products", ":id"],
              },
            },
            response: [],
          },
          {
            name: "Update Product",
            request: {
              method: "PUT",
              header: [
                { key: "Content-Type", value: "application/json" },
                {
                  key: "Authorization",
                  value: "Bearer {{accessToken}}",
                  type: "text",
                },
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify({ name: "Updated Product" }, null, 2),
              },
              url: {
                raw: "{{baseUrl}}/api/products/:id",
                host: ["{{baseUrl}}"],
                path: ["api", "products", ":id"],
              },
            },
            response: [],
          },
          {
            name: "Delete Product",
            request: {
              method: "DELETE",
              header: [
                {
                  key: "Authorization",
                  value: "Bearer {{accessToken}}",
                  type: "text",
                },
              ],
              url: {
                raw: "{{baseUrl}}/api/products/:id",
                host: ["{{baseUrl}}"],
                path: ["api", "products", ":id"],
              },
            },
            response: [],
          },
        ],
      },
    ],
    variable: [
      {
        key: "baseUrl",
        value: "http://localhost:3000",
        type: "string",
      },
      {
        key: "accessToken",
        value: "",
        type: "string",
        description: "Bearer token for authenticated requests",
      },
      {
        key: "refreshToken",
        value: "",
        type: "string",
        description: "Refresh token for obtaining new access tokens",
      },
    ],
  };
  return JSON.stringify(collection, null, 2);
}

function displayHelp() {
  console.log(`
Expresso CLI - A Laravel-like tool for Express.js

Usage:
    codingexpress <command> [options]

Available Commands:
    init                Initializes a project with auth, dependencies, and starts the server.
    make:controller <Name>      Creates a new controller and validator in app/controllers and app/validators.
    make:model <Name>       Creates a new Mongoose model file in app/models.
    make:route <name>       Creates a new route file in app/routes.

Options for make:model:
    --connection=<name>         Specifies the database connection from config/database.js. Defaults to 'default'.

Example:
    codingexpress init
    codingexpress make:controller ProductController
    codingexpress make:model Product --connection=secondary
    `);
}
