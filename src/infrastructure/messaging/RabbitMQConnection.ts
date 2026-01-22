import amqp from "amqplib";

type Connection = Awaited<ReturnType<typeof amqp.connect>>;
type Channel = Awaited<ReturnType<Connection["createChannel"]>>;

export class RabbitMQConnection {
  private static instance: RabbitMQConnection;
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private readonly uri: string;
  private isConnecting = false;

  private constructor(uri: string) {
    this.uri = uri;
  }

  public static getInstance(uri?: string): RabbitMQConnection {
    if (!RabbitMQConnection.instance) {
      if (!uri) {
        throw new Error("URI is required for first initialization");
      }
      RabbitMQConnection.instance = new RabbitMQConnection(uri);
    }
    return RabbitMQConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.connection && this.channel) {
      return;
    }

    if (this.isConnecting) {
      // Wait for the ongoing connection attempt
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.connect();
    }

    this.isConnecting = true;

    try {
      console.log("Connecting to RabbitMQ...");
      const connection = await amqp.connect(this.uri);
      const channel = await connection.createChannel();

      this.connection = connection;
      this.channel = channel;

      connection.on("error", (err) => {
        console.error("RabbitMQ connection error:", err);
        this.connection = null;
        this.channel = null;
      });

      connection.on("close", () => {
        console.log("RabbitMQ connection closed");
        this.connection = null;
        this.channel = null;
      });

      console.log("Connected to RabbitMQ successfully");
    } catch (error) {
      console.error("Failed to connect to RabbitMQ:", error);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  public async getChannel(): Promise<Channel> {
    if (!this.channel) {
      await this.connect();
    }

    if (!this.channel) {
      throw new Error("Failed to establish RabbitMQ channel");
    }

    return this.channel;
  }

  public async createChannel(): Promise<Channel> {
    if (!this.connection) {
      await this.connect();
    }

    if (!this.connection) {
      throw new Error("Failed to establish RabbitMQ connection");
    }

    return await this.connection.createChannel();
  }

  public async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }

    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }

    console.log("RabbitMQ connection closed");
  }

  public isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }
}
