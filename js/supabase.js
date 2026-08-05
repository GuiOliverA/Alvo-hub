import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const CONTENT_BUCKET = "conteudos";

const SUPABASE_URL = "https://yndntlshxmnogjmzqssj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluZG50bHNoeG1ub2dqbXpxc3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTAyMjAsImV4cCI6MjEwMTQyNjIyMH0.6zEK_g_RQn5IgSiWVRXkMS-EX4ILDMw5DqgXSrxKlQw";

const hasSupabaseConfig =
    SUPABASE_URL !== "https://YOUR_PROJECT_REF.supabase.co" &&
    SUPABASE_ANON_KEY !== "YOUR_PUBLIC_ANON_KEY";

const supabaseClient = hasSupabaseConfig
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

function getSupabaseStatus() {
    return { enabled: Boolean(supabaseClient), url: SUPABASE_URL };
}

async function signInWithSupabase(email, password) {
    if (!supabaseClient) throw new Error("Supabase não está configurado.");
    return supabaseClient.auth.signInWithPassword({ email, password });
}

async function signUpWithSupabase({ email, password, nome, cpf, whatsapp }) {
    if (!supabaseClient) throw new Error("Supabase não está configurado.");
    return supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { nome, cpf, whatsapp } }
    });
}

async function resetPasswordSupabase(email) {
    if (!supabaseClient) throw new Error("Supabase não está configurado.");
    return supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/security/senha-recup`,
    });
}

async function fetchContentItems() {
    if (!supabaseClient) return [];
    const { data, error } = await supabaseClient
        .from("conteudos")
        .select("*")
        .eq("status", "ativo")
        .order("data_publicacao", { ascending: false });
    if (error) {
        console.warn("Supabase fetchContentItems error:", error.message);
        return [];
    }
    return Array.isArray(data) ? data : [];
}

async function fetchTags() {
    if (!supabaseClient) return [];
    const { data, error } = await supabaseClient.from("conteudos").select("categoria");
    if (error) {
        console.warn("Supabase fetchTags error:", error.message);
        return [];
    }
    const uniqueTags = Array.from(
        new Set(data.map((item) => item.categoria || "").filter(Boolean))
    );
    return ["all", ...uniqueTags];
}

async function insertContentItem(item) {
    if (!supabaseClient) throw new Error("Supabase não está configurado.");
    const { data, error } = await supabaseClient.from("conteudos").insert([item]).select().single();
    if (error) throw error;
    return data;
}

function getSafeFileName(name) {
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-");
}

async function uploadContentFile(file) {
    if (!supabaseClient) throw new Error("Supabase não está configurado.");

    const path = `uploads/${crypto.randomUUID()}-${getSafeFileName(file.name)}`;
    const { error } = await supabaseClient.storage.from(CONTENT_BUCKET).upload(path, file, {
        cacheControl: "3600",
        contentType: file.type || "application/octet-stream",
        upsert: false,
    });

    if (error) throw error;

    const { data } = supabaseClient.storage.from(CONTENT_BUCKET).getPublicUrl(path);
    return { path, url: data.publicUrl };
}

async function removeContentFile(path) {
    if (!supabaseClient || !path) return;
    await supabaseClient.storage.from(CONTENT_BUCKET).remove([path]);
}

export {
    getSupabaseStatus,
    signInWithSupabase,
    signUpWithSupabase,
    resetPasswordSupabase,
    fetchContentItems,
    fetchTags,
    insertContentItem,
    uploadContentFile,
    removeContentFile,
};
