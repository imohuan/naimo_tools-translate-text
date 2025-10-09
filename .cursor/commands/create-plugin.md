---
description: 智能创建 Naimo 插件 - 根据需求自动生成完整的插件代码
---

用户需求描述：

$ARGUMENTS

## 目标

根据用户的功能需求，自动生成一个完整的 Naimo Tools 插件，包括：

1. `manifest.json` - 插件配置文件
2. `preload.js` - 功能处理脚本
3. `index.html` - UI 界面（如需要）
4. `.gitignore` - Git 忽略文件
5. `README.md` - 插件说明文档
6. `package.json` - 项目配置（如需要）

## 重要文件引用

在生成插件代码前，需要引用以下关键文件：

### 📋 配置规范文件

**路径：** `../schema.json`  
**用途：** 定义 `manifest.json` 的完整规范，包括所有字段的类型、格式、枚举值等

### 📚 API 类型定义文件

**路径：** `../typings/naimo.d.ts`  
**用途：** 定义所有可用的 Naimo API，包括接口、参数、返回值类型等

### 使用规则

1. **生成 manifest.json 时：**
   - 必须先 `read_file('../schema.json')`
   - 根据 schema 的定义生成配置
   - 遵循 schema 中的验证规则

2. **使用 Naimo API 时：**
   - 必须先 `read_file('../typings/naimo.d.ts')`
   - 根据类型定义生成正确的 API 调用
   - 确保参数和返回值类型正确

3. **生成示例代码时：**
   - 参考 naimo.d.ts 中的接口定义
   - 添加正确的类型注释
   - 提供准确的 API 使用示例

---

## 执行步骤

### 1. 需求分析

仔细分析用户的需求描述，确定以下关键信息：

**插件基本信息：**

- 插件 ID（英文，小写字母、数字、短横线）
- 插件名称（中文或英文）
- 插件描述
- 插件分类（从以下选择）：
  - `efficient_office` - 高效办公
  - `ai_artificial_intelligence` - AI人工智能
  - `developer_essentials` - 程序员必备
  - `record_ideas` - 记录想法
  - `image_video` - 图像视频
  - `media_tools` - 媒体工具
  - `system_tools` - 系统工具
  - `study_well` - 好好学习
  - `brainstorming` - 脑洞大开
  - `other` - 其他

**功能分析：**

- 功能数量（一个插件可以包含多个功能）
- 每个功能的：
  - 功能标识（path）
  - 功能名称
  - 功能类型（text/regex/img/files）
  - 触发条件
  - 处理逻辑

**UI 需求：**

- 是否需要 UI 界面
- 界面布局和交互
- 样式风格

**技术栈：**

- 是否需要使用第三方库
- 是否需要网络请求
- 是否需要数据存储

### 2. 确定功能类型

根据需求选择合适的功能类型：

#### type: "text" - 文本搜索

**适用场景：**

- 搜索、查询、转换文本
- 通用文本处理功能
- 匹配用户输入的关键字

**示例：**

- 翻译插件
- 计算器
- 单位转换

**配置：**

```json
{
  "type": "text",
  "anonymousSearchFields": ["关键词1", "关键词2"],
  "minLength": 1,
  "maxLength": 1000
}
```

#### type: "regex" - 正则匹配

**适用场景：**

- 匹配特定格式的内容
- URL、邮箱、电话号码等
- 需要精确模式匹配

**示例：**

- URL 打开器
- 邮箱处理
- 身份证验证

**配置：**

```json
{
  "type": "regex",
  "match": "^https?://",
  "exclude": "^file://",
  "minLength": 10
}
```

#### type: "img" - 图片处理

**适用场景：**

- 图片识别、编辑、转换
- OCR 文字识别
- 图片压缩、美化

**示例：**

- OCR 识别
- 图片压缩
- 图片转 Base64

**配置：**

```json
{
  "type": "img",
  "description": "处理图片"
}
```

**接收参数：**

```javascript
{
  type: "img",
  data: "data:image/png;base64,...",
  originalFile: { name, path, size }
}
```

#### type: "files" - 文件处理

**适用场景：**

- 文件批量处理
- 文件格式转换
- 文件分析统计

**示例：**

- 文件重命名
- 图片批量压缩
- 文件信息提取

**配置：**

```json
{
  "type": "files",
  "fileType": "file",
  "extensions": [".jpg", ".png"],
  "minLength": 1,
  "maxLength": 100
}
```

### 3. 生成 manifest.json

根据需求分析生成插件配置文件。

**重要：** 在生成 `manifest.json` 之前，**必须先读取**以下文件以了解完整的配置规范：

📄 **配置规范文件：** `../schema.json`

**操作步骤：**

1. 使用 `read_file` 工具读取 `../schema.json`
2. 根据 schema 中的定义生成符合规范的配置
3. 确保所有必需字段都已填写
4. 参考 schema 中的 examples 和 description

**配置文件结构：**

- 根据 schema.json 中的 `required` 字段确定必需字段
- 根据 schema.json 中的 `properties` 确定可用字段
- 根据 schema.json 中的 `definitions.feature` 生成 feature 配置
- 遵循 schema.json 中的格式验证规则（pattern、enum 等）

### 4. 生成 preload.js

根据功能类型和处理逻辑生成 Preload 脚本。

**基本结构：**

```javascript
const { contextBridge } = require("electron");

// ==================== 工具函数 ====================

// 在这里定义工具函数

// ==================== 暴露 API（可选） ====================

// contextBridge.exposeInMainWorld("myPluginAPI", {
//   // 暴露给渲染进程的 API
// });

// ==================== 功能处理器 ====================

module.exports = {
  // 功能标识对应 manifest.json 中的 path
  "feature-path": {
    onEnter: async (params, api) => {
      try {
        // 获取参数
        console.log("功能被触发，参数:", params);

        // 处理逻辑
        // ...
      } catch (error) {
        console.error("错误:", error);
        window.naimo?.log?.error("处理失败", error);
      }
    },
  },
};
```

**根据功能类型生成代码：**

**text 类型：**

```javascript
"text-handler": {
  onEnter: async (params, api) => {
    const text = params.text; // 用户输入的文本
    // 处理文本...
  }
}
```

**img 类型：**

```javascript
"img-handler": {
  onEnter: async (params, api) => {
    const imageData = params.data; // base64 图片数据
    const file = params.originalFile; // 原始文件信息
    // 处理图片...
  }
}
```

**files 类型：**

```javascript
"files-handler": {
  onEnter: async (params, api) => {
    const files = params.data; // 文件列表
    files.forEach(file => {
      console.log(file.name, file.path, file.size);
    });
    // 处理文件...
  }
}
```

### 5. 生成 index.html（如需要 UI）

根据 UI 需求生成 HTML 页面。

**基本模板：**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>插件名称</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          "Helvetica Neue", Arial, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 20px;
        min-height: 100vh;
      }

      .container {
        background: white;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        padding: 40px;
        max-width: 800px;
        margin: 0 auto;
      }

      h1 {
        color: #333;
        margin-bottom: 20px;
        font-size: 28px;
      }

      button {
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        background: #667eea;
        color: white;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      button:hover {
        background: #5568d3;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }

      input,
      textarea {
        width: 100%;
        padding: 12px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        font-size: 14px;
        margin-bottom: 16px;
        transition: border-color 0.2s;
      }

      input:focus,
      textarea:focus {
        outline: none;
        border-color: #667eea;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🎯 插件名称</h1>
      <!-- 你的 UI 内容 -->
    </div>

    <script>
      // 使用 window.naimo API
      console.log("插件已加载");

      // 示例：注册进入钩子
      if (window.naimo) {
        window.naimo.onEnter((params) => {
          console.log("收到参数:", params);
        });
      }
    </script>
  </body>
</html>
```

### 6. 生成其他文件

#### .gitignore

```
node_modules/
dist/
*.log
.DS_Store
Thumbs.db
```

#### README.md

```markdown
# 插件名称

> 插件描述

## 功能特性

- ✅ 功能1
- ✅ 功能2
- ✅ 功能3

## 使用方法

1. 将插件文件夹复制到 Naimo Tools 的 `plugins` 目录
2. 重启 Naimo Tools
3. 在搜索框中输入关键词触发插件

## 开发说明

### 技术栈

- Naimo Tools Plugin API
- 其他依赖...

### 目录结构

\`\`\`
plugin-name/
├── manifest.json # 插件配置
├── preload.js # 功能处理脚本
├── index.html # UI 界面
├── README.md # 说明文档
└── .gitignore # Git 忽略文件
\`\`\`

## 版本历史

### v1.0.0

- 初始版本

## 许可证

MIT
```

#### package.json（如需要）

```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "description": "插件描述",
  "main": "index.html",
  "scripts": {
    "dev": "echo 'Development mode'",
    "build": "echo 'Build complete'"
  },
  "keywords": ["naimo", "plugin"],
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/your-username/naimo_tools-plugin-name.git"
  }
}
```

### 7. 添加 TypeScript 类型支持（推荐）

为了获得更好的开发体验，可以在项目中引用类型定义：

#### 在 TypeScript 项目中

在 `preload.ts` 或 `main.ts` 文件顶部添加：

```typescript
/// <reference path="../typings/naimo.d.ts" />
```

#### 在 JavaScript 项目中（使用 JSDoc）

在 `preload.js` 文件中添加：

```javascript
/**
 * @type {import('../typings/naimo.d.ts').PluginExports}
 */
module.exports = {
  // 你的功能处理器
};
```

在 HTML 的 `<script>` 中添加：

```javascript
/**
 * @type {import('../typings/naimo.d.ts').Naimo}
 */
const naimo = window.naimo;
```

## Naimo API 使用指南

**重要：** 在编写代码使用 Naimo API 之前，**必须先读取**以下文件以了解完整的 API 定义：

📄 **API 类型定义文件：** `../typings/naimo.d.ts`

### 使用步骤

#### 1. 读取 API 定义

在开始编写插件代码前，使用 `read_file` 工具读取 `../typings/naimo.d.ts` 文件，了解：

- 所有可用的 API 接口
- 每个 API 的参数类型
- 返回值类型
- API 的详细说明

#### 2. 在 Preload 脚本中使用 API

在 `preload.js` 中：

- 可以使用 Node.js 模块（如 `require`）
- 可以通过 `contextBridge` 暴露自定义 API
- **不能直接访问** `window.naimo` API（仅在渲染进程可用）

#### 3. 在 HTML 渲染进程中使用 API

在 `index.html` 的 `<script>` 中：

- 通过 `window.naimo` 访问所有 API
- 所有 API 调用都是异步的（返回 Promise）
- 参考 `naimo.d.ts` 中的接口定义使用正确的参数

### API 分类

根据 `naimo.d.ts` 文件，Naimo 提供以下 API 模块：

- `window.naimo.log` - 日志系统
- `window.naimo.window` - 窗口管理
- `window.naimo.db` - 文档数据库
- `window.naimo.storage` - 键值存储
- `window.naimo.clipboard` - 剪贴板
- `window.naimo.shell` - Shell 操作
- `window.naimo.system` - 系统信息
- `window.naimo.screen` - 屏幕操作
- `window.naimo.dialog` - 对话框
- `window.naimo.input` - 输入模拟
- `window.naimo.automation` - 网页自动化
- `window.naimo.ubrowser` - 可编程浏览器
- `window.naimo.ibrowser` - 即时浏览器

**生成代码时：**

1. 先读取 `naimo.d.ts` 了解所需 API 的完整定义
2. 根据类型定义生成正确的调用代码
3. 确保参数类型和返回值处理正确
4. 添加必要的错误处理

## 实现建议

### 1. 错误处理

**必须**使用 try-catch 包裹所有可能出错的代码：

```javascript
onEnter: async (params, api) => {
  try {
    // 业务逻辑
  } catch (error) {
    console.error("错误:", error);
    window.naimo?.log?.error("操作失败", error);
  }
};
```

### 2. 参数验证

在处理前验证参数：

```javascript
if (!params || !params.text) {
  window.naimo?.log?.warn("参数无效");
  return;
}
```

### 3. 用户反馈

提供清晰的用户反馈：

```javascript
// 开始处理
window.naimo?.system?.notify("正在处理...");

// 处理完成
window.naimo?.system?.notify("处理完成！", "成功");

// 处理失败
window.naimo?.system?.notify("处理失败", "错误");
```

### 4. 性能优化

- 避免在 `onEnter` 中执行耗时操作
- 使用异步操作（`async/await`）
- 缓存计算结果

### 5. 代码组织

- 将复杂逻辑拆分为独立函数
- 使用清晰的命名
- 添加注释说明

## 命名规范

### 插件 ID

- 格式：`功能描述-plugin`
- 示例：`translate-plugin`, `ocr-plugin`, `image-compress-plugin`
- 规则：小写字母、数字、短横线

### 功能 path

- 格式：`功能描述`
- 示例：`translate-text`, `compress-image`, `extract-text`
- 规则：小写字母、数字、短横线

### 仓库命名

- 格式：`naimo_tools-功能描述-plugin`
- 示例：`naimo_tools-translate-plugin`

## 输出要求

生成代码时：

1. **完整性**：生成所有必需的文件
2. **可用性**：代码可以直接使用，无需修改
3. **规范性**：遵循 Naimo 插件开发规范
4. **注释**：关键代码添加注释
5. **美观**：代码格式整洁，易于阅读

## 示例输出

**先显示文件结构：**

```
example-plugin/
├── manifest.json
├── preload.js
├── index.html
├── .gitignore
├── README.md
└── package.json
```

**然后逐个显示文件内容：**

```json
// manifest.json
{
  "id": "example-plugin",
  ...
}
```

**最后提供使用说明：**

```
## 安装方法
1. 将 example-plugin 文件夹复制到 Naimo Tools 的 plugins 目录
2. 重启 Naimo Tools
3. 在搜索框中输入关键词测试

## 测试建议
- 测试正常输入
- 测试边界情况
- 测试错误处理

## 开发建议
- 使用 VSCode 等支持 JSDoc 的编辑器获得类型提示
- 参考 ../typings/naimo.d.ts 了解完整的 API
- 参考 ../schema.json 了解配置规范
```

---

## 生成流程总结

1. **读取规范文件**

   ```
   read_file('../schema.json')          # 读取配置规范
   read_file('../typings/naimo.d.ts')  # 读取 API 定义
   ```

2. **分析需求** - 根据用户需求确定插件类型和功能

3. **生成配置** - 基于 schema.json 生成 manifest.json

4. **生成代码** - 基于 naimo.d.ts 生成正确的 API 调用

5. **添加文档** - 生成 README.md、.gitignore 等文件

6. **提供说明** - 给出安装和测试指南

---

**开始实现插件！** 🚀
