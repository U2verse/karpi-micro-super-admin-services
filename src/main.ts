import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getEmailTransporter } from './enrollments/email';  // ✅ IMPORT HERE
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:3003",
      "http://localhost:3004",
    ],
    credentials: true,
  });

  // ✅ TEST SMTP CONNECTION HERE
  const transporter = getEmailTransporter();
  transporter.verify((error, success) => {
    if (error) {
      console.error("❌ SMTP Connection Error:", error);
    } else {
      console.log("✅ SMTP Server is ready to take messages");
    }
  });

  

  const port = process.env.APP_PORT || 4102;
  await app.listen(port);

  Logger.log(`Super Admin Service running on port ${port}`, 'Bootstrap');
}
bootstrap();
