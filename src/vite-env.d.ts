/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SWEEP_URL?: string;
  readonly VITE_SWEEP_REQUIRE_AUTH?: string;
  // add other VITE_ env vars you use here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
