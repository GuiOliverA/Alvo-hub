import {
    getSupabaseStatus,
    signInWithSupabase,
    signUpWithSupabase,
    resetPasswordSupabase,
    updatePasswordSupabase,
    onSupabaseAuthStateChange,
    getSupabaseSession,
} from "./supabase.js";

const authForm = document.querySelector("form.auth-form");
const messageBox = document.querySelector(".message-box");
let recoveryMode = false;

function setMessage(text) {
    if (!messageBox) return;
    messageBox.textContent = text;
    messageBox.classList.remove("hidden");
}

function clearMessage() {
    if (!messageBox) return;
    messageBox.textContent = "";
    messageBox.classList.add("hidden");
}

function isSupabaseReady() {
    const status = getSupabaseStatus();
    return status.enabled;
}

function activatePasswordReset() {
    if (recoveryMode) return;
    recoveryMode = true;

    const emailGroup = document.getElementById("recoverEmail")?.closest(".input-group");
    const passwordFields = document.getElementById("newPasswordFields");
    const submitButton = document.getElementById("recoverSubmit");
    const description = document.getElementById("recoverDescription");

    emailGroup?.classList.add("hidden");
    passwordFields?.classList.remove("hidden");
    if (submitButton) submitButton.textContent = "Redefinir senha";
    if (description) description.textContent = "Defina uma nova senha para continuar acessando sua conta.";
    document.getElementById("newPassword")?.focus();
}

function onlyDigits(value = "") {
    return value.replace(/\D/g, "");
}

function formatCpf(value) {
    const digits = onlyDigits(value).slice(0, 11);
    return digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatPhone(value) {
    const digits = onlyDigits(value).slice(0, 11);
    if (digits.length <= 10) {
        return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    }
    return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

function isValidCpf(value) {
    const cpf = onlyDigits(value);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    const calculateDigit = (base, factor) => {
        const total = base.split("").reduce((sum, digit, index) => sum + Number(digit) * (factor - index), 0);
        const remainder = (total * 10) % 11;
        return remainder === 10 ? 0 : remainder;
    };

    return calculateDigit(cpf.slice(0, 9), 10) === Number(cpf[9]) &&
        calculateDigit(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

document.addEventListener("DOMContentLoaded", () => {
    if (!authForm) return;

    if (authForm.id === "recoverForm" && window.location.hash.includes("type=recovery")) {
        activatePasswordReset();
    }

    if (authForm.id === "recoverForm" && isSupabaseReady()) {
        getSupabaseSession().then(({ data }) => {
            if (data.session) activatePasswordReset();
        });
    }

    const authSubscription = onSupabaseAuthStateChange((event) => {
        if (authForm.id === "recoverForm" && event === "PASSWORD_RECOVERY") {
            activatePasswordReset();
        }
    });

    window.addEventListener("beforeunload", () => {
        authSubscription?.data?.subscription?.unsubscribe();
    });

    const cpfInput = document.getElementById("registerCpf");
    const phoneInput = document.getElementById("registerWhatsapp");
    cpfInput?.addEventListener("input", () => {
        cpfInput.value = formatCpf(cpfInput.value);
    });
    phoneInput?.addEventListener("input", () => {
        phoneInput.value = formatPhone(phoneInput.value);
    });

    authForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearMessage();

        const formData = new FormData(authForm);
        const values = Object.fromEntries(formData.entries());

        if (authForm.id === "loginForm") {
            const user = values.loginUser?.trim();
            const password = values.loginPassword?.trim();

            if (!user || !password) {
                setMessage("Por favor, informe e-mail e senha.");
                return;
            }

            if (isSupabaseReady()) {
                if (!user.includes("@")) {
                    setMessage("Use seu e-mail para login com Supabase.");
                    return;
                }

                setMessage("Entrando...");
                try {
                    const response = await signInWithSupabase(user, password);
                    if (response.error) {
                        setMessage(response.error.message || "Falha no login.");
                        return;
                    }

                    setMessage("Login realizado com sucesso. Redirecionando...");
                    setTimeout(() => {
                        window.location.href = "/conteudo";
                    }, 800);
                } catch (error) {
                    setMessage(error.message || "Erro ao conectar com o servidor.");
                }
                return;
            }

            setMessage("Login simulado realizado com sucesso. Redirecionando...");
            setTimeout(() => {
                window.location.href = "/conteudo";
            }, 900);
            return;
        }

        if (authForm.id === "registerForm") {
            const nome = values.registerName?.trim();
            const cpf = values.registerCpf?.trim();
            const email = values.registerEmail?.trim();
            const whatsapp = values.registerWhatsapp?.trim();
            const password = values.registerPassword?.trim();
            const passwordConfirmation = values.registerPasswordConfirmation?.trim();

            if (!nome || !cpf || !email || !whatsapp || !password || !passwordConfirmation) {
                setMessage("Preencha todos os campos para criar sua conta.");
                return;
            }

            if (!isValidCpf(cpf)) {
                setMessage("Informe um CPF válido.");
                return;
            }

            if (onlyDigits(whatsapp).length < 10) {
                setMessage("Informe um telefone válido com DDD.");
                return;
            }

            if (password.length < 6) {
                setMessage("A senha deve ter pelo menos 6 caracteres.");
                return;
            }

            if (password !== passwordConfirmation) {
                setMessage("A confirmação de senha não corresponde à senha informada.");
                return;
            }

            if (isSupabaseReady()) {
                setMessage("Criando conta...");
                try {
                    const response = await signUpWithSupabase({
                        email,
                        password,
                        nome,
                        cpf,
                        whatsapp,
                    });

                    if (response.error) {
                        setMessage(response.error.message || "Falha ao criar conta.");
                        return;
                    }

                    setMessage("Conta criada com sucesso. Verifique seu e-mail para confirmação.");
                    setTimeout(() => {
                        window.location.href = "/";
                    }, 1200);
                } catch (error) {
                    setMessage(error.message || "Erro ao conectar com o servidor.");
                }
                return;
            }

            setMessage("Conta criada com sucesso no modo simulado. Você pode fazer login agora.");
            setTimeout(() => {
                window.location.href = "/";
            }, 1200);
            return;
        }

        if (authForm.id === "recoverForm") {
            if (recoveryMode) {
                const newPassword = values.newPassword?.trim();
                const confirmNewPassword = values.confirmNewPassword?.trim();

                if (!newPassword || !confirmNewPassword) {
                    setMessage("Informe e confirme a nova senha.");
                    return;
                }

                if (newPassword.length < 6) {
                    setMessage("A senha deve ter pelo menos 6 caracteres.");
                    return;
                }

                if (newPassword !== confirmNewPassword) {
                    setMessage("A confirmação de senha não corresponde à nova senha.");
                    return;
                }

                if (!isSupabaseReady()) {
                    setMessage("O Supabase não está configurado para redefinir a senha.");
                    return;
                }

                setMessage("Redefinindo senha...");
                try {
                    const response = await updatePasswordSupabase(newPassword);
                    if (response.error) {
                        setMessage(response.error.message || "Não foi possível redefinir a senha.");
                        return;
                    }

                    setMessage("Senha redefinida com sucesso. Redirecionando para o login...");
                    setTimeout(() => {
                        window.location.href = "/";
                    }, 1200);
                } catch (error) {
                    setMessage(error.message || "Erro ao conectar com o servidor.");
                }
                return;
            }

            const email = values.recoverEmail?.trim();

            if (!email) {
                setMessage("Informe o e-mail cadastrado para recuperar sua senha.");
                return;
            }

            if (isSupabaseReady()) {
                setMessage("Enviando instruções de recuperação...");
                try {
                    const response = await resetPasswordSupabase(email);
                    if (response.error) {
                        setMessage(response.error.message || "Falha ao solicitar recuperação.");
                        return;
                    }

                    setMessage("E-mail de recuperação enviado. Verifique sua caixa de entrada.");
                } catch (error) {
                    setMessage(error.message || "Erro ao conectar com o servidor.");
                }
                return;
            }

            setMessage("Solicitação recebida. Enviaremos instruções para o e-mail cadastrado em breve.");
            return;
        }
    });
});
