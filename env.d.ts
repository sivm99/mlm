declare module "bun" {
  interface Env {
    DATABASE_URL: string;
    PORT: string | number;
    JWT_SECRET: string;
    HOST: string;
    EXPIRE_TIME_IN_MINUTES: string | number;
    OTP_EXPIRE_TIME_IN_MINUTES: string | number;
    ADMIN_ID: string;
    ADMIN_EMAIL: string;
    ADMIN_PASSWORD: string;
    EMAIL_HOST: string;
    FRONTEND_HOST: string;
    REDIS_URL: string;
  }
}
