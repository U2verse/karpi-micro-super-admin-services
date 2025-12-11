import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EnrollmentInvite } from "./enrollment_invite.entity";
import { CreateEnrollmentInviteDto } from "./dto/create-enrollment-invite.dto";
import { randomBytes } from "crypto";
import { SubmitEnrollmentDto } from "./dto/submit-enrollment.dto";
import { DataSource } from "typeorm";
import axios from "axios";
import { transporter } from "./email";
import * as fs from "fs";
import * as path from "path";
import * as nodemailer from "nodemailer";
import { generateInvoicePDF } from "../utils/generate-invoice";
import { sendInvoiceEmail } from "../utils/send-invoice-email";



@Injectable()
export class EnrollmentInvitesService {
  constructor(
    @InjectRepository(EnrollmentInvite)
    private inviteRepo: Repository<EnrollmentInvite>,
    private dataSource: DataSource,
  ) {}

  // -------------------------------------------------
  // CREATE INVITE + SEND EMAIL / WHATSAPP
  // -------------------------------------------------
  async createInvite(dto: CreateEnrollmentInviteDto) {
    const { clientName, email, whatsapp, planId } = dto;

    if (!clientName || !email) {
      throw new BadRequestException(
        "Client name and email are required to send enrollment form",
      );
    }

    const token = randomBytes(32).toString("hex");

    const inviteData: Partial<EnrollmentInvite> = {
      client_name: clientName,
      email,
      whatsapp: whatsapp ?? undefined,  // <-- FIXED
      plan_id: planId ?? undefined,     // <-- FIXED
      token,
    };

    const invite = this.inviteRepo.create(inviteData);
    await this.inviteRepo.save(invite);

    const link = `${process.env.ENROLLMENT_FORM_URL}?token=${token}`;

    await this.sendEmail(email, clientName, link);

    if (whatsapp) {
      await this.sendWhatsApp(whatsapp, link);
    }

    return {
      success: true,
      message: "Enrollment form sent successfully",
      link,
    };
  }

  // -----------------------------------------------------
  // SUBMIT ENROLLMENT (FINAL STEP)
  // -----------------------------------------------------
  async submitEnrollment(dto: SubmitEnrollmentDto) {
    const {
      token,
      plan_id,
      academy_name,
      owner_name,
      contact_email,
      phone,
      subdomain,
      billing_name,
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      gst_number,
      pan_number,
    } = dto;

    // -----------------------------------------------------
    // 1️⃣ Validate invite token
    // -----------------------------------------------------
    const invite = await this.inviteRepo.findOne({ where: { token } });

    if (!invite) throw new BadRequestException("Invalid or expired token");
    if (invite.completed)
      throw new BadRequestException("This enrollment is already completed.");

    const CLIENT_API = process.env.CLIENTS_SERVICE_URL!;
    const AUTH_API = process.env.AUTH_SERVICE_URL!;
    const SUPERADMIN_API =
      process.env.SUPERADMIN_SERVICE_URL ?? "http://localhost:3004/api";

    // -----------------------------------------------------
    // 2️⃣ Create Auth User
    // -----------------------------------------------------
    type RegisterResponse = {
      user_id: number;
    };

    let authUserId: number | null = null;

    try {
      const authRes = await axios.post<RegisterResponse>(`${AUTH_API}/register`, {
        name: owner_name,
        email: contact_email,
        phone,
        role: "clientadmin",
        password: Math.random().toString(36).slice(2, 10),
        tenant_id: null,
      });

      authUserId = authRes.data.user_id;

      console.log("✅ Auth user created authUserId :", authUserId);

    } catch (e: any) {
      console.error("❌ Auth user creation failed:", e.message);
    }


    // -----------------------------------------------------
    // 3️⃣ Create Client
    // -----------------------------------------------------
    interface CreateClientResponse {
      client: {
        client_id: number;
        name: string;
        subdomain: string;
        primary_domain: string;
      };
      domain: any;
      primary_domain: string;
      message: string;
    }

    const clientRes = await axios.post<CreateClientResponse>(
      `${CLIENT_API}/clients`,
      {
        name: academy_name,
        subdomain,
        domain_type: "subdomain",
        plan: plan_id?.toString(),
        logo_url: null,
        theme_color: null,
      },
      {
        headers: {
          "x-internal-secret": process.env.INTERNAL_ADMIN_TOKEN!
        }
      }
    );

    const client_id = clientRes.data.client.client_id;
    console.log("✅ Client created with ID:", client_id);

    // Update user tenant_id
    if (authUserId) {
      try {
        await axios.post(`${AUTH_API}/update-user/${authUserId}`, {
          tenant_id: client_id,
        });
        console.log("✅ User tenant_id updated");
      } catch {
        console.error("❌ Failed to update user tenant_id");
      }
    }

    // -----------------------------------------------------
    // 5️⃣ Profile
    // -----------------------------------------------------
    await axios.post(`${CLIENT_API}/clients/${client_id}/profile`, {
      academy_name,
      owner_name,
      contact_email,
      phone,
      address: `${address_line1}, ${address_line2 ?? ""}`,
      city,
      state,
      pincode,
    });
    console.log("✅ Client profile created");

    // -----------------------------------------------------
    // 6️⃣ Settings
    // -----------------------------------------------------
    await axios.patch(`${CLIENT_API}/clients/${client_id}/settings`,
      {
        enable_chat: true,
        enable_notifications: true,
        enable_payment: true,
        enable_landing_page: true,
      }
    );
    console.log("✅ Client settings updated");

    // -----------------------------------------------------
    // 7️⃣ Branding
    // -----------------------------------------------------
    await axios.patch(`${CLIENT_API}/clients/${client_id}/branding`, {
      client_id,
      theme_color: "#4F46E5",
      primary_color: "#4F46E5",
      secondary_color: "#818CF8",
      theme_mode: "light",
      font_family: "Inter",
    });
    console.log("✅ Client branding set");

    // -----------------------------------------------------
    // 8️⃣ Landing Page
    // -----------------------------------------------------
    await axios.patch(`${CLIENT_API}/clients/${client_id}/landing-page`, {
      client_id,
      headline: `${academy_name} — Start Learning Today`,
      subtitle: "Join thousands of learners",
    });
    console.log("✅ Client landing page created");

    // -----------------------------------------------------
    // 9️⃣ Assign Plan
    // -----------------------------------------------------
    interface SubscriptionAssignResponse {
      id: number;
      client_id: number;
      plan_id: number;
      start_date: string;
      end_date: string;
      renew_type: string;
      active: boolean;
      upgraded_from: number | null;
      created_at: string;
    }

    const subscriptionRes = await axios.post<SubscriptionAssignResponse>(
      `${SUPERADMIN_API}/subscriptions/assign`,
      {
        client_id,
        plan_id,
        renew_type: "monthly",
      },
      {
        headers: {
          "x-internal-secret": process.env.SUPER_ADMIN_INTERNAL_ADMIN_TOKEN!,
        },
      }
    );

    const subscription_id = subscriptionRes.data.id;
    console.log("✅ Subscription assigned with ID:", subscription_id);


    // -----------------------------------------------------
    // 🔟 Save basic enrollment record
    // -----------------------------------------------------
    const amount = 12990;

    await this.dataSource.query(
      `
        INSERT INTO public.enrollments (
          client_id, plan_id, plan_name, billing_type,
          full_name, email, phone, billing_name,
          address_line, city, state, pincode,
          gst_no, pan_no, amount, payment_mode, payment_status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      `,
      [
        client_id,
        plan_id,
        academy_name,
        "annual",
        owner_name,
        contact_email,
        phone,
        billing_name || owner_name,
        `${address_line1}, ${address_line2 ?? ""}`,
        city,
        state,
        pincode,
        gst_number,
        pan_number,
        amount,
        "mock",
        "success",
      ]
    );
    console.log("✅ Enrollment record saved");
    // -----------------------------------------------------
    // 1️⃣2️⃣ Generate Invoice Number
    // -----------------------------------------------------
    const invoiceNumber = `INV-${client_id}-${Date.now()}`;

    // -----------------------------------------------------
    // 1️⃣3️⃣ Generate Invoice PDF
    // -----------------------------------------------------
    const pdfPath = await generateInvoicePDF({
      invoiceNumber,
      clientId: client_id,
      academyName: academy_name,
      planName: "Annual Plan",
      amount,
    });

    const invoiceFilename = pdfPath.split("/").pop();
    const invoiceUrl = `${process.env.SUPERADMIN_PUBLIC_URL}/invoices/${invoiceFilename}`;

    // -----------------------------------------------------
    // 1️⃣4️⃣ Insert Invoice DB Record
    // -----------------------------------------------------
    await this.dataSource.query(
      `
        INSERT INTO public.client_invoices (
          client_id, subscription_id, billing_id,
          invoice_url, invoice_number,
          issue_date, amount, currency, status
        )
        VALUES ($1,$2,$3,$4,$5,CURRENT_DATE,$6,$7,$8)
      `,
      [
        client_id,
        subscription_id,
        null,
        invoiceUrl,
        invoiceNumber,
        amount,
        "INR",
        "paid",
      ]
    );
    console.log("✅ Invoice record created");

    // -----------------------------------------------------
    // 1️⃣5️⃣ Send Invoice Email
    // -----------------------------------------------------
    const templatePath = path.resolve(
      process.cwd(),
      "src",
      "email-templates",
      "invoice-email.html"
    );

    const template = fs.readFileSync(templatePath, "utf8");

    const emailHtml = template
      .replace(/{{name}}/g, owner_name)
      .replace(/{{ACADEMY}}/g, academy_name)
      .replace(/{{INVOICE_ID}}/g, invoiceNumber)
      .replace(/{{AMOUNT}}/g, amount.toString())
      .replace(/{{DATE}}/g, new Date().toLocaleDateString("en-IN"))
      .replace(/{{DOWNLOAD}}/g, invoiceUrl);

    await sendInvoiceEmail({
      to: contact_email,
      name: owner_name,
      html: emailHtml,
      pdfPath,
    });

    // -----------------------------------------------------
    // 1️⃣6️⃣ Mark Invite Completed
    // -----------------------------------------------------
    invite.completed = true;
    await this.inviteRepo.save(invite);

    return {
      success: true,
      message: "Enrollment completed successfully",
      client_id,
      subscription_id,
      invoice_number: invoiceNumber,
      invoice_url: invoiceUrl,
    };
  }

 

  
  // -------------------------------------------------
  // EMAIL SENDER (Stub – Ready for Resend/Nodemailer)
  // -------------------------------------------------
  async sendEmail(email: string, name: string, link: string) {
    try {
      // 1️⃣ Load Template
      const templatePath = path.resolve(
        process.cwd(),
        "src",
        "email-templates",
        "enrollment-invite.html"
      );
      const template = fs.readFileSync(templatePath, "utf8");

      const html = template
      .replace(/{{name}}/g, name)
      .replace(/{{link}}/g, link)
      .replace(/{{year}}/g, new Date().getFullYear().toString());
      
      // 2️⃣ Send email using shared transporter
      const info = await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: email,
        subject: "Your Karpi Enrollment Form",
        html,
      });

      console.log("📧 Email Sent:", info.messageId);
      console.log("Using Transporter:", transporter.options);

    } catch (error) {
      console.error("❌ Email Send Error:", error);
      console.log("Using Transporter:", transporter.options);
    }
  }

  async sendInvoiceEmail(options: {
      email: string;
      name: string;
      clientId: number;
      academyName: string;
      planName: string;
      amount: number;
      subdomain: string;
      invoiceId: string;
      downloadLink: string;
    }) {
      const {
        email,
        name,
        clientId,
        academyName,
        planName,
        amount,
        subdomain,
        invoiceId,
        downloadLink,
      } = options;

      try {
        // 1️⃣ Load invoice template
        const templatePath = path.resolve(
          process.cwd(),
          "src",
          "email-templates",
          "invoice-email.html"
        );

        const template = fs.readFileSync(templatePath, "utf8");

        // 2️⃣ Replace placeholders
        const html = template
          .replace(/{{name}}/g, name)
          .replace(/{{CLIENT_ID}}/g, clientId.toString())
          .replace(/{{ACADEMY}}/g, academyName)
          .replace(/{{PLAN}}/g, planName)
          .replace(/{{AMOUNT}}/g, amount.toString())
          .replace(/{{SUBDOMAIN}}/g, subdomain)
          .replace(/{{INVOICE_ID}}/g, invoiceId)
          .replace(/{{INVOICE_DOWNLOAD_LINK}}/g, downloadLink)
          .replace(/{{DATE}}/g, new Date().toLocaleDateString("en-IN"))
          .replace(/{{YEAR}}/g, new Date().getFullYear().toString());

        // 3️⃣ Send invoice email
        const info = await transporter.sendMail({
          from: process.env.FROM_EMAIL,
          to: email,
          subject: "Your Karpi Invoice",
          html,
        });

        console.log("📧 Invoice Email Sent:", info.messageId);

      } catch (error) {
        console.error("❌ Invoice Email Error:", error);
      }
  }

  // -------------------------------------------------
  // WHATSAPP SENDER (Stub – Ready for WhatsApp Cloud API)
  // -------------------------------------------------
  async sendWhatsApp(number: string, link: string) {
    console.log("📱 Sending WhatsApp Message");
    console.log("To:", number);
    console.log("Link:", link);

    // 👉 Replace with:
    // - Meta WhatsApp Cloud API
    // - Twilio WhatsApp
  }
}
