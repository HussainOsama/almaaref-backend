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

    // mark as verified
    await strapi.entityService.update("api::otp.otp", otp.id, {
      data: { verified: true },
    });

    // ensure a Student exists by phone (self-registration)
    let student: any = null;
    const existing: any = await strapi.entityService.findMany(
      "api::student.student",
      {
        filters: { phone: { $eq: phone } },
        limit: 1,
      }
    );
    student = Array.isArray(existing) ? existing[0] : (existing ?? null);
    if (!student) {
      student = await strapi.entityService.create("api::student.student", {
        data: {
          phone,
          name: "مستخدم",
          password: code,
          hasParent: false,
          role: "student",
        },
      });
    }

    ctx.body = { ok: true, student };
  },
};
