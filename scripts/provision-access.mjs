#!/usr/bin/env node
import { readConfig } from "./read-config.mjs";
// Bootstrap owned Elo resources only. No credentials are emitted to stdout.
import {
  mkdir,
  readFile,
  writeFile,
  chmod,
  rename,
  lstat,
} from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

export async function provisionAccess(options, transport = fetch) {
  const {
    token,
    accountId,
    expectedAccountName,
    publicOrigin,
    workerName,
    stateDirectory,
  } = options;
  if (
    !token ||
    !/^[a-f0-9]{32}$/.test(accountId ?? "") ||
    !expectedAccountName ||
    !/^elo(?:-[a-z0-9-]+)?$/.test(workerName ?? "")
  )
    throw new Error("Configuração de instalação inválida.");
  const origin = new URL(publicOrigin);
  if (origin.protocol !== "https:" || origin.origin !== publicOrigin)
    throw new Error("Origem HTTPS exata obrigatória.");
  // Verify the local deployment target before any remote creation or secret mutation.
  if (options.wranglerPath) {
    const config = await readConfig(resolve(options.wranglerPath));
    if (config.name !== workerName || config.account_id !== accountId)
      throw new Error("Configuração Wrangler não pertence ao alvo autorizado.");
  }

  async function api(path, method = "GET", body) {
    const response = await transport(
      `https://api.cloudflare.com/client/v4${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(20000),
        redirect: "error",
      },
    );
    const data = await response.json();
    if (!response.ok || !data.success)
      throw new Error(
        `Cloudflare recusou a etapa (${response.status}); nenhum segredo foi registrado no erro.`,
      );
    return data.result;
  }
  const account = await api(`/accounts/${accountId}`);
  if (account.name !== expectedAccountName || account.id !== accountId)
    throw new Error("A conta não corresponde ao alvo autorizado.");
  const profile = await api("/user");
  if (
    typeof profile.id !== "string" ||
    !profile.id ||
    typeof profile.email !== "string" ||
    !/^[^\s@]+@[^\s@]+$/.test(profile.email) ||
    profile.suspended === true
  )
    throw new Error("Perfil administrativo Cloudflare inválido ou suspenso.");
  // /user authenticates the administrative profile; it does not expose email_verified.
  const ownerEmail = profile.email.toLowerCase();
  const organization = await api(`/accounts/${accountId}/access/organizations`);
  if (
    !organization?.auth_domain ||
    !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(organization.auth_domain)
  )
    throw new Error(
      "Conta Zero Trust ainda não inicializada. A IA deve concluir essa etapa da conta e retomar.",
    );
  const providers = await api(
    `/accounts/${accountId}/access/identity_providers`,
  );
  const otpProviders = Array.isArray(providers)
    ? providers.filter((provider) => provider?.type === "onetimepin")
    : [];
  if (
    otpProviders.length !== 1 ||
    typeof otpProviders[0].id !== "string" ||
    !otpProviders[0].id.trim()
  )
    throw new Error(
      "A instalação exige exatamente um provedor OTP existente. Nenhum provedor global foi alterado.",
    );
  const otpId = otpProviders[0].id;
  function requireOtpOnly(app) {
    // The Access API contract pins providers through allowed_idps. The optional
    // legacy flag is not in its schema; absence is normal, explicit widening is not.
    if (
      (app.allow_all_identity_providers !== undefined &&
        app.allow_all_identity_providers !== false) ||
      !Array.isArray(app.allowed_idps) ||
      app.allowed_idps.length !== 1 ||
      app.allowed_idps[0] !== otpId
    )
      throw new Error(
        "Aplicação Elo diverge da restrição exclusiva ao OTP selecionado. Interrompido sem corrigir em silêncio.",
      );
  }
  const appName = `Elo · ${workerName} · ${origin.hostname}`;
  const callback = `${publicOrigin}/callback`;
  const stateDir = resolve(
    stateDirectory ??
      join(homedir(), ".local", "state", "elo", `${accountId}-${workerName}`),
  );
  await mkdir(stateDir, { recursive: true, mode: 0o700 });
  const directoryStat = await lstat(stateDir);
  if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory())
    throw new Error("Diretório de estado inválido.");
  await chmod(stateDir, 0o700);
  const statePath = join(stateDir, "access-private.json");
  let state;
  try {
    const stat = await lstat(statePath);
    if (stat.isSymbolicLink() || !stat.isFile() || (stat.mode & 0o077) !== 0)
      throw new Error("Estado privado precisa de permissão 0600.");
    state = JSON.parse(await readFile(statePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (
    state &&
    (state.accountId !== accountId ||
      state.publicOrigin !== publicOrigin ||
      state.workerName !== workerName ||
      state.ownerEmail !== ownerEmail)
  )
    throw new Error(
      "O estado salvo pertence a outra instalação ou identidade.",
    );
  async function save() {
    const temporary = join(stateDir, `access-${randomUUID()}.tmp`);
    await writeFile(temporary, JSON.stringify(state), {
      mode: 0o600,
      flag: "wx",
    });
    await rename(temporary, statePath);
  }
  const policy = {
    name: `Elo owner only · ${workerName}`,
    decision: "allow",
    include: [{ email: { email: ownerEmail } }],
    exclude: [],
    require: [],
    session_duration: "24h",
  };
  const desired = {
    name: appName,
    type: "saas",
    allowed_idps: [otpId],
    app_launcher_visible: false,
    auto_redirect_to_identity: false,
    saas_app: {
      auth_type: "oidc",
      redirect_uris: [callback],
      scopes: ["openid", "email"],
      grant_types: ["authorization_code_with_pkce", "refresh_tokens"],
      allow_pkce_without_client_secret: false,
      access_token_lifetime: "15m",
      refresh_token_options: { lifetime: "7d" },
    },
  };
  const listed = await api(
    `/accounts/${accountId}/access/apps?name=${encodeURIComponent(appName)}&per_page=100`,
  );
  const apps = listed.filter((app) => app.name === appName);
  if (apps.length > 1)
    throw new Error(
      "Aplicações Elo duplicadas; a IA deve conciliar antes de retomar.",
    );
  let app = apps[0];
  // Reject drift before reading or publishing Worker secrets or updating the app.
  if (app) requireOtpOnly(app);
  const prefix = `/accounts/${accountId}/workers/scripts/${workerName}`;
  const existingSecrets = await api(`${prefix}/secrets`);
  const existingNames = new Set(existingSecrets.map((secret) => secret.name));
  const requiredNames = [
    "ACCESS_CLIENT_SECRET",
    "OWNER_EMAIL",
    "ENCRYPTION_KEY",
    "AUTH_EPOCH",
  ];
  if (!app) {
    app = await api(`/accounts/${accountId}/access/apps`, "POST", {
      ...desired,
      policies: [policy],
    });
    if (!app.saas_app?.client_secret || !app.saas_app?.client_id)
      throw new Error(
        "A criação não retornou credenciais OIDC. Interrompido sem abrir acesso.",
      );
    state = {
      accountId,
      publicOrigin,
      workerName,
      ownerEmail,
      appId: app.id,
      clientId: app.saas_app.client_id,
      clientSecret: app.saas_app.client_secret,
      encryptionKey: randomBytes(32).toString("hex"),
      authEpoch: randomUUID(),
    };
    await save(); // Persist once-only secret before any further network request.
    requireOtpOnly(app);
  } else {
    if (
      state &&
      (state.appId !== app.id || state.clientId !== app.saas_app?.client_id)
    )
      throw new Error("O estado salvo não corresponde à aplicação Elo.");
    if (
      app.type !== "saas" ||
      app.saas_app.auth_type !== "oidc" ||
      app.saas_app.redirect_uris?.length !== 1 ||
      app.saas_app.redirect_uris[0] !== callback
    )
      throw new Error("Aplicação existente diverge do Elo autorizado.");
    // Never mutate reusable policies that may belong to other applications.
    const policies = await api(
      `/accounts/${accountId}/access/apps/${app.id}/policies`,
    );
    if (
      policies.length !== 1 ||
      policies[0].name !== policy.name ||
      policies[0].decision !== "allow" ||
      JSON.stringify(policies[0].include) !== JSON.stringify(policy.include) ||
      (policies[0].exclude?.length ?? 0) > 0 ||
      (policies[0].require?.length ?? 0) > 0
    )
      throw new Error(
        "A política atual diverge da restrição ao dono. Interrompido para revisão da IA.",
      );
    if (!state) {
      if (
        !requiredNames.every((name) => existingNames.has(name)) ||
        typeof app.saas_app.client_id !== "string"
      )
        throw new Error(
          "Aplicação existente sem estado recuperável e secrets incompletos. A IA deve recuperar o bootstrap privado.",
        );
      state = {
        accountId,
        publicOrigin,
        workerName,
        ownerEmail,
        appId: app.id,
        clientId: app.saas_app.client_id,
        externalBootstrap: true,
      };
      await save(); // Public identity only: connector bootstrap keeps secret values inside Cloudflare.
    }
    if (
      state.externalBootstrap &&
      !requiredNames.every((name) => existingNames.has(name))
    )
      throw new Error(
        "Aplicação existente sem estado recuperável e secrets incompletos. A IA deve recuperar o bootstrap privado.",
      );
    const differs =
      JSON.stringify([...(app.saas_app.grant_types ?? [])].sort()) !==
        JSON.stringify([...desired.saas_app.grant_types].sort()) ||
      app.saas_app.access_token_lifetime !==
        desired.saas_app.access_token_lifetime ||
      app.saas_app.refresh_token_options?.lifetime !== "7d" ||
      app.saas_app.allow_pkce_without_client_secret !== false;
    if (differs) {
      if (state.externalBootstrap)
        throw new Error(
          "Aplicação externa diverge da configuração OIDC necessária. A IA deve conciliar sem recuperar valores de secrets.",
        );
      await api(`/accounts/${accountId}/access/apps/${app.id}`, "PUT", {
        ...desired,
        saas_app: { ...desired.saas_app, client_id: state.clientId },
        policies: [policy],
      });
    }
  }
  // Bootstrap secrets only when this installer owns recoverable private state.
  if (!state.externalBootstrap) {
    for (const [name, text] of Object.entries({
      ACCESS_CLIENT_SECRET: state.clientSecret,
      OWNER_EMAIL: ownerEmail,
      ENCRYPTION_KEY: state.encryptionKey,
      AUTH_EPOCH: state.authEpoch,
    })) {
      if (!existingNames.has(name))
        await api(`${prefix}/secrets`, "PUT", {
          name,
          text,
          type: "secret_text",
        });
    }
  } // Never restore an old AUTH_EPOCH or encryption key over an administrative rotation.
  const bindings = {
    PUBLIC_ORIGIN: publicOrigin,
    ACCESS_TEAM_DOMAIN: organization.auth_domain,
    ACCESS_CLIENT_ID: state.clientId,
    MAINTENANCE: "false",
  };
  await writeFile(
    join(stateDir, "access-bindings.json"),
    JSON.stringify(bindings, null, 2),
    { mode: 0o600 },
  );
  if (options.wranglerPath) {
    const path = resolve(options.wranglerPath);
    const config = await readConfig(path);
    if (config.name !== workerName || config.account_id !== accountId)
      throw new Error("Configuração Wrangler não pertence ao alvo autorizado.");
    config.vars = { ...config.vars, ...bindings };
    await writeFile(path, `${JSON.stringify(config, null, 2)}\n`);
  }
  return {
    status: "configured",
    workerName,
    applicationId: state.appId,
    publicOrigin,
    teamDomain: organization.auth_domain,
    ownerPolicyRestricted: true,
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  provisionAccess({
    token: process.env.CLOUDFLARE_API_TOKEN,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    expectedAccountName: process.env.ELO_EXPECTED_ACCOUNT_NAME,
    publicOrigin: process.env.ELO_PUBLIC_ORIGIN,
    workerName: process.env.ELO_WORKER_NAME ?? "elo",
    stateDirectory: process.env.ELO_PRIVATE_STATE_DIRECTORY,
    wranglerPath: process.env.ELO_WRANGLER_PATH,
  })
    .then((result) => console.log(JSON.stringify(result)))
    .catch(() => {
      console.error(
        "Instalação Access interrompida com segurança. A IA deve verificar permissões, recursos Elo e estado privado antes de retomar. Nenhum segredo foi exibido.",
      );
      process.exitCode = 1;
    });
}
