# 专业课程评价网站

这是一个纯静态课程评价展示网站，适合部署到 GitHub Pages。评价数据存放在 `data/courses.json`，页面不会收集或写入用户数据。

## 本地预览

因为页面通过 `fetch` 读取 JSON 文件，建议用本地静态服务器预览：

```powershell
python -m http.server 8000
```

然后打开：

```text
http://localhost:8000
```

## 修改课程评价

编辑 `data/courses.json` 即可。每门课的数据结构如下：

```json
{
  "code": "CS101",
  "name": "程序设计基础",
  "teacher": "张老师",
  "semester": "2025 春",
  "category": "专业基础课",
  "credits": 3,
  "overallScore": 4.5,
  "content": {
    "score": 4.6,
    "review": "对课程内容的评价"
  },
  "assessment": {
    "score": 4.2,
    "review": "对考试或考核方式的评价"
  },
  "instructor": {
    "score": 4.7,
    "review": "对老师的评价"
  },
  "updatedAt": "2026-03-12"
}
```

## GitHub Pages 部署

1. 把这个目录推送到 GitHub 仓库。
2. 打开仓库的 `Settings`。
3. 进入 `Pages`。
4. 在 `Build and deployment` 中选择 `Deploy from a branch`。
5. 选择 `main` 分支和 `/root` 目录。
6. 保存后等待 GitHub 生成访问链接。
