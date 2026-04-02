/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 生产环境填后端完整根地址，无尾部斜杠，如 https://xxx.up.railway.app；本地留空即可走 Vite 代理 */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
