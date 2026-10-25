import { requirePassword } from "../_auth.js";

export const onRequest = requirePassword;
