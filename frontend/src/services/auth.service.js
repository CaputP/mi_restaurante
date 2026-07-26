import { apiRequest } from "./api";

export async function loginRequest(correo, password) {
    const response = await apiRequest("/auth/login", {
        method: "POST",
        body: {
            correo,
            password
        }
    });

    return response.data;
}

export async function registerRequest(data) {
    const response = await apiRequest("/auth/register", {
        method: "POST",
        body: data
    });

    return response.data;
}

export async function getCurrentUserRequest(token) {
    const response = await apiRequest("/auth/me", {
        token
    });

    return response.data.usuario;
}

export async function forgotPasswordRequest(correo) {
    const response = await apiRequest(
        "/auth/password/forgot",
        {
            method: "POST",
            body: {
                correo
            }
        }
    );

    return response;
}

export async function resetPasswordRequest({
    token,
    password,
    confirmarPassword
}) {
    const response = await apiRequest(
        "/auth/password/reset",
        {
            method: "POST",
            body: {
                token,
                password,
                confirmarPassword
            }
        }
    );

    return response;
}

export async function confirmEmailRequest(token) {
    const response = await apiRequest(
        "/auth/email-verification/confirm",
        {
            method: "POST",
            body: {
                token
            }
        }
    );

    return response;
}

export async function resendVerificationEmailRequest(
    token
) {
    const response = await apiRequest(
        "/auth/email-verification/request",
        {
            method: "POST",
            token,
            body: {}
        }
    );

    return response;
}

export async function googleLoginRequest(
    credential
) {
    const response = await apiRequest(
        "/auth/google",
        {
            method: "POST",
            body: {
                credential
            }
        }
    );

    return response.data;
}