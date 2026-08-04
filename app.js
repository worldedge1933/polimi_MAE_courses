const state = {
  courses: [],
  query: "",
  sort: "overall-desc",
};

const elements = {
  recentGrid: document.querySelector("#recentGrid"),
  courseGroups: document.querySelector("#courseGroups"),
  empty: document.querySelector("#emptyState"),
  template: document.querySelector("#courseCardTemplate"),
  search: document.querySelector("#searchInput"),
  sort: document.querySelector("#sortSelect"),
};

const activeAnimations = new WeakMap();
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const dataUrl = new URL("data/courses.json", document.currentScript.src);

init();

async function init() {
  try {
    const response = await fetch(dataUrl, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    state.courses = await response.json();
    bindEvents();
    render();
  } catch (error) {
    elements.recentGrid.innerHTML = "";
    elements.courseGroups.innerHTML = "";
    elements.empty.hidden = false;
    elements.empty.textContent = `课程数据加载失败，请确认 ${dataUrl.pathname} 存在。`;
    console.error(error);
  }
}

function bindEvents() {
  elements.search.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    render();
  });

  elements.sort.addEventListener("change", (event) => {
    state.sort = event.target.value;
    render();
  });
}

function render() {
  const visibleCourses = state.courses.filter(matchesQuery);

  elements.recentGrid.innerHTML = "";
  elements.courseGroups.innerHTML = "";
  elements.empty.hidden = visibleCourses.length > 0;

  renderRecentCourses(visibleCourses);
  renderCourseGroups(visibleCourses);
}

function matchesQuery(course) {
  if (!state.query) return true;

  const searchableText = [
    course.code,
    course.name,
    course.teacher,
    course.author,
    course.semester,
    course.content?.review,
    course.assessment?.review,
    course.instructor?.review,
    course.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(state.query);
}

function compareCourses(a, b) {
  if (state.sort === "overall-asc") return a.overallScore - b.overallScore;
  if (state.sort === "name-asc") return a.name.localeCompare(b.name, "zh-Hans-CN");
  if (state.sort === "updated-desc") return new Date(b.updatedAt) - new Date(a.updatedAt);
  return b.overallScore - a.overallScore;
}

function renderRecentCourses(courses) {
  const fragment = document.createDocumentFragment();
  const recentCourses = [...courses]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 6);

  for (const course of recentCourses) {
    fragment.append(renderCompactCourse(course));
  }

  elements.recentGrid.append(fragment);
}

function renderCourseGroups(courses) {
  const fragment = document.createDocumentFragment();
  const groupedCourses = groupByCourseName(courses);

  for (const [name, courseItems] of groupedCourses) {
    const details = document.createElement("details");
    details.className = "course-group";

    const summary = document.createElement("summary");
    summary.className = "course-group-summary";

    const title = document.createElement("span");
    title.textContent = name;

    const count = document.createElement("span");
    count.className = "group-count";
    count.textContent = `${courseItems.length} 条评价`;

    summary.append(title, count);
    details.append(summary);

    const groupGrid = document.createElement("div");
    groupGrid.className = "course-grid";

    for (const course of [...courseItems].sort(compareCourses)) {
      groupGrid.append(renderCourseCard(course));
    }

    details.append(wrapCollapsibleContent(groupGrid));
    setupAnimatedDetails(details);
    fragment.append(details);
  }

  elements.courseGroups.append(fragment);
}

function groupByCourseName(courses) {
  const groups = new Map();

  for (const course of courses) {
    const name = course.name || "未命名课程";
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(course);
  }

  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "zh-Hans-CN"));
}

function renderCompactCourse(course) {
  const details = document.createElement("details");
  details.className = "compact-course";

  const summary = document.createElement("summary");
  summary.className = "compact-summary";

  const text = document.createElement("span");
  text.className = "compact-text";

  const meta = document.createElement("span");
  meta.className = "compact-meta";
  meta.textContent = `${course.code} · ${course.teacher} · ${formatAuthor(course.author)} · ${course.updatedAt}`;

  const name = document.createElement("strong");
  name.textContent = course.name;

  text.append(name, meta);

  const score = document.createElement("span");
  score.className = "compact-score";
  score.textContent = formatScore(course.overallScore);

  summary.append(text, score);
  details.append(summary, wrapCollapsibleContent(renderCompactReviewContent(course)));
  setupAnimatedDetails(details);

  return details;
}

function renderCompactReviewContent(course) {
  const review = document.createElement("div");
  review.className = "compact-review";

  review.append(
    renderReviewSection("课程内容", course.content.score, course.content.review, "content-score"),
    renderReviewSection("考试考核", course.assessment.score, course.assessment.review, "assessment-score"),
    renderReviewSection("老师评价", course.instructor.score, course.instructor.review, "teacher-score"),
  );

  if (course.notes) {
    review.append(renderReviewSection("其它/备注", null, course.notes));
  }

  return review;
}

function renderReviewSection(titleText, scoreValue, reviewText, scoreClass = "") {
  const section = document.createElement("section");

  const title = document.createElement("div");
  title.className = "section-title";

  const heading = document.createElement("h3");
  heading.textContent = titleText;
  title.append(heading);

  if (scoreValue !== null) {
    const score = document.createElement("span");
    score.className = `score ${scoreClass}`.trim();
    score.textContent = formatScore(scoreValue);
    title.append(score);
  }

  const text = document.createElement("p");
  text.textContent = reviewText;

  section.append(title, text);
  return section;
}

function wrapCollapsibleContent(content) {
  const wrapper = document.createElement("div");
  wrapper.className = "collapsible-content";
  wrapper.append(content);
  return wrapper;
}

function setupAnimatedDetails(details) {
  const summary = details.querySelector("summary");
  const content = details.querySelector(".collapsible-content");

  summary.addEventListener("click", (event) => {
    event.preventDefault();

    if (details.open) {
      closeDetails(details, content);
    } else {
      openDetails(details, content);
    }
  });
}

function openDetails(details, content) {
  if (prefersReducedMotion.matches) {
    details.open = true;
    return;
  }

  cancelActiveAnimation(content);

  content.style.height = "0px";
  content.style.opacity = "0";
  content.style.transform = "translateY(-8px)";
  details.open = true;

  const animation = content.animate(
    [
      { height: "0px", opacity: 0, transform: "translateY(-8px)" },
      { height: `${content.scrollHeight}px`, opacity: 1, transform: "translateY(0)" },
    ],
    { duration: 320, easing: "cubic-bezier(0.2, 0, 0, 1)" },
  );

  activeAnimations.set(content, animation);
  animation.onfinish = () => {
    content.style.height = "";
    content.style.opacity = "";
    content.style.transform = "";
    activeAnimations.delete(content);
  };
}

function closeDetails(details, content) {
  if (prefersReducedMotion.matches) {
    details.open = false;
    return;
  }

  cancelActiveAnimation(content);
  content.style.height = `${content.offsetHeight}px`;
  content.style.opacity = "1";
  content.style.transform = "translateY(0)";

  const animation = content.animate(
    [
      { height: `${content.offsetHeight}px`, opacity: 1, transform: "translateY(0)" },
      { height: "0px", opacity: 0, transform: "translateY(-8px)" },
    ],
    { duration: 260, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
  );

  activeAnimations.set(content, animation);
  animation.onfinish = () => {
    details.open = false;
    content.style.height = "";
    content.style.opacity = "";
    content.style.transform = "";
    activeAnimations.delete(content);
  };
}

function cancelActiveAnimation(content) {
  const animation = activeAnimations.get(content);
  if (animation) {
    animation.cancel();
    activeAnimations.delete(content);
  }
}

function renderCourseCard(course) {
  const node = elements.template.content.cloneNode(true);

  node.querySelector(".course-meta").textContent = `${course.code} · ${course.credits} 学分`;
  node.querySelector("h2").textContent = course.name;
  node.querySelector(".overall-score strong").textContent = formatScore(course.overallScore);
  node.querySelector(".teacher").textContent = course.teacher;
  node.querySelector(".author").textContent = formatAuthor(course.author);
  node.querySelector(".semester").textContent = course.semester;
  node.querySelector(".content-score").textContent = formatScore(course.content.score);
  node.querySelector(".content-review").textContent = course.content.review;
  node.querySelector(".assessment-score").textContent = formatScore(course.assessment.score);
  node.querySelector(".assessment-review").textContent = course.assessment.review;
  node.querySelector(".teacher-score").textContent = formatScore(course.instructor.score);
  node.querySelector(".teacher-review").textContent = course.instructor.review;
  node.querySelector(".notes-review").textContent = course.notes || "";
  node.querySelector(".notes-section").hidden = !course.notes;
  node.querySelector(".updated-at").textContent = `更新于 ${course.updatedAt}`;

  return node;
}

function formatScore(score) {
  return Number(score).toFixed(1);
}

function formatAuthor(author) {
  return author || "匿名";
}
