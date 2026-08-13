const state = {
  courseGroups: [],
  reviews: [],
  query: "",
  sort: "updated-desc",
  courseSort: "name-asc",
};

const elements = {
  recentGrid: document.querySelector("#recentGrid"),
  courseGroups: document.querySelector("#courseGroups"),
  empty: document.querySelector("#emptyState"),
  template: document.querySelector("#courseCardTemplate"),
  search: document.querySelector("#searchInput"),
  sort: document.querySelector("#sortSelect"),
  courseSort: document.querySelector("#courseSortSelect"),
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

    state.courseGroups = normalizeCourseGroups(await response.json());
    state.reviews = flattenCourseGroups(state.courseGroups);
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

function normalizeCourseGroups(courseGroups) {
  if (!Array.isArray(courseGroups)) return [];

  return courseGroups.map((courseGroup) => ({
    code: courseGroup.code || "",
    name: courseGroup.name || "未命名课程",
    reviews: Array.isArray(courseGroup.reviews) ? courseGroup.reviews : [],
  }));
}

function flattenCourseGroups(courseGroups) {
  return courseGroups.flatMap((courseGroup) =>
    courseGroup.reviews.map((review, index) => ({
      ...review,
      course: {
        code: courseGroup.code,
        name: courseGroup.name,
      },
      reviewId: `${courseGroup.code || courseGroup.name}-${index}`,
    })),
  );
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

  elements.courseSort.addEventListener("change", (event) => {
    state.courseSort = event.target.value;
    render();
  });
}

function render() {
  const visibleReviews = state.reviews.filter(matchesQuery);

  elements.recentGrid.innerHTML = "";
  elements.courseGroups.innerHTML = "";
  elements.empty.hidden = visibleReviews.length > 0;

  renderRecentCourses(visibleReviews);
  renderCourseGroups(visibleReviews);
}

function matchesQuery(review) {
  if (!state.query) return true;

  const searchableText = [
    review.course?.code,
    review.course?.name,
    review.teacher,
    review.author,
    review.semester,
    review.content?.review,
    review.assessment?.review,
    review.instructor?.review,
    review.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(state.query);
}

function compareReviews(a, b) {
  if (state.sort === "overall-asc") return Number(a.overallScore) - Number(b.overallScore);
  if (state.sort === "updated-desc") return new Date(b.updatedAt) - new Date(a.updatedAt);
  return Number(b.overallScore) - Number(a.overallScore);
}

function renderRecentCourses(reviews) {
  const fragment = document.createDocumentFragment();
  const recentReviews = [...reviews]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 6);

  for (const review of recentReviews) {
    fragment.append(renderCompactCourse(review));
  }

  elements.recentGrid.append(fragment);
}

function renderCourseGroups(reviews) {
  const fragment = document.createDocumentFragment();
  const groupedReviews = groupReviewsByCourse(reviews);

  for (const courseGroup of groupedReviews) {
    const details = document.createElement("details");
    details.className = "course-group";

    const summary = document.createElement("summary");
    summary.className = "course-group-summary";

    const title = document.createElement("span");
    title.textContent = formatCourseHeading(courseGroup);

    const weightedScore = document.createElement("span");
    weightedScore.className = "group-score";
    weightedScore.textContent = formatScore(calculateWeightedScore(courseGroup.reviews));

    const count = document.createElement("span");
    count.className = "group-count";
    count.textContent = `${courseGroup.reviews.length} 条评价`;

    summary.append(title, weightedScore, count);
    details.append(summary);

    const groupGrid = document.createElement("div");
    groupGrid.className = "course-grid";

    for (const review of [...courseGroup.reviews].sort(compareReviews)) {
      groupGrid.append(renderCourseCard(review));
    }

    details.append(wrapCollapsibleContent(groupGrid));
    setupAnimatedDetails(details);
    fragment.append(details);
  }

  elements.courseGroups.append(fragment);
}

function groupReviewsByCourse(reviews) {
  const groups = new Map();

  for (const review of reviews) {
    const code = review.course?.code || "";
    const name = review.course?.name || "未命名课程";
    const key = `${code}::${name}`;

    if (!groups.has(key)) {
      groups.set(key, { code, name, reviews: [] });
    }

    groups.get(key).reviews.push(review);
  }

  return [...groups.values()].sort(compareCourseGroups);
}

function compareCourseGroups(a, b) {
  if (state.courseSort === "code-asc") {
    return (a.code || "").localeCompare(b.code || "", "zh-Hans-CN");
  }

  if (state.courseSort === "score-desc") {
    const scoreDiff = calculateWeightedScore(b.reviews) - calculateWeightedScore(a.reviews);
    if (scoreDiff !== 0) return scoreDiff;
  }

  if (state.courseSort === "count-desc") {
    const countDiff = b.reviews.length - a.reviews.length;
    if (countDiff !== 0) return countDiff;
  }

  const nameDiff = a.name.localeCompare(b.name, "zh-Hans-CN");
  if (nameDiff !== 0) return nameDiff;

  return (a.code || "").localeCompare(b.code || "", "zh-Hans-CN");
}

function calculateWeightedScore(reviews) {
  const validReviews = reviews.filter((review) => Number.isFinite(Number(review.overallScore)));
  if (!validReviews.length) return 0;

  const totalScore = validReviews.reduce((sum, review) => sum + Number(review.overallScore), 0);
  return totalScore / validReviews.length;
}

function renderCompactCourse(review) {
  const details = document.createElement("details");
  details.className = "compact-course";

  const summary = document.createElement("summary");
  summary.className = "compact-summary";

  const text = document.createElement("span");
  text.className = "compact-text";

  const meta = document.createElement("span");
  meta.className = "compact-meta";
  meta.textContent = `${formatAuthor(review.author)} · ${review.updatedAt}`;

  const name = document.createElement("strong");
  name.textContent = review.course?.name || "未命名课程";

  text.append(name, meta);

  const score = document.createElement("span");
  score.className = "compact-score";
  score.textContent = formatScore(review.overallScore);

  summary.append(text, score);
  details.append(summary, wrapCollapsibleContent(renderCompactReviewContent(review)));
  setupAnimatedDetails(details);

  return details;
}

function renderCompactReviewContent(review) {
  const reviewNode = document.createElement("div");
  reviewNode.className = "compact-review";

  reviewNode.append(renderCompactInfo(review));
  reviewNode.append(
    renderReviewSection("课程内容", review.content.score, review.content.review, "content-score"),
    renderReviewSection("考试考核", review.assessment.score, review.assessment.review, "assessment-score"),
    renderReviewSection("老师评价", review.instructor.score, review.instructor.review, "teacher-score"),
  );

  if (review.notes) {
    reviewNode.append(renderReviewSection("其它/备注", null, review.notes));
  }

  return reviewNode;
}

function renderCompactInfo(review) {
  const info = document.createElement("dl");
  info.className = "compact-info";

  info.append(
    renderCompactInfoItem("课程编号", review.course?.code || "暂未填写"),
    renderCompactInfoItem("授课老师", review.teacher || "暂未填写"),
  );

  return info;
}

function renderCompactInfoItem(label, value) {
  const item = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");

  term.textContent = label;
  description.textContent = value;
  item.append(term, description);

  return item;
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

function renderCourseCard(review) {
  const node = elements.template.content.cloneNode(true);

  node.querySelector(".course-meta").textContent = review.course?.code || "";
  node.querySelector("h2").textContent = review.course?.name || "未命名课程";
  node.querySelector(".overall-score strong").textContent = formatScore(review.overallScore);
  node.querySelector(".teacher").textContent = review.teacher || "暂未填写";
  node.querySelector(".author").textContent = formatAuthor(review.author);
  node.querySelector(".semester").textContent = review.semester || "暂未填写";
  node.querySelector(".content-score").textContent = formatScore(review.content.score);
  node.querySelector(".content-review").textContent = review.content.review;
  node.querySelector(".assessment-score").textContent = formatScore(review.assessment.score);
  node.querySelector(".assessment-review").textContent = review.assessment.review;
  node.querySelector(".teacher-score").textContent = formatScore(review.instructor.score);
  node.querySelector(".teacher-review").textContent = review.instructor.review;
  node.querySelector(".notes-review").textContent = review.notes || "";
  node.querySelector(".notes-section").hidden = !review.notes;
  node.querySelector(".updated-at").textContent = `更新于 ${review.updatedAt}`;

  return node;
}

function formatScore(score) {
  return Number(score).toFixed(1);
}

function formatAuthor(author) {
  return `@${author || "匿名"}`;
}

function formatCourseHeading(courseGroup) {
  if (courseGroup.code) {
    return `${courseGroup.code} ${courseGroup.name}`;
  }

  return courseGroup.name;
}
