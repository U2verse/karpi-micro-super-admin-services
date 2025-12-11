import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { transporter } from './enrollments/email';  // ✅ IMPORT HERE

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
  transporter.verify((error, success) => {
    if (error) {
      console.error("❌ SMTP Connection Error:", error);
    } else {
      console.log("✅ SMTP Server is ready to take messages");
    }
  });

  await app.listen(process.env.PORT || 3004);
}
bootstrap();
