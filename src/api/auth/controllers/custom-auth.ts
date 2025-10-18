// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require("bcryptjs");

export default {
  async requestOtp(ctx) {
    const { phone, role } = ctx.request.body ?? {};
    if (!phone) return ctx.badRequest("phone required");
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    await strapi.entityService.create("api::otp.otp", {
      data: { phone, code, expiresAt, role: role ?? null },
    });
    // TODO: integrate SMS provider here
    ctx.body = { ok: true };
  },

  async verifyOtp(ctx) {
    const { phone, code } = ctx.request.body ?? {};
    if (!phone || !code) return ctx.badRequest("phone and code required");
    const records = await strapi.entityService.findMany("api::otp.otp", {
      filters: {
        phone: { $eq: phone },
        code: { $eq: code },
        verified: { $eq: false },
      },
      sort: { createdAt: "desc" },
      limit: 1,
    });
    const otp = Array.isArray(records) ? records[0] : null;
    if (!otp) return ctx.unauthorized("invalid code");
    if (new Date(otp.expiresAt).getTime() < Date.now())
      return ctx.unauthorized("code expired");

    await strapi.entityService.update("api::otp.otp", otp.id, {
      data: { verified: true },
    });

    // Detect existing account
    const parents: any = await strapi.entityService.findMany(
      "api::parent.parent",
      { filters: { phone: { $eq: phone } }, limit: 1 }
    );
    const students: any = await strapi.entityService.findMany(
      "api::student.student",
      { filters: { phone: { $eq: phone } }, limit: 1 }
    );
    const parent = Array.isArray(parents) ? parents[0] : (parents ?? null);
    const student = Array.isArray(students) ? students[0] : (students ?? null);

    if (parent) {
      ctx.body = {
        ok: true,
        account: {
          type: "parent",
          id: parent.id,
          documentId: parent.documentId,
        },
      };
      return;
    }
    if (student) {
      ctx.body = {
        ok: true,
        account: {
          type: "student",
          id: student.id,
          documentId: student.documentId,
        },
      };
      return;
    }

    // No account yet → client should proceed to role selection and registration
    ctx.body = { ok: true, account: { type: "none" } };
  },

  async passwordLogin(ctx) {
    const { phone, password } = ctx.request.body ?? {};
    if (!phone || !password)
      return ctx.badRequest("phone and password required");
    // Try Parent first
    const parent = await strapi.db.query("api::parent.parent").findOne({
      where: { phone },
      select: ["id", "documentId", "password"],
    });
    if (parent && parent.password) {
      const ok = await bcrypt.compare(password, parent.password);
      if (ok) {
        ctx.body = {
          ok: true,
          account: {
            type: "parent",
            id: parent.id,
            documentId: parent.documentId,
          },
        };
        return;
      }
    }
    // Try Student
    const student = await strapi.db.query("api::student.student").findOne({
      where: { phone },
      select: ["id", "documentId", "password"],
    });
    if (student && student.password) {
      const ok = await bcrypt.compare(password, student.password);
      if (ok) {
        ctx.body = {
          ok: true,
          account: {
            type: "student",
            id: student.id,
            documentId: student.documentId,
          },
        };
        return;
      }
    }
    return ctx.unauthorized("invalid credentials");
  },
};
