# Node Prototype - Patient Intake Platform

A TypeScript-based Node.js prototype for a patient intake platform, built with clean architecture principles, event-driven design, and modern best practices.

## 🏗️ Architecture

This project follows **Clean Architecture** principles with clear separation of concerns:

```
src/
├── domain/               # Business logic and entities
│   ├── entities/        # Domain models (FormEntity, BaseEntity)
│   ├── events/          # Domain events (IntakeCompletedEvent)
│   └── repositories/    # Repository interfaces
├── application/         # Application services and use cases
│   └── services/        # Business logic services (FormService)
└── infrastructure/      # External concerns and implementations
    ├── controllers/     # HTTP controllers (FormController)
    ├── repositories/    # Repository implementations (FormMongoRepository)
    ├── database/        # Database connections (MongoConnection)
    ├── messaging/       # Message broker (RabbitMQConnection, EventDispatcher, EventConsumer)
    ├── dispatchers/     # Event dispatchers (IntakeCompletedDispatcher)
    └── consumers/       # Event consumers (IntakeCompletedConsumer)
```

## 🚀 Features

- **RESTful API** for patient intake form management
- **Event-Driven Architecture** using RabbitMQ for asynchronous processing
- **MongoDB** for data persistence
- **Type-Safe** with TypeScript
- **Clean Architecture** with dependency inversion
- **Docker Support** with docker-compose
- **Health Check Endpoint** for monitoring
- **Comprehensive Testing** (unit and integration tests)

## 📋 Prerequisites

- Node.js >= 24.13.0
- MongoDB 7+
- RabbitMQ 3.12+
- Docker & Docker Compose (optional)

## 🔧 Installation

### Using Yarn

```bash
# Install dependencies
yarn install

# Build the project
yarn build

# Start the server
yarn start
```

### Using Docker

```bash
# Start all services (MongoDB, RabbitMQ, API)
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

## 🌐 API Endpoints

### Health Check

Check the health status of the application and its dependencies.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-22T10:30:00.000Z",
  "checks": {
    "database": {
      "connected": true,
      "ping": true,
      "status": "healthy"
    },
    "rabbitmq": {
      "connected": true,
      "status": "healthy"
    }
  }
}
```

### Form Management

#### Get All Forms

Retrieve all patient intake forms.

**Endpoint:** `GET /forms`

**Response:**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "createdAt": "2026-01-22T10:00:00.000Z",
    "updatedAt": "2026-01-22T10:00:00.000Z",
    "fields": {
      "firstName": {
        "id": "firstName",
        "label": "First Name",
        "type": "text"
      },
      "dob": {
        "id": "dob",
        "label": "Date of Birth",
        "type": "date"
      }
    }
  }
]
```

#### Get Form by ID

Retrieve a specific form by its ID.

**Endpoint:** `GET /forms/:id`

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "createdAt": "2026-01-22T10:00:00.000Z",
  "updatedAt": "2026-01-22T10:00:00.000Z",
  "fields": {
    "firstName": {
      "id": "firstName",
      "label": "First Name",
      "type": "text"
    }
  }
}
```

**Error Responses:**
- `404 Not Found` - Form not found
- `400 Bad Request` - Invalid form ID

#### Create Form

Create a new patient intake form.

**Endpoint:** `POST /forms`

**Request Body:**
```json
{
  "fields": {
    "firstName": {
      "id": "firstName",
      "label": "First Name",
      "type": "text"
    },
    "age": {
      "id": "age",
      "label": "Age",
      "type": "number"
    },
    "medicalHistory": {
      "id": "medicalHistory",
      "label": "Medical History",
      "type": "textarea"
    }
  }
}
```

**Field Types:**
- `text` - Single-line text input
- `number` - Numeric input
- `date` - Date picker
- `checkbox` - Checkbox input
- `radio` - Radio button
- `select` - Dropdown select
- `textarea` - Multi-line text input

**Response:** `201 Created`
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "createdAt": "2026-01-22T10:00:00.000Z",
  "updatedAt": "2026-01-22T10:00:00.000Z",
  "fields": { ... }
}
```

#### Update Form

Update an existing form.

**Endpoint:** `PUT /forms/:id`

**Request Body:**
```json
{
  "fields": {
    "firstName": {
      "id": "firstName",
      "label": "First Name (Updated)",
      "type": "text"
    }
  }
}
```

**Response:** `200 OK`

**Error Responses:**
- `404 Not Found` - Form not found
- `400 Bad Request` - Invalid request body

#### Delete Form

Delete a form by ID.

**Endpoint:** `DELETE /forms/:id`

**Response:** `204 No Content`

**Error Responses:**
- `404 Not Found` - Form not found

## 📦 Domain Models

### FormEntity

Represents a patient intake form with customizable fields.

**Properties:**
- `id: string` - Unique identifier (UUID)
- `createdAt: Date` - Creation timestamp
- `updatedAt: Date` - Last update timestamp
- `fields: FormFields` - Dynamic form fields

**Methods:**
- `FormEntity.create(params)` - Create a new form instance
- `FormEntity.from(params)` - Recreate a form from existing data

### FormFields

Type: `Record<string, FormField>`

A collection of form fields with the following structure:

```typescript
interface FormField {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "checkbox" | "radio" | "select" | "textarea";
}
```

## 🔄 Event-Driven Architecture

The application uses RabbitMQ for asynchronous event processing with a topic exchange pattern.

### IntakeCompletedEvent

Published when a patient intake form is completed.

**Event Payload:**
```typescript
{
  eventId: string;
  eventType: "IntakeCompleted";
  aggregateId: string;
  occurredOn: Date;
  payload: {
    formId: string;
    completedBy: Date;
    answers: Record<string, unknown>;
  }
}
```

**Routing Key:** `form.intake.completed`

### Event Dispatcher

**Class:** `IntakeCompletedDispatcher`

**Methods:**

#### `initialize(): Promise<void>`
Initialize the dispatcher and assert the exchange.

#### `dispatch(aggregateId: string, payload: IntakeCompletedPayload): Promise<boolean>`
Dispatch a single intake completed event.

**Parameters:**
- `aggregateId` - The aggregate/form ID
- `payload` - Event payload with formId, completedBy, and answers

**Returns:** `true` if successfully published

#### `dispatchBatch(events: Array): Promise<boolean[]>`
Dispatch multiple events in a batch.

**Parameters:**
- `events` - Array of events to dispatch

**Returns:** Array of boolean results

### Event Consumer

**Class:** `EventConsumer`

**Methods:**

#### `on(eventType: string, handler: EventHandler): void`
Register a handler for a specific event type.

**Example:**
```typescript
consumer.on("IntakeCompletedEvent", async (event) => {
  console.log("Processing intake:", event);
  // Handle the event
});
```

#### `initialize(): Promise<void>`
Initialize the consumer, create queue, and bind to exchange.

#### `start(): Promise<void>`
Start consuming messages from the queue.

#### `stop(): Promise<void>`
Stop consuming and close the channel.

### Configuration

**Dispatcher Config:**
```typescript
{
  exchange: "intake_events",
  exchangeType: "topic",
  durable: true
}
```

**Consumer Config:**
```typescript
{
  queueName: "intake_completed_queue",
  exchange: "intake_events",
  routingKeys: ["form.*"],
  prefetchCount: 10,
  durable: true
}
```

## 🗄️ Data Persistence

### FormService

Application service for form business logic.

**Methods:**

#### `create(params: { id: string, fields: FormFields }): Promise<FormEntity>`
Create a new form.

#### `getById(id: string): Promise<FormEntity | null>`
Retrieve a form by ID.

#### `getAll(): Promise<FormEntity[]>`
Retrieve all forms.

#### `update(id: string, params: { fields: FormFields }): Promise<FormEntity | null>`
Update an existing form.

#### `delete(id: string): Promise<boolean>`
Delete a form by ID.

### FormMongoRepository

MongoDB implementation of the FormRepository interface.

**Methods:**

#### `save(entity: FormEntity): Promise<FormEntity>`
Save or update a form entity.

#### `findById(id: string): Promise<FormEntity | null>`
Find a form by ID.

#### `findAll(): Promise<FormEntity[]>`
Find all forms.

#### `delete(id: string): Promise<boolean>`
Delete a form by ID.

### MongoConnection

Singleton for managing MongoDB connections.

**Methods:**

#### `connect(uri: string, dbName: string): Promise<void>`
Establish a connection to MongoDB.

#### `disconnect(): Promise<void>`
Close the MongoDB connection.

#### `getDb(): Db`
Get the database instance.

#### `ping(): Promise<boolean>`
Check if the database is responsive.

**Properties:**
- `connected: boolean` - Connection status

## 🧪 Testing

```bash
# Run all tests
yarn test

# Run with coverage
yarn test --coverage

# Run specific test file
yarn test FormService.test.ts
```

**Test Types:**
- **Unit Tests** - Business logic and services
- **Integration Tests** - Repository, database, and messaging
- **E2E Tests** - Full workflow testing

## 🔌 Messaging Infrastructure

### RabbitMQConnection

Singleton for managing RabbitMQ connections.

**Methods:**

#### `getInstance(uri?: string): RabbitMQConnection`
Get the singleton instance.

#### `connect(): Promise<void>`
Establish a connection to RabbitMQ.

#### `getChannel(): Promise<Channel>`
Get a shared channel for publishing.

#### `createChannel(): Promise<Channel>`
Create a new dedicated channel.

#### `close(): Promise<void>`
Close the connection.

#### `isConnected(): boolean`
Check connection status.

## 🌍 Environment Variables

```bash
# Server Configuration
PORT=3000

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=node-prototype

# RabbitMQ Configuration
RABBITMQ_URI=amqp://admin:password@localhost:5672

# Environment
NODE_ENV=development
```

## 📝 Scripts

```bash
# Development
yarn dev          # Watch mode with auto-reload

# Production
yarn build        # Compile TypeScript
yarn start        # Start production server

# Code Quality
yarn lint         # Run ESLint
yarn format       # Format code with Prettier

# Testing
yarn test         # Run tests
```

## 🐳 Docker Services

The `docker-compose.yml` includes:

1. **MongoDB** (Port 27017)
   - Version: 7
   - Credentials: admin/password
   - Health checks enabled

2. **RabbitMQ** (Ports 5672, 15672)
   - Version: 3.12 with management
   - Management UI: http://localhost:15672
   - Credentials: admin/password

3. **API** (Port 3000)
   - Auto-restarts on failure
   - Health checks enabled
   - Waits for dependencies

## 🏃‍♂️ Running Event Consumer

To run the event consumer separately:

```bash
node dist/infrastructure/consumers/IntakeCompletedConsumer.js
```

## 📚 Architecture Principles

1. **Dependency Inversion** - Domain layer has no dependencies on infrastructure
2. **Single Responsibility** - Each class has one reason to change
3. **Open/Closed** - Open for extension, closed for modification
4. **Interface Segregation** - Repository interfaces define clear contracts
5. **Event-Driven** - Loose coupling via domain events
6. **Type Safety** - Full TypeScript coverage

## 🤝 Contributing

1. Follow the existing code structure
2. Write tests for new features
3. Run linting and formatting before commits
4. Use conventional commit messages

## 📄 License

MIT License - see LICENSE file for details

## 👤 Author

Matheus Frizo <matheusfrizo@gmail.com>

## 🔗 Repository

https://github.com/MFrizo/node-prototype
