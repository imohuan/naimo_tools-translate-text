/// <reference path="../typings/naimo.d.ts" />

import "./style.css";

// ==================== 类型定义 ====================
if (import.meta.hot) {
  // import.meta.hot.accept(async (module) => {
  //   console.log('文件已更新，开始执行自定义逻辑...', module);

  //   // 触发 preload 热更新
  //   await window.naimo.hot()

  //   setTimeout(() => {
  //     console.log('自定义逻辑执行完毕。');
  //     import.meta.hot!.invalidate()
  //   }, 0);
  // })

  // 监听 preload 文件变化事件
  import.meta.hot.on("preload-changed", async (data) => {
    console.log("📝 检测到 preload 变化:", data);
    // 触发 preload 构建
    console.log("🔨 正在触发 preload 构建...");
    try {
      const response = await fetch("/__preload_build");
      const result = await response.json();
      if (result.success) {
        console.log("✅ Preload 构建完成");
        // 构建成功后，触发热重载
        await window.naimo.hot();
        console.log("🔄 Preload 热重载完成");
        location.reload();
      } else {
        console.error("❌ Preload 构建失败");
      }
    } catch (error) {
      console.error("❌ 触发 preload 构建失败:", error);
    }
  });
}

/**
 * Naimo API 类型
 */
type NaimoAPI = typeof window.naimo;

/**
 * 翻译插件 API 类型
 */
type TranslatePluginAPI = typeof window.translatePluginAPI;

/**
 * 插件设置
 */
interface PluginSettings {
  secretId?: string;
  secretKey?: string;
  region?: string;
}

/**
 * UI 设置
 */
interface UISettings {
  defaultSource?: string;
  defaultTarget?: string;
  autoDetectTarget?: boolean;
  autoTranslate?: boolean;
}

// ==================== 全局变量 ====================

let pluginSettings: PluginSettings = {};
let autoTranslateTimer: NodeJS.Timeout | null = null;

// ==================== DOM 元素 ====================

const sourceText = document.getElementById("sourceText") as HTMLTextAreaElement;
const targetText = document.getElementById("targetText") as HTMLDivElement;
const sourceLanguage = document.getElementById(
  "sourceLanguage"
) as HTMLSelectElement;
const targetLanguage = document.getElementById(
  "targetLanguage"
) as HTMLSelectElement;
const translateBtn = document.getElementById(
  "translateBtn"
) as HTMLButtonElement;
const copyBtn = document.getElementById("copyBtn") as HTMLButtonElement;
const errorMessage = document.getElementById("errorMessage") as HTMLDivElement;
const successMessage = document.getElementById(
  "successMessage"
) as HTMLDivElement;
const sourceCharCount = document.getElementById(
  "sourceCharCount"
) as HTMLDivElement;
const autoDetectTargetToggle = document.getElementById(
  "autoDetectTargetToggle"
) as HTMLInputElement;
const autoTranslateToggle = document.getElementById(
  "autoTranslateToggle"
) as HTMLInputElement;

// ==================== 初始化 ====================

naimo.onEnter(async (params: any) => {
  console.log("收到参数:", params);
  // 如果有传入的文本，自动填充并翻译
  await tryLoadClipboardText();
  updateCharCount();

  if (params.hotkeyEmit && sourceText.value.trim()) {
    setTimeout(() => translate(), 100);
  }
});

/**
 * 应用初始化
 */
async function initApp(): Promise<void> {
  console.log("翻译插件初始化...");

  const naimo: NaimoAPI = window.naimo;

  await loadSettings();
  setupEventListeners();

  // 尝试从剪贴板加载文本

  naimo.log.info("翻译插件初始化完成");
}

// ==================== 加载设置 ====================

/**
 * 加载插件设置
 */
async function loadSettings(): Promise<void> {
  try {
    const naimo: NaimoAPI = window.naimo;

    if (naimo && naimo.storage) {
      // 直接使用 manifest.json 中定义的 settings name 字段作为 key 获取配置
      pluginSettings = {
        secretId: (await naimo.storage.getItem("secretId")) || "",
        secretKey: (await naimo.storage.getItem("secretKey")) || "",
        region: (await naimo.storage.getItem("region")) || "ap-chengdu",
      };

      // 从 localStorage 获取UI设置（语言选择偏好）
      const uiSettingsJson = localStorage.getItem("translate-ui-settings");
      const uiSettings: UISettings = uiSettingsJson
        ? JSON.parse(uiSettingsJson)
        : {};

      // 设置默认语言
      sourceLanguage.value = uiSettings.defaultSource || "auto";
      targetLanguage.value = uiSettings.defaultTarget || "en";

      // 设置自动检测目标语言开关
      if (autoDetectTargetToggle) {
        autoDetectTargetToggle.checked = uiSettings.autoDetectTarget !== false; // 默认开启
      }

      // 设置自动翻译开关
      if (autoTranslateToggle) {
        autoTranslateToggle.checked = uiSettings.autoTranslate !== false; // 默认开启
      }
    }

    console.log("设置加载完成:", pluginSettings);
  } catch (error) {
    console.error("加载设置失败:", error);
    window.naimo?.log?.error("加载设置失败", error);
  }
}

/**
 * 保存UI设置到 localStorage
 */
function saveUISettings(): void {
  try {
    const uiSettings: UISettings = {
      defaultSource: sourceLanguage.value,
      defaultTarget: targetLanguage.value,
      autoDetectTarget: autoDetectTargetToggle?.checked ?? true,
      autoTranslate: autoTranslateToggle?.checked ?? true,
    };
    localStorage.setItem("translate-ui-settings", JSON.stringify(uiSettings));
  } catch (error) {
    console.error("保存UI设置失败:", error);
  }
}

// ==================== 事件监听 ====================

/**
 * 设置事件监听器
 */
function setupEventListeners(): void {
  // 输入框变化
  sourceText.addEventListener("input", () => {
    updateCharCount();

    // 自动检测语言并设置目标语言
    autoDetectAndSetLanguage();

    // 自动翻译（延迟1秒）- 仅在开关开启时执行
    if (autoTranslateToggle?.checked) {
      clearTimeout(autoTranslateTimer!);
      if (sourceText.value.trim().length > 0) {
        autoTranslateTimer = setTimeout(() => {
          translate();
        }, 1000);
      }
    } else {
      // 如果关闭了自动翻译，清除定时器
      clearTimeout(autoTranslateTimer!);
    }
  });

  // 翻译按钮
  translateBtn.addEventListener("click", translate);

  // 复制按钮
  copyBtn.addEventListener("click", copyResult);

  // 语言选择变化时保存设置
  sourceLanguage.addEventListener("change", saveUISettings);
  targetLanguage.addEventListener("change", saveUISettings);

  // 自动检测目标语言开关变化时保存设置
  if (autoDetectTargetToggle) {
    autoDetectTargetToggle.addEventListener("change", saveUISettings);
  }

  // 自动翻译开关变化时保存设置
  if (autoTranslateToggle) {
    autoTranslateToggle.addEventListener("change", saveUISettings);
  }

  // 键盘快捷键
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    // Ctrl/Cmd + Enter: 翻译
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      translate();
    }

    // Ctrl/Cmd + K: 清空
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      clearAll();
    }
  });
}

// ==================== 语言检测 ====================

/**
 * 强大的语言检测器
 * 检测文本中是否包含中文或英文
 */
function detectLanguage(text: string): "zh" | "en" | "unknown" {
  if (!text || text.trim().length === 0) {
    return "unknown";
  }

  // 中文字符范围：CJK统一汉字、CJK扩展A-E、CJK兼容汉字等
  const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;

  // 英文字符检测：包含字母、数字和常见标点
  const englishRegex = /[a-zA-Z]/;

  // 统计中英文字符数量
  let chineseCount = 0;
  let englishCount = 0;
  let totalChars = 0;

  for (const char of text) {
    if (chineseRegex.test(char)) {
      chineseCount++;
      totalChars++;
    } else if (englishRegex.test(char)) {
      englishCount++;
      totalChars++;
    } else if (char.trim().length > 0) {
      totalChars++;
    }
  }

  // 如果没有任何有效字符，返回unknown
  if (totalChars === 0) {
    return "unknown";
  }

  // 计算比例
  const chineseRatio = chineseCount / totalChars;
  const englishRatio = englishCount / totalChars;

  // 如果中文比例超过30%，判定为中文
  if (chineseRatio > 0.3) {
    return "zh";
  }

  // 如果英文比例超过50%，判定为英文
  if (englishRatio > 0.5) {
    return "en";
  }

  // 如果都包含，优先判断中文（因为中文更明显）
  if (chineseCount > 0 && englishCount > 0) {
    return chineseCount >= englishCount ? "zh" : "en";
  }

  // 只有中文
  if (chineseCount > 0) {
    return "zh";
  }

  // 只有英文
  if (englishCount > 0) {
    return "en";
  }

  return "unknown";
}

/**
 * 根据检测到的源语言自动设置目标语言
 */
function autoSetTargetLanguage(detectedLang: "zh" | "en" | "unknown"): void {
  if (detectedLang === "unknown") {
    return;
  }

  // 如果源语言是中文，目标语言设为英文
  if (detectedLang === "zh") {
    if (targetLanguage.value !== "en") {
      targetLanguage.value = "en";
      saveUISettings();
    }
  }
  // 如果源语言是英文，目标语言设为中文
  else if (detectedLang === "en") {
    if (targetLanguage.value !== "zh") {
      targetLanguage.value = "zh";
      saveUISettings();
    }
  }
}

/**
 * 自动检测并设置语言
 */
function autoDetectAndSetLanguage(): void {
  const text = sourceText.value.trim();

  if (!text) {
    return;
  }

  // 检查开关是否开启
  if (!autoDetectTargetToggle?.checked) {
    return;
  }

  // 如果源语言选择的是自动检测，进行检测
  if (sourceLanguage.value === "auto") {
    const detectedLang = detectLanguage(text);

    if (detectedLang !== "unknown") {
      // 自动设置目标语言
      autoSetTargetLanguage(detectedLang);
    }
  }
}

// ==================== 核心功能 ====================

/**
 * 执行翻译
 */
async function translate(): Promise<void> {
  const naimo: NaimoAPI = window.naimo;
  const translateAPI: TranslatePluginAPI = window.translatePluginAPI;

  const text = sourceText.value.trim();
  if (!text) {
    showError("请输入要翻译的文本");
    return;
  }

  // 获取最新设置
  await loadSettings();

  if (!pluginSettings.secretId || !pluginSettings.secretKey) {
    showError("请先在插件设置中配置腾讯云API密钥");
    return;
  }

  showLoading(true);
  clearMessages();

  try {
    // 调用翻译API
    if (translateAPI && translateAPI.translateText) {
      const result = await translateAPI.translateText({
        sourceText: text,
        source: sourceLanguage.value,
        target: targetLanguage.value,
        settings: {
          secretId: pluginSettings.secretId!,
          secretKey: pluginSettings.secretKey!,
          region: pluginSettings.region,
        },
      });

      if (result.success) {
        displayResult(result.translatedText!);
        copyBtn.disabled = false;

        // 使用 Naimo API 显示通知
        // if (naimo && naimo.system) {
        //   await naimo.system.notify('翻译完成', '翻译成功');
        // }
      } else {
        showError(result.error || "翻译失败");
        copyBtn.disabled = true;
      }
    } else {
      showError("翻译功能未正确加载，请检查插件配置");
    }
  } catch (error) {
    console.error("翻译错误:", error);
    naimo?.log?.error("翻译错误", error);
    showError("翻译服务暂时不可用，请稍后重试");
  } finally {
    showLoading(false);
  }
}

/**
 * 显示翻译结果
 */
function displayResult(text: string): void {
  targetText.innerHTML = text;
  targetText.classList.remove("output-placeholder");
}

/**
 * 复制翻译结果
 */
async function copyResult(): Promise<void> {
  try {
    const naimo: NaimoAPI = window.naimo;
    const text = targetText.textContent?.trim() || "";

    if (text && !targetText.classList.contains("output-placeholder")) {
      if (naimo && naimo.clipboard) {
        await naimo.clipboard.writeText(text);
        showSuccess("已复制到剪贴板");
      }
    }
  } catch (error) {
    console.error("复制失败:", error);
    showError("复制失败");
  }
}

/**
 * 清空所有内容
 */
function clearAll(): void {
  sourceText.value = "";
  targetText.innerHTML =
    '<div class="output-placeholder">翻译结果将显示在这里...</div>';
  targetText.classList.add("output-placeholder");
  copyBtn.disabled = true;
  updateCharCount();
  clearMessages();
}

/**
 * 尝试从剪贴板加载文本
 */
async function tryLoadClipboardText(): Promise<void> {
  try {
    const naimo: NaimoAPI = window.naimo;

    if (naimo && naimo.clipboard) {
      const clipboardText = await naimo.clipboard.readText();

      if (clipboardText && clipboardText.trim()) {
        sourceText.value = clipboardText.trim();
        updateCharCount();
        console.log("📋 从剪贴板加载文本成功");
      }
    }
  } catch (error) {
    console.error("从剪贴板加载文本失败:", error);
    // 不显示错误信息，因为这是可选功能
  }
}

// ==================== UI 辅助函数 ====================

/**
 * 更新字符计数
 */
function updateCharCount(): void {
  const count = sourceText.value.length;
  sourceCharCount.textContent = `${count} / 5000`;

  if (count > 4500) {
    sourceCharCount.style.color = "#ff6b6b";
  } else if (count > 4000) {
    sourceCharCount.style.color = "#ffa726";
  } else {
    sourceCharCount.style.color = "#999";
  }
}

/**
 * 显示加载状态
 */
function showLoading(show: boolean): void {
  const btnText = translateBtn.querySelector("span") as HTMLElement;

  if (show) {
    translateBtn.disabled = true;
    translateBtn.classList.add("loading");
    btnText.textContent = "翻译中...";
  } else {
    translateBtn.disabled = false;
    translateBtn.classList.remove("loading");
    btnText.textContent = "翻译";
  }
}

/**
 * 显示错误消息
 */
function showError(message: string): void {
  errorMessage.textContent = message;
  errorMessage.classList.add("show");
  setTimeout(() => {
    errorMessage.classList.remove("show");
  }, 5000);
}

/**
 * 显示成功消息
 */
function showSuccess(message: string): void {
  successMessage.textContent = message;
  successMessage.classList.add("show");
  setTimeout(() => {
    successMessage.classList.remove("show");
  }, 3000);
}

/**
 * 清除消息
 */
function clearMessages(): void {
  errorMessage.classList.remove("show");
  successMessage.classList.remove("show");
}

// ==================== 入口 ====================

// 等待 DOM 加载完成
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
