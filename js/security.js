import {
    getSupabaseStatus,
    signInWithSupabase,
    signUpWithSupabase,
    resetPasswordSupabase,
} from "./supabase.js";

const authForm = document.querySelector("form.auth-form");
const messageBox = document.querySelector(".message-box");

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

document.addEventListener("DOMContentLoaded", () => {
    if (!authForm) return;

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
            const cpf = values.registerCpf?.trim();
            const email = values.registerEmail?.trim();
            const whatsapp = values.registerWhatsapp?.trim();
            const password = values.registerPassword?.trim();

            if (!cpf || !email || !whatsapp || !password) {
                setMessage("Preencha todos os campos para criar sua conta.");
                return;
            }

            if (isSupabaseReady()) {
                setMessage("Criando conta...");
                try {
                    const response = await signUpWithSupabase({
                        email,
                        password,
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
