const ul = document.getElementById("list");
const searchStatus = document.getElementById("search-status");

const LATEST_YEAR = "2023";
const EARLIEST_YEAR = "2020";
const KY_AVERAGE = 18.4;

let KY_CHILD_AVERAGE = 0;
let counties = [];
let showChild = false;

function getCurrentRate(county) {
  const key = showChild ? "childFoodInsecurityRate" : "foodInsecurityRate";
  return county.data[LATEST_YEAR][key];
}

function getAverage() {
  return showChild ? KY_CHILD_AVERAGE : KY_AVERAGE;
}

function getTrend(county) {
  const key = showChild ? "childFoodInsecurityRate" : "foodInsecurityRate";
  const diff = county.data[LATEST_YEAR][key] - county.data[EARLIEST_YEAR][key];
  if (diff > 0.5) return { symbol: "↑", label: "worsened since 2020", cls: "trend-up" };
  if (diff < -0.5) return { symbol: "↓", label: "improved since 2020", cls: "trend-down" };
  return { symbol: "→", label: "stable since 2020", cls: "trend-flat" };
}

function applySearch() {
  const term = search.value.toLowerCase();
  const items = ul.querySelectorAll("li");
  let visible = 0;
  items.forEach((li) => {
    const show = !term || li.dataset.county.includes(term);
    li.style.display = show ? "" : "none";
    if (show) visible++;
  });

  if (term) {
    searchStatus.textContent =
      visible === 0
        ? "No counties match your search."
        : `Showing ${visible} of ${counties.length} counties`;
  } else {
    searchStatus.textContent = "";
  }
}

function updateLegend() {
  const avg = getAverage().toFixed(1);
  document.querySelectorAll(".legend-avg").forEach((el) => {
    el.textContent = `(${avg}%)`;
  });
}

function renderList(data) {
  ul.innerHTML = "";
  const avg = getAverage();
  data.forEach((county) => {
    const li = document.createElement("li");
    const header = document.createElement("span");
    const div = document.createElement("div");

    li.dataset.county = county.county.toLowerCase();

    Object.keys(county.data)
      .sort()
      .forEach((year) => {
        const p = document.createElement("p");
        p.textContent = `Year: ${year} - Overall: ${county.data[year].foodInsecurityRate}% | Children: ${county.data[year].childFoodInsecurityRate}%`;
        div.appendChild(p);
      });

    const rate = getCurrentRate(county);
    li.classList.add(rate > avg ? "above-average" : "below-average");

    const trend = getTrend(county);
    const trendEl = document.createElement("span");
    trendEl.className = `trend ${trend.cls}`;
    trendEl.setAttribute("aria-label", trend.label);
    trendEl.textContent = trend.symbol;

    const leftEl = document.createElement("span");
    leftEl.className = "card-left";
    leftEl.textContent = `${county.county}: ${rate}% `;
    leftEl.appendChild(trendEl);

    li.setAttribute("tabindex", "0");
    li.setAttribute("role", "button");
    li.setAttribute("aria-expanded", "false");

    function toggle() {
      const expanded = li.classList.toggle("expanded");
      li.setAttribute("aria-expanded", String(expanded));
    }

    li.addEventListener("click", toggle);
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });

    header.appendChild(leftEl);
    li.appendChild(header);
    li.appendChild(div);
    ul.appendChild(li);
  });

  applySearch();
  updateLegend();
}

function updateSummary() {
  const summary = document.getElementById("summary");
  const avg = getAverage();
  const count = counties.filter((county) => getCurrentRate(county) > avg).length;
  const label = showChild ? "child food insecurity" : "food insecurity";
  summary.textContent = `${count} of ${counties.length} counties are above the Kentucky average for ${label}`;
}

async function getData() {
  try {
    const response = await fetch("ky-food-access.json");
    if (!response.ok) {
      throw new Error("Something went wrong");
    }
    counties = await response.json();
    KY_CHILD_AVERAGE = parseFloat(
      (
        counties.reduce(
          (sum, c) => sum + c.data[LATEST_YEAR].childFoodInsecurityRate,
          0,
        ) / counties.length
      ).toFixed(1),
    );
    renderList(counties);
    updateSummary();
  } catch (error) {
    console.error(error);
    document.getElementById("summary").textContent =
      "Failed to load county data. Please refresh the page.";
  }
}

getData();

const button = document.getElementById("toggle-explainer");
const explainer = document.getElementById("explainer");
button.addEventListener("click", () => {
  const expanded = explainer.classList.toggle("expanded");
  button.setAttribute("aria-expanded", String(expanded));
});

const search = document.getElementById("search");
search.addEventListener("input", applySearch);

const sort = document.getElementById("sort");
sort.addEventListener("change", () => {
  const value = sort.value;
  if (value === "high") {
    counties.sort((a, b) => getCurrentRate(b) - getCurrentRate(a));
  } else if (value === "low") {
    counties.sort((a, b) => getCurrentRate(a) - getCurrentRate(b));
  } else {
    counties.sort((a, b) => a.county.localeCompare(b.county));
  }
  renderList(counties);
});

const toggleRate = document.getElementById("toggle-rate");
toggleRate.addEventListener("click", () => {
  showChild = !showChild;
  toggleRate.setAttribute("aria-pressed", String(showChild));
  toggleRate.textContent = showChild ? "Show overall rates" : "Show child rates";
  if (sort.value === "high") {
    counties.sort((a, b) => getCurrentRate(b) - getCurrentRate(a));
  } else if (sort.value === "low") {
    counties.sort((a, b) => getCurrentRate(a) - getCurrentRate(b));
  }
  renderList(counties);
  updateSummary();
});
