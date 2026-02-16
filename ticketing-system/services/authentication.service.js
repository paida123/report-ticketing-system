import { apiUrl } from "../api/api";

class AuthenticationService {

    // Login with email + password
    login(credentials) {
        return apiUrl.post("tickets/auth/login", credentials);
    }

    // Logout (clears refresh token cookie)
    logout() {
        return apiUrl.get("tickets/auth/logout");
    }

    // Refresh access token using httpOnly cookie
    refresh() {
        return apiUrl.get("tickets/auth/refresh");
    }

    // Request password reset email
    forgotPassword(email) {
        return apiUrl.post("tickets/auth/forgot-password", { email });
    }


    passwordReset(token, password) {
        return apiUrl.post(`tickets/auth/password-reset/${token}`, { password });
    }

    // MFA setup - returns QR code and secret (requires JWT)
    mfaSetup() {
        return apiUrl.get("tickets/auth/mfa-setup");
    }

    // Verify MFA setup with TOTP code (requires JWT)
    mfaVerify(code) {
        return apiUrl.post("tickets/auth/mfa-verify", { code });
    }

    // MFA challenge during login (requires JWT)
    mfaChallenge(code) {
        return apiUrl.post("tickets/auth/mfa-challenge", { code });
    }

    // MFA recovery using backup code (requires JWT)
    mfaRecovery(code) {
        return apiUrl.post("tickets/auth/mfa-recovery", { code });
    }

}

export default new AuthenticationService();