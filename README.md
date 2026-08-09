# 专业课程评价网站

这是一个纯静态课程评价展示网站，适合部署到 GitHub Pages。评价数据存放在 `data/courses.json`，页面不会收集或写入用户数据。

页面顶部显示最近更新的紧凑评价卡片，点击后可以展开完整评价。下方按课程名称分组，展开课程后展示该课程下的完整评价卡片。

网页地址：

https://worldedge1933.github.io/polimi_MAE_courses/

## 修改课程评价

编辑 `data/courses.json` 即可。每门课的数据结构如下：

```json
{
  "code": "CS101",
  "name": "程序设计基础",
  "teacher": "张老师",
  "author": "评价者署名，可留空",
  "semester": "2025 春",
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
  "notes": "其它/备注，可留空",
  "updatedAt": "2026-03-12"
}
```
