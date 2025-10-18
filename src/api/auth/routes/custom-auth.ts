export default {
  routes: [
    {
      method: "POST",
      path: "/auth/request-otp",
      handler: "custom-auth.requestOtp",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/auth/verify-otp",
      handler: "custom-auth.verifyOtp",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/auth/password-login",
      handler: "custom-auth.passwordLogin",
      config: { auth: false },
    },
  ],
};
