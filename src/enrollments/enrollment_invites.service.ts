import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EnrollmentInvite } from "./enrollment_invite.entity";
import { CreateEnrollmentInviteDto } from "./dto/create-enrollment-invite.dto";
import { randomBytes, UUID } from "crypto";
import { SubmitEnrollmentDto } from "./dto/submit-enrollment.dto";
import { DataSource } from "typeorm";
import axios from "axios";
import { getEmailTransporter } from "./email";
import * as fs from "fs";
import * as path from "path";
import * as nodemailer from "nodemailer";
import { generateInvoicePDF } from "../utils/generate-invoice";
import { sendInvoiceEmail } from "../utils/send-invoice-email";
import { WhatsappService } from '../whatsapp/whatsapp.service';



@Injectable()
export class EnrollmentInvitesService {
  constructor(
    @InjectRepository(EnrollmentInvite)
    private inviteRepo: Repository<EnrollmentInvite>,
    private dataSource: DataSource,
    private whatsappService: WhatsappService,
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
      await this.whatsappService.sendEnrollmentMessage(
        whatsapp,     // 91XXXXXXXXXX
        clientName,   // {{1}}
        token,        // {{2}}
      );
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

    const GATEWAY = process.env.API_GATEWAY_INTERNAL_URL!;

    const CLIENT_API = `${GATEWAY}/api/clients`;
    const AUTH_API = `${GATEWAY}/api/auth`;
    const SUPERADMIN_API = `${GATEWAY}/api/superadmin`;

    // -----------------------------------------------------
    // 2️⃣ Fetch Plan Details
    // -----------------------------------------------------
    const plan = await this.dataSource.query(
      `
      SELECT
        storage_limit_mb,
        student_limit,
        course_limit,
        video_limit,
        assignments_limit
      FROM plans
      WHERE id = $1
      `,
      [plan_id]
    );

    if (!plan || plan.length === 0) {
      throw new BadRequestException("Invalid plan selected");
    }

    const {
      storage_limit_mb,
      student_limit,
      course_limit,
      video_limit,
      assignments_limit,
    } = plan[0];

    // -----------------------------------------------------
    // 3️⃣ Create Auth User
    // -----------------------------------------------------
    type RegisterResponse = {
      user_id: number;
    };

    let authUserId: number | null = null;

    try {
      const authRes = await axios.post<RegisterResponse>(
        `${AUTH_API}/register`,
        {
          name: owner_name,
          email: contact_email,
          phone,
          role: "clientadmin",
          password: Math.random().toString(36).slice(2, 10),
          tenant_id: null,
        },
        {
          headers: {
            "x-internal-secret": process.env.INTERNAL_ADMIN_TOKEN!,
          },
        }
      );

      authUserId = authRes.data.user_id;

      console.log("✅ Auth user created authUserId:", authUserId);

    } catch (e: any) {
      console.error(
        "❌ Auth user creation failed:",
        e?.response?.data || e.message
      );

      throw new BadRequestException(
        'Enrollment failed: unable to create auth user'
      );
    }

    // -----------------------------------------------------
    // 4️⃣ Create Client
    // -----------------------------------------------------
    interface CreateClientResponse {
      client: {
        client_id: number;
        tenant_id: string;
        name: string;
        subdomain: string;
        primary_domain: string;
      };
      domain: any;
      primary_domain: string;
      message: string;
    }

    let client_id: number;
    let tenant_id: string;

    try {
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
            "x-internal-secret": process.env.INTERNAL_ADMIN_TOKEN!,
          },
        }
      );

      client_id = clientRes.data.client.client_id;
      tenant_id = clientRes.data.client.tenant_id;

      console.log("✅ Client created with ID:", client_id);
      console.log("✅ Tenant ID:", tenant_id);

    } catch (e: any) {
      console.error(
        "❌ Client creation failed:",
        e?.response?.data || e.message
      );

      // 🔥 COMPENSATION: auth user already exists
      await axios.delete(
        `${AUTH_API}/users/${authUserId}`,
        {
          headers: { "x-internal-secret": process.env.INTERNAL_ADMIN_TOKEN! },
        }
      );

      throw new BadRequestException(
        "Enrollment failed: unable to create client"
      );
    }

    // -----------------------------------------------------
    // 5️⃣ Update user tenant_id
    // -----------------------------------------------------
    try {
      await axios.post(
        `${AUTH_API}/update-user/${authUserId}`,
        { tenant_id },
        {
          headers: {
            "x-internal-secret": process.env.INTERNAL_ADMIN_TOKEN!,
          },
        }
      );

      console.log("✅ User tenant_id updated");

    } catch (e: any) {
      console.error(
        "❌ Failed to update user tenant_id:",
        e?.response?.data || e.message
      );

      // 🔥 COMPENSATION (reverse order)
      await axios.delete(`${CLIENT_API}/clients/${client_id}`, {
        headers: { "x-internal-secret": process.env.INTERNAL_ADMIN_TOKEN! },
      });

      await axios.delete(`${AUTH_API}/users/${authUserId}`, {
        headers: { "x-internal-secret": process.env.INTERNAL_ADMIN_TOKEN! },
      });

      throw new BadRequestException(
        "Enrollment failed: unable to link user to client"
      );
    }

    // -----------------------------------------------------
    // 5️⃣ Initialize Client Usage
    // -----------------------------------------------------
    try {
      await axios.post(
        `${CLIENT_API}/clients/${client_id}/usage/init`,
        {
          storage_limit_mb,
          student_limit,      // ⚠️ ensure correct variable name
          course_limit,
          video_limit,
          assignments_limit,
        },
        {
          headers: {
            'x-internal-secret': process.env.INTERNAL_ADMIN_TOKEN!,
          },
        }
      );

      console.log('✅ Client usage initialized via clients-service');

    } catch (e: any) {
      console.error(
        '❌ Client usage initialization failed:',
        e?.response?.data || e.message
      );

      // 🔥 COMPENSATION (reverse order)
      await axios.delete(`${CLIENT_API}/clients/${client_id}`, {
        headers: { 'x-internal-secret': process.env.INTERNAL_ADMIN_TOKEN! },
      });

      await axios.delete(`${AUTH_API}/users/${authUserId}`, {
        headers: { 'x-internal-secret': process.env.INTERNAL_ADMIN_TOKEN! },
      });

      throw new BadRequestException(
        'Enrollment failed: unable to initialize client usage'
      );
    }



    // -----------------------------------------------------
    // 6️⃣ Client Profile
    // -----------------------------------------------------
    try {
      await axios.post(
        `${CLIENT_API}/clients/${client_id}/profile`,
        {
          academy_name,
          owner_name,
          contact_email,
          phone,
          address: `${address_line1}, ${address_line2 ?? ""}`,
          city,
          state,
          pincode,
        },
        {
          headers: {
            'x-internal-secret': process.env.INTERNAL_ADMIN_TOKEN!,
          },
        }
      );

      console.log("✅ Client profile created");

    } catch (e: any) {
      console.error(
        "❌ Client profile creation failed:",
        e?.response?.data || e.message
      );

      // 🔥 COMPENSATION (reverse order)
      await axios.delete(`${CLIENT_API}/clients/${client_id}`, {
        headers: { 'x-internal-secret': process.env.INTERNAL_ADMIN_TOKEN! },
      });

      await axios.delete(`${AUTH_API}/users/${authUserId}`, {
        headers: { 'x-internal-secret': process.env.INTERNAL_ADMIN_TOKEN! },
      });

      throw new BadRequestException(
        'Enrollment failed: unable to create client profile'
      );
    }


    // -----------------------------------------------------
    // 6️⃣ Client Settings
    // -----------------------------------------------------
    try {
      await axios.patch(
        `${CLIENT_API}/clients/${client_id}/settings`,
        {
          enable_chat: true,
          enable_notifications: true,
          enable_payment: true,
          enable_landing_page: true,
        },
        {
          headers: {
            'x-internal-secret': process.env.INTERNAL_ADMIN_TOKEN!,
          },
        }
      );

      console.log("✅ Client settings updated");

    } catch (e: any) {
      console.error(
        "❌ Client settings update failed:",
        e?.response?.data || e.message
      );

      // 🔥 COMPENSATION (reverse order)
      await axios.delete(`${CLIENT_API}/clients/${client_id}`, {
        headers: { 'x-internal-secret': process.env.INTERNAL_ADMIN_TOKEN! },
      });

      await axios.delete(`${AUTH_API}/users/${authUserId}`, {
        headers: { 'x-internal-secret': process.env.INTERNAL_ADMIN_TOKEN! },
      });

      throw new BadRequestException(
        'Enrollment failed: unable to update client settings'
      );
    }


    // -----------------------------------------------------
    // 7️⃣ Client Branding
    // -----------------------------------------------------
    try {
      await axios.patch(
        `${CLIENT_API}/clients/${client_id}/branding`,
        {
          client_id,
          theme_color: "#4F46E5",
          primary_color: "#4F46E5",
          secondary_color: "#818CF8",
          theme_mode: "light",
          font_family: "NA",
        },
        {
          headers: {
            'x-internal-secret': process.env.INTERNAL_ADMIN_TOKEN!,
          },
        }
      );

      console.log("✅ Client branding set");

    } catch (e: any) {
      console.error(
        "❌ Client branding failed:",
        e?.response?.data || e.message
      );

      // 🔥 COMPENSATION (ROOT AGGREGATES ONLY)
      await axios.delete(`${CLIENT_API}/clients/${client_id}`, {
        headers: { 'x-internal-secret': process.env.INTERNAL_ADMIN_TOKEN! },
      });

      await axios.delete(`${AUTH_API}/users/${authUserId}`, {
        headers: { 'x-internal-secret': process.env.INTERNAL_ADMIN_TOKEN! },
      });

      throw new BadRequestException(
        'Enrollment failed: unable to apply client branding'
      );
    }


    // -----------------------------------------------------
    // 8️⃣ Client Landing Page
    // -----------------------------------------------------
    try {
      await axios.patch(
        `${CLIENT_API}/clients/${client_id}/landing-page`,
        {
          client_id,
          headline: `${academy_name} — Start Learning Today`,
          subtitle: "Join thousands of learners",
        },
        {
          headers: {
            'x-internal-secret': process.env.INTERNAL_ADMIN_TOKEN!,
          },
        }
      );

      console.log("✅ Client landing page created");

    } catch (e: any) {
      console.error(
        "❌ Client landing page creation failed:",
        e?.response?.data || e.message
      );

      // 🔥 COMPENSATION (ROOT AGGREGATES ONLY)
      await axios.delete(`${CLIENT_API}/clients/${client_id}`, {
        headers: { 'x-internal-secret': process.env.INTERNAL_ADMIN_TOKEN! },
      });

      await axios.delete(`${AUTH_API}/users/${authUserId}`, {
        headers: { 'x-internal-secret': process.env.INTERNAL_ADMIN_TOKEN! },
      });

      throw new BadRequestException(
        'Enrollment failed: unable to create landing page'
      );
    }


    // -----------------------------------------------------
    // 9️⃣ Assign Subscription / Plan
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

    let subscription_id: number;

    try {
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

      subscription_id = subscriptionRes.data.id;
      console.log("✅ Subscription assigned with ID:", subscription_id);

    } catch (e: any) {
      console.error(
        "❌ Subscription assignment failed:",
        e?.response?.data || e.message
      );

      // 🔥 COMPENSATION (ROOT AGGREGATES ONLY)
      await axios.delete(`${CLIENT_API}/clients/${client_id}`, {
        headers: { 'x-internal-secret': process.env.INTERNAL_ADMIN_TOKEN! },
      });

      await axios.delete(`${AUTH_API}/users/${authUserId}`, {
        headers: { 'x-internal-secret': process.env.INTERNAL_ADMIN_TOKEN! },
      });

      throw new BadRequestException(
        'Enrollment failed: unable to assign subscription'
      );
    }

    // -----------------------------------------------------
    // 🔟 Save basic enrollment record (NON-CRITICAL)
    // -----------------------------------------------------
    const amount = 12990;

    try {
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

    } catch (e: any) {
      console.error(
        "⚠️ Failed to save enrollment record:",
        e?.message || e
      );

      // ❗ DO NOT ROLLBACK CLIENT / AUTH HERE
      // This is an audit record and can be repaired later
    }

    
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
      const transporter = getEmailTransporter();

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
     // console.log("Using Transporter:", transporter.options);
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

        const transporter = getEmailTransporter();
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
/*   async sendWhatsApp(number: string, link: string) {
    console.log("📱 Sending WhatsApp Message");
    console.log("To:", number);
    console.log("Link:", link);

    // 👉 Replace with:
    // - Meta WhatsApp Cloud API
    // - Twilio WhatsApp
  } */

  async sendWhatsApp(number: string, link: string) {
      try {
        const phone = number.startsWith("91") ? number : `91${number}`;

        const url = `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

        await axios.post(
          url,
          {
            messaging_product: "whatsapp",
            to: phone,
            type: "text",
            text: {
              body: `👋 Welcome to Karpi LMS!

    Your enrollment form is ready.

    📝 Complete your registration here:
    ${link}

    If you need help, reply to this message.

    — Team Karpi 🚀`,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log("✅ WhatsApp message sent to", phone);

      } catch (error: any) {
        console.error(
          "❌ WhatsApp send failed:",
          error?.response?.data || error.message
        );
      }
  }

}
