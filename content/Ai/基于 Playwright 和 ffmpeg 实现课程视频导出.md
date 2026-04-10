```json
{
  "date": "2026.03.25 21:51",
  "tags": ["Playwright", "ffmpeg", "Next.js", "视频导出", "自动化"],
  "description": "在 OpenMAIC 项目中实现课程视频导出功能，使用 Playwright 截图 + ffmpeg 合成视频，支持 videoMode 自动生成纯幻灯片模式课程。"
}
```

# 基于 Playwright 和 ffmpeg 实现课程视频导出

## 背景

OpenMAIC 是一个 AI 辅助教学平台，支持自动生成课堂内容。用户希望将生成的课程导出为 MP4 视频，方便离线查看或分享。这需要两个核心能力：一是将课程逐页截图并合成为视频；二是在课程生成时支持"视频模式"，只生成适合观看的幻灯片类型场景，跳过交互式内容（如测验、问答）。

## 核心技术点

- **Playwright**：用于控制浏览器逐页截图
- **ffmpeg**：将截图序列合成为 MP4 视频
- **Next.js API Routes**：提供视频导出接口
- **videoMode 参数**：控制课程生成逻辑，只生成 slide 类型场景

## 完整实现

### 1. 视频导出 API 完整代码

文件：`app/api/export-video/[classroomId]/route.ts`

```typescript
import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { CLASSROOMS_DIR } from '@/lib/server/classroom-storage';
import { promises as fs } from 'fs';
import { accessSync } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { chromium } from 'playwright';

const VIDEO_WIDTH = 1280;
const VIDEO_HEIGHT = 720;

// 使用 ffprobe 获取音频时长
async function getAudioDuration(audioPath: string): Promise<number> {
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${audioPath}"`,
      { encoding: 'utf-8' },
    );
    return parseFloat(output.trim()) || 0;
  } catch {
    return 0;
  }
}

// 根据文字长度估算语音时长
function estimateSpeechDuration(text: string): number {
  const cjkCount = (
    text.match(/[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g) || []
  ).length;
  const isCJK = cjkCount > text.length * 0.3;
  if (isCJK) {
    return Math.max(text.length * 0.15, 2);
  }
  return Math.max(text.split(/\s+/).length * 0.24, 2);
}

// 估算单个场景的总时长
function estimateSceneDuration(actions: Array<{ type: string; text?: string }>): number {
  if (!actions) return 5;
  let total = 0;
  for (const action of actions) {
    if (action.type === 'speech' && action.text) {
      total += estimateSpeechDuration(action.text);
    }
  }
  return Math.max(total, 5);
}

// 跨平台 Chrome 路径检测
function getChromePath(): string {
  const platform = process.platform;

  if (platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  }

  if (platform === 'linux') {
    const possiblePaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/local/bin/google-chrome',
      '/usr/local/bin/chromium',
    ];

    for (const chromePath of possiblePaths) {
      try {
        accessSync(chromePath);
        return chromePath;
      } catch {
        continue;
      }
    }
  }

  throw new Error(`Chrome/Chromium not found for platform: ${platform}`);
}

// GET: 查询视频导出状态
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> },
) {
  try {
    const { classroomId } = await params;

    const classroomPath = path.join(CLASSROOMS_DIR, `${classroomId}.json`);
    const classroomData = await fs.readFile(classroomPath, 'utf-8');
    const classroom = JSON.parse(classroomData);

    const videoDir = path.join(CLASSROOMS_DIR, classroomId, 'video');
    const videoPath = path.join(videoDir, 'classroom.mp4');

    let videoExists = false;
    try {
      await fs.access(videoPath);
      videoExists = true;
    } catch {
      videoExists = false;
    }

    return apiSuccess({
      classroomId,
      videoExists,
      videoUrl: videoExists ? `/api/classroom-media/${classroomId}/video/classroom.mp4` : null,
      classroom: {
        id: classroom.id,
        name: classroom.stage?.name,
        scenesCount: classroom.scenes?.length || 0,
      },
    });
  } catch (error) {
    return apiError('INTERNAL_ERROR', 404, 'Classroom not found');
  }
}

// POST: 执行视频导出
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> },
) {
  let browser = null;
  try {
    const { classroomId } = await params;

    const classroomPath = path.join(CLASSROOMS_DIR, `${classroomId}.json`);
    const classroomData = await fs.readFile(classroomPath, 'utf-8');
    const classroom = JSON.parse(classroomData);
    const scenes = classroom.scenes;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const classroomUrl = `${baseUrl}/classroom/${classroomId}`;

    const videoDir = path.join(CLASSROOMS_DIR, classroomId, 'video');
    const audioDir = path.join(CLASSROOMS_DIR, classroomId, 'audio');
    await fs.mkdir(videoDir, { recursive: true });

    const framesDir = path.join(videoDir, 'frames');
    await fs.mkdir(framesDir, { recursive: true });

    const debugLog: string[] = [];
    const debugFile = path.join(videoDir, 'debug.log');

    const log = (msg: string) => {
      const entry = `[${new Date().toISOString()}] ${msg}`;
      debugLog.push(entry);
      console.log(entry);
    };

    log(`Starting video export for classroom ${classroomId}`);
    log(`Classroom URL: ${classroomUrl}`);

    // 启动浏览器
    browser = await chromium.launch({
      headless: true,
      executablePath: getChromePath(),
    });

    const context = await browser.newContext({
      viewport: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT },
    });
    const page = await context.newPage();

    // 等待页面加载完成
    await page.goto(classroomUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 打开侧边栏以显示场景列表
    const sidebarToggleSelector = 'button[aria-label="Toggle sidebar"]';
    try {
      const toggleBtn = await page.$(sidebarToggleSelector);
      if (toggleBtn) {
        await toggleBtn.click();
        log('Clicked sidebar toggle to open scene list');
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      log(`Failed to click sidebar toggle: ${e}`);
    }

    const sceneCount = scenes.length;
    const framePaths: string[] = [];
    const sceneDurations: number[] = [];
    const sceneAudioFiles: string[][] = [];

    log(`Scene count: ${sceneCount}`);

    // 逐场景截图
    for (let i = 0; i < sceneCount; i++) {
      const scene = scenes[i];
      const audioFiles: string[] = [];

      // 收集当前场景的音频文件
      for (const action of scene.actions || []) {
        if (action.type === 'speech' && action.audioId) {
          const audioPath = path.join(audioDir, `${action.audioId}.wav`);
          try {
            await fs.access(audioPath);
            audioFiles.push(audioPath);
          } catch {
            // Audio file not found, skip
          }
        }
      }
      sceneAudioFiles.push(audioFiles);

      // 计算场景时长（优先用音频，否则估算）
      let duration = 0;
      if (audioFiles.length > 0) {
        for (const audioFile of audioFiles) {
          duration += await getAudioDuration(audioFile);
        }
      }
      if (duration < 1) {
        duration = estimateSceneDuration(scene.actions || []);
      }
      sceneDurations.push(duration);

      log(`Capturing slide ${i + 1}/${sceneCount}: ${scene.title}`);

      // 截图
      const framePath = path.join(framesDir, `slide_${String(i).padStart(3, '0')}.png`);
      await page.screenshot({ path: framePath, type: 'png', fullPage: false });
      framePaths.push(framePath);

      // 切换到下一个场景
      if (i < sceneCount - 1) {
        const sceneItemSelector = `[data-testid="scene-list"] [data-testid="scene-item"]:nth-child(${i + 2})`;
        try {
          const sceneItem = await page.$(sceneItemSelector);
          if (sceneItem) {
            await sceneItem.click();
            log(`Clicked scene item ${i + 2}`);
            await page.waitForTimeout(500);
          } else {
            log(`Scene item not found: ${sceneItemSelector}`);
          }
        } catch (e) {
          log(`Failed to click scene item: ${e}`);
        }
      }
    }

    await browser.close();
    browser = null;

    // Phase 2: ffmpeg 合成视频
    const concatListPath = path.join(videoDir, 'concat.txt');
    const tempDir = path.join(videoDir, 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // 为每个场景生成独立视频片段
      for (let i = 0; i < framePaths.length; i++) {
        const framePath = framePaths[i];
        const duration = sceneDurations[i];
        const tempVideo = path.join(tempDir, `slide_${i}.mp4`);
        const audioFiles = sceneAudioFiles[i] || [];

        if (audioFiles.length > 0) {
          // 有音频：合并多个音频文件，再与图片合成视频
          const concatAudioList = path.join(tempDir, `audio_concat_${i}.txt`);
          const audioLines = audioFiles.map((f) => `file '${f}'`).join('\n');
          await fs.writeFile(concatAudioList, audioLines, 'utf-8');

          const combinedAudio = path.join(tempDir, `audio_${i}.wav`);
          execSync(
            `ffmpeg -f concat -safe 0 -i "${concatAudioList}" -c copy -y "${combinedAudio}"`,
            { stdio: 'pipe' },
          );
          execSync(
            `ffmpeg -loop 1 -i "${framePath}" -i "${combinedAudio}" -vf "scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}" -map 0:v -map 1:a -t ${duration} -c:v libx264 -c:a aac -pix_fmt yuv420p -y "${tempVideo}"`,
            { stdio: 'pipe' },
          );
        } else {
          // 无音频：静音视频
          execSync(
            `ffmpeg -loop 1 -i "${framePath}" -vf "scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}" -t ${duration} -c:v libx264 -pix_fmt yuv420p -y "${tempVideo}"`,
            { stdio: 'pipe' },
          );
        }
      }

      // 拼接所有场景片段
      const concatLines2: string[] = [];
      for (let i = 0; i < framePaths.length; i++) {
        const tempVideo = path.join(tempDir, `slide_${i}.mp4`);
        concatLines2.push(`file '${tempVideo}'`);
      }
      await fs.writeFile(concatListPath, concatLines2.join('\n'), 'utf-8');

      const videoPath = path.join(videoDir, 'classroom.mp4');
      execSync(`ffmpeg -f concat -safe 0 -i "${concatListPath}" -c copy -y "${videoPath}"`, {
        stdio: 'pipe',
      });
    } catch (e) {
      console.error('ffmpeg failed:', e);
    }

    // 清理临时文件
    await fs.rm(tempDir, { recursive: true }).catch(() => {});
    await fs.unlink(concatListPath).catch(() => {});
    await fs.writeFile(debugFile, debugLog.join('\n'), 'utf-8');

    return apiSuccess({
      classroomId,
      videoUrl: `/api/classroom-media/${classroomId}/video/classroom.mp4`,
    });
  } catch (error) {
    console.error('Video export error:', error);
    if (browser) await browser.close().catch(() => {});
    return apiError('INTERNAL_ERROR', 500, String(error));
  }
}
```

### 2. videoMode 参数与自动触发

文件：`lib/server/classroom-generation.ts` 中的关键改动部分。

接口定义：

```typescript
export interface GenerateClassroomInput {
  requirement: string;
  pdfContent?: { text: string; images: string[] };
  language?: string;
  enableWebSearch?: boolean;
  enableImageGeneration?: boolean;
  enableVideoGeneration?: boolean;
  enableTTS?: boolean;
  agentMode?: 'default' | 'generate';
  videoMode?: boolean; // 新增：视频模式
}
```

场景过滤逻辑（在 `generateClassroom` 函数内部）：

```typescript
let scenes = store.getState().scenes;
log.info(`Pipeline complete: ${scenes.length} scenes generated`);

// videoMode 过滤：只保留 slide 类型场景
if (input.videoMode) {
  const originalCount = scenes.length;
  scenes = scenes.filter((s) => s.type === 'slide');
  log.info(`Video mode: filtered ${originalCount} scenes to ${scenes.length} slide-only scenes`);
}
```

自动视频导出（在 `generateClassroom` 函数末尾，数据持久化之后）：

```typescript
// 课程持久化
const persisted = await persistClassroom(
  {
    id: stageId,
    stage,
    scenes,
  },
  options.baseUrl,
);

log.info(`Classroom persisted: ${persisted.id}, URL: ${persisted.url}`);

// videoMode 自动触发视频导出
if (input.videoMode) {
  after(() => {
    const baseUrl = options.baseUrl || 'http://localhost:3000';
    fetch(`${baseUrl}/api/export-video/${stageId}`, { method: 'POST' }).catch((err) => {
      log.error(`Video export failed for classroom ${stageId}:`, err);
    });
  });
}
```

### 3. API 调用接口

文件：`app/api/generate-classroom/route.ts` 中的请求体定义，需要将 `videoMode` 透传：

```typescript
// 从请求体中解构 videoMode
const { requirement, language, videoMode, ...rest } = await req.json();

// 传递给 generateClassroom
const result = await generateClassroom({
  requirement,
  language,
  videoMode,
  ...rest,
}, { baseUrl });
```

### 4. Docker 部署

Dockerfile 中添加 ffmpeg：

```dockerfile
FROM node:20-slim

RUN apt-get update && apt-get install -y \
  ffmpeg \
  chromium \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

注意：Docker 中使用 Chromium 而非 Chrome，`getChromePath()` 的 Linux 分支会自动检测 `/usr/bin/chromium`。

## 踩坑记录

### @napi-rs/canvas 绑定问题

最初尝试使用 `@napi-rs/canvas` 进行服务端渲染生成图片，但在 Next.js + Turbopack 环境下出现 native binding 兼容性问题。最终改为 Playwright 截图方案，更稳定可靠。

### 场景切换失败

点击场景项无效的原因是**侧边栏处于关闭状态**。必须先点击 `button[aria-label="Toggle sidebar"]` 打开侧边栏，才能通过 `[data-testid="scene-list"] [data-testid="scene-item"]` 选择器找到并点击场景项。

### ffmpeg concat 文件路径

使用 `ffmpeg -f concat` 时，文件路径中的单引号不能省略，且 `-safe 0` 参数必须加上，否则会拒绝绝对路径。

## API 使用示例

```bash
# 生成课程并自动导出视频
curl -X POST http://localhost:3000/api/generate-classroom \
  -H "Content-Type: application/json" \
  -d '{"requirement": "Python变量", "language": "zh", "videoMode": true}'

# 手动导出已有课程的视频
curl -X POST http://localhost:3000/api/export-video/{classroomId}

# 查询视频导出状态
curl http://localhost:3000/api/export-video/{classroomId}
```

## 总结

核心流程：
1. Playwright 启动系统 Chrome，打开课程页面
2. 打开侧边栏，逐个点击场景项并截图
3. 每个场景优先使用已有音频计算时长，否则按文字长度估算
4. ffmpeg 将每个场景的图片+音频合成为独立视频片段
5. 最后用 `ffmpeg -f concat` 拼接所有片段为完整视频

关键点：
- 使用系统 Chrome/Chromium 避免 Playwright 下载额外浏览器
- `after()` API 确保视频导出在响应返回后异步执行
- `videoMode` 过滤掉非 slide 类型场景，保证视频连贯性
