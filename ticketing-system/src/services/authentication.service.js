import { apiUrl, apiPublic } from "../api/api";

class AuthenticationService {

    // Use apiPublic for auth endpoints to avoid interceptor refresh loops
    login(credentials) {
        return apiPublic.post("tickets/auth/login", credentials);
    }

    logout() {
        return apiPublic.get("tickets/auth/logout");
    }

    refresh() {
        return apiPublic.get("tickets/auth/refresh");
    }

    forgotPassword(email) {
        return apiPublic.post("tickets/auth/forgot-password", { email });
    }

    passwordReset(token, password) {
        return apiPublic.post(`tickets/auth/password-reset/${token}`, { password });
    }

   
    mfaSetup() {
        return apiUrl.get("tickets/auth/mfa-setup");
    }

   
    mfaVerify(code) {
        return apiUrl.post("tickets/auth/mfa-verify", { code });
    }

    
    mfaChallenge(code) {
        return apiUrl.post("tickets/auth/mfa-challenge", { code });
    }


    mfaRecovery(code) {
        return apiUrl.post("tickets/auth/mfa-recovery", { code });
    }

}

export default new AuthenticationService();