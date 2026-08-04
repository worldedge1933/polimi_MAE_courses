const state = {
  courses: [],
  query: "",
  category: "all",
  sort: "overall-desc",
};

const elements = {
  grid: document.querySelector("#courseGrid"),
  empty: document.querySelector("#emptyState"),
  template: document.querySelector("#courseCardTemplate"),
  search: document.querySelector("#searchInput"),
  category: document.querySelector("#categoryFilter"),
  sort: document.querySelector("#sortSelect"),
  courseCount: document.querySelector("#courseCount"),
  averageScore: document.querySelector("#averageScore"),
};

init();

async function init() {
  try {
    const response = await fetch("./data/courses.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    state.courses = await response.json();
    buildCategoryFilter(state.courses);
    bindEvents();
    render();
  } catch (error) {
    elements.grid.innerHTML = "";
    elements.empty.hidden = false;
    elements.empty.textContent = "课程数据加载失败，请确认 data/courses.json 存在。";
    console.error(error);
  }
}

function bindEvents() {
  elements.search.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    render();
  });

  elements.category.addEventListener("change", (event) => {
    state.category = event.target.value;
    render();
  });

  elements.sort.addEventListener("change", (event) => {
    state.sort = event.target.value;
    render();
  });
}

function buildCategoryFilter(courses) {
  const categories = [...new Set(courses.map((course) => course.category).filter(Boolean))].sort();

  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    elements.category.append(option);
  }
}

function render() {
  const visibleCourses = state.courses
    .filter(matchesCategory)
    .filter(matchesQuery)
    .sort(compareCourses);

  renderStats(visibleCourses);
  elements.grid.innerHTML = "";
  elements.empty.hidden = visibleCourses.length > 0;

  const fragment = document.createDocumentFragment();
  for (const course of visibleCourses) {
    fragment.append(renderCourseCard(course));
  }
  elements.grid.append(fragment);
}

function matchesCategory(course) {
  return state.category === "all" || course.category === state.category;
}

function matchesQuery(course) {
  if (!state.query) return true;

  const searchableText = [
    course.code,
    course.name,
    course.teacher,
    course.semester,
    course.category,
    course.content?.review,
    course.assessment?.review,
    course.instructor?.review,
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

function renderStats(courses) {
  elements.courseCount.textContent = courses.length;

  if (courses.length === 0) {
    elements.averageScore.textContent = "0.0";
    return;
  }

  const average = courses.reduce((sum, course) => sum + course.overallScore, 0) / courses.length;
  elements.averageScore.textContent = average.toFixed(1);
}

function renderCourseCard(course) {
  const node = elements.template.content.cloneNode(true);

  node.querySelector(".course-meta").textContent = `${course.code} · ${course.credits} 学分`;
  node.querySelector("h2").textContent = course.name;
  node.querySelector(".overall-score strong").textContent = formatScore(course.overallScore);
  node.querySelector(".teacher").textContent = course.teacher;
  node.querySelector(".semester").textContent = course.semester;
  node.querySelector(".category").textContent = course.category;
  node.querySelector(".content-score").textContent = formatScore(course.content.score);
  node.querySelector(".content-review").textContent = course.content.review;
  node.querySelector(".assessment-score").textContent = formatScore(course.assessment.score);
  node.querySelector(".assessment-review").textContent = course.assessment.review;
  node.querySelector(".teacher-score").textContent = formatScore(course.instructor.score);
  node.querySelector(".teacher-review").textContent = course.instructor.review;
  node.querySelector(".updated-at").textContent = `更新于 ${course.updatedAt}`;

  return node;
}

function formatScore(score) {
  return Number(score).toFixed(1);
}
