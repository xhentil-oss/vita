import emailjs from "@emailjs/browser";

const STORAGE_KEY_SERVICE  = "vita_emailjs_service_id";
const STORAGE_KEY_TEMPLATE = "vita_emailjs_template_id";
const STORAGE_KEY_PUBKEY   = "vita_emailjs_public_key";

export interface EmailJSConfig {
  serviceId:  string;
  templateId: string;
  publicKey:  string;
}

export function getEmailJSConfig(): EmailJSConfig {
  return {
    serviceId:  localStorage.getItem(STORAGE_KEY_SERVICE)  ?? "",
    templateId: localStorage.getItem(STORAGE_KEY_TEMPLATE) ?? "",
    publicKey:  localStorage.getItem(STORAGE_KEY_PUBKEY)   ?? "",
  };
}

export function saveEmailJSConfig(cfg: EmailJSConfig) {
  localStorage.setItem(STORAGE_KEY_SERVICE,  cfg.serviceId.trim());
  localStorage.setItem(STORAGE_KEY_TEMPLATE, cfg.templateId.trim());
  localStorage.setItem(STORAGE_KEY_PUBKEY,   cfg.publicKey.trim());
}

export function isEmailJSConfigured(): boolean {
  const { serviceId, templateId, publicKey } = getEmailJSConfig();
  return !!(serviceId && templateId && publicKey);
}

export interface SendInviteParams {
  toEmail:     string;
  roleName:    string;
  platformUrl: string;
  fromName?:   string;
}

/**
 * Dërgon email automatikisht përmes EmailJS.
 * Kthen true nëse u dërgua me sukses, false nëse config mungon ose dërgimi dështoi.
 */
export async function sendInviteEmail(params: SendInviteParams): Promise<{ ok: boolean; error?: string }> {
  const cfg = getEmailJSConfig();
  if (!cfg.serviceId || !cfg.templateId || !cfg.publicKey) {
    return { ok: false, error: "EmailJS not configured" };
  }

  try {
    await emailjs.send(
      cfg.serviceId,
      cfg.templateId,
      {
        to_email:     params.toEmail,
        to_name:      params.toEmail.split("@")[0],
        role_name:    params.roleName,
        platform_url: params.platformUrl,
        from_name:    params.fromName ?? "Vita Medical Team",
      },
      cfg.publicKey
    );
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.text ?? err?.message ?? "Unknown EmailJS error" };
  }
}
