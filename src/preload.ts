/// <reference path="../typings/naimo.d.ts" />

import { contextBridge } from 'electron';
import https from 'https';
import crypto from 'crypto';

// ==================== 类型定义 ====================

/**
 * 翻译请求参数
 */
interface TranslateParams {
  sourceText: string;
  source: string;
  target: string;
  settings: {
    secretId: string;
    secretKey: string;
    region?: string;
  };
}

/**
 * 翻译结果
 */
interface TranslateResult {
  success: boolean;
  translatedText?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  error?: string;
  errorCode?: string;
  rawResponse?: any;
  rawData?: string;
}

/**
 * 翻译插件 API
 */
interface TranslatePluginAPI {
  translateText: (params: TranslateParams) => Promise<TranslateResult>;
}

// ==================== 腾讯云翻译 API 工具函数 ====================

/**
 * 计算 SHA256 HMAC
 */
function sha256(message: string, secret: string = "", encoding?: crypto.BinaryToTextEncoding): Buffer | string {
  const hmac = crypto.createHmac("sha256", secret);
  return encoding ? hmac.update(message).digest(encoding) : hmac.update(message).digest();
}

/**
 * 计算 SHA256 Hash
 */
function getHash(message: string, encoding: crypto.BinaryToTextEncoding = "hex"): string {
  const hash = crypto.createHash("sha256");
  return hash.update(message).digest(encoding);
}

/**
 * 获取日期字符串（UTC）
 */
function getDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const year = date.getUTCFullYear();
  const month = ("0" + (date.getUTCMonth() + 1)).slice(-2);
  const day = ("0" + date.getUTCDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

/**
 * 调用腾讯云翻译API
 */
async function translateText(params: TranslateParams): Promise<TranslateResult> {
  return new Promise((resolve) => {
    try {
      const { sourceText, source, target, settings } = params;
      const SECRET_ID = settings.secretId;
      const SECRET_KEY = settings.secretKey;
      const TOKEN = "";

      if (!SECRET_ID || !SECRET_KEY) {
        resolve({
          success: false,
          error: "请先在插件设置中配置腾讯云API密钥"
        });
        return;
      }

      const host = "tmt.tencentcloudapi.com";
      const service = "tmt";
      const region = settings.region || "ap-chengdu";
      const action = "TextTranslate";
      const version = "2018-03-21";
      const timestamp = Math.floor(Date.now() / 1000);
      const date = getDate(timestamp);

      const payload = JSON.stringify({
        SourceText: sourceText,
        Source: source,
        Target: target,
        ProjectId: 0
      });

      // ************* 步骤 1：拼接规范请求串 *************
      const signedHeaders = "content-type;host";
      const hashedRequestPayload = getHash(payload);
      const httpRequestMethod = "POST";
      const canonicalUri = "/";
      const canonicalQueryString = "";
      const canonicalHeaders =
        "content-type:application/json; charset=utf-8\n" + "host:" + host + "\n";

      const canonicalRequest =
        httpRequestMethod +
        "\n" +
        canonicalUri +
        "\n" +
        canonicalQueryString +
        "\n" +
        canonicalHeaders +
        "\n" +
        signedHeaders +
        "\n" +
        hashedRequestPayload;

      // ************* 步骤 2：拼接待签名字符串 *************
      const algorithm = "TC3-HMAC-SHA256";
      const hashedCanonicalRequest = getHash(canonicalRequest);
      const credentialScope = date + "/" + service + "/" + "tc3_request";
      const stringToSign =
        algorithm +
        "\n" +
        timestamp +
        "\n" +
        credentialScope +
        "\n" +
        hashedCanonicalRequest;

      // ************* 步骤 3：计算签名 *************
      const kDate = sha256(date, "TC3" + SECRET_KEY);
      const kService = sha256(service, kDate as string);
      const kSigning = sha256("tc3_request", kService as string);
      const signature = sha256(stringToSign, kSigning as string, "hex");

      // ************* 步骤 4：拼接 Authorization *************
      const authorization =
        algorithm +
        " " +
        "Credential=" +
        SECRET_ID +
        "/" +
        credentialScope +
        ", " +
        "SignedHeaders=" +
        signedHeaders +
        ", " +
        "Signature=" +
        signature;

      // ************* 步骤 5：构造并发起请求 *************
      const headers: https.RequestOptions['headers'] = {
        Authorization: authorization,
        "Content-Type": "application/json; charset=utf-8",
        Host: host,
        "X-TC-Action": action,
        "X-TC-Timestamp": timestamp.toString(),
        "X-TC-Version": version,
      };

      if (region) {
        headers["X-TC-Region"] = region;
      }
      if (TOKEN) {
        headers["X-TC-Token"] = TOKEN;
      }

      const options: https.RequestOptions = {
        hostname: host,
        method: httpRequestMethod,
        headers,
        timeout: 30000 // 30秒超时
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const result = JSON.parse(data);

            if (result.Response && result.Response.Error) {
              resolve({
                success: false,
                error: `翻译失败: ${result.Response.Error.Message}`,
                errorCode: result.Response.Error.Code
              });
            } else if (result.Response && result.Response.TargetText) {
              resolve({
                success: true,
                translatedText: result.Response.TargetText,
                sourceLanguage: result.Response.Source || source,
                targetLanguage: result.Response.Target || target
              });
            } else {
              resolve({
                success: false,
                error: "翻译响应格式异常",
                rawResponse: result
              });
            }
          } catch (error) {
            resolve({
              success: false,
              error: `解析响应失败: ${(error as Error).message}`,
              rawData: data
            });
          }
        });
      });

      req.on("error", (error) => {
        resolve({
          success: false,
          error: `网络请求失败: ${error.message}`
        });
      });

      req.on("timeout", () => {
        req.destroy();
        resolve({
          success: false,
          error: "请求超时，请检查网络连接"
        });
      });

      req.write(payload);
      req.end();

    } catch (error) {
      resolve({
        success: false,
        error: `翻译服务异常: ${(error as Error).message}`
      });
    }
  });
}

// ==================== 暴露 API 给渲染进程 ====================

const translatePluginAPI: TranslatePluginAPI = {
  translateText
};

contextBridge.exposeInMainWorld('translatePluginAPI', translatePluginAPI);

// ==================== 功能处理器导出 ====================

/**
 * 导出功能处理器
 * 类型定义来自 naimo.d.ts
 */
const handlers: import('../typings/naimo').PluginExports = {
  // 文本翻译功能
  "text-translate": {
    onEnter: async (params: any) => {
      try {
        console.log('翻译功能被触发，参数:', params);

        // 功能已在 UI 中实现
        // 此处 onEnter 主要用于日志记录
      } catch (error) {
        console.error('翻译功能启动失败:', error);
      }
    }
  },

  // 快速翻译功能
  "quick-translate": {
    onEnter: async (params: any) => {
      try {
        console.log('快速翻译功能被触发，参数:', params);

        // 功能已在 UI 中实现
      } catch (error) {
        console.error('快速翻译功能启动失败:', error);
      }
    }
  }
};

// 使用 CommonJS 导出（Electron 环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = handlers;
}

// ==================== 初始化 ====================

window.addEventListener('DOMContentLoaded', () => {
  console.log('翻译插件 Preload 脚本已初始化');
});

// ==================== 类型扩展 ====================

declare global {
  interface Window {
    translatePluginAPI: TranslatePluginAPI;
  }
}
