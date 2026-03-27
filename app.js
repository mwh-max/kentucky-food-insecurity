// DOM references
const ul = document.getElementById("list");
const searchStatus = document.getElementById("search-status");
const search = document.getElementById("search");
const sort = document.getElementById("sort");
const yearSelect = document.getElementById("year");
const toggleRate = document.getElementById("toggle-rate");
const button = document.getElementById("toggle-explainer");
const explainer = document.getElementById("explainer");

// Constants
const EARLIEST_YEAR = "2020";
const KY_AVERAGE = 18.4;
const VALID_YEARS = ["2020", "2021", "2022", "2023"];
const VALID_SORTS = ["alpha", "high", "low"];

// State
let selectedYear = "2023";
let yearlyAverages = {};
let counties = [];
let showChild = false;

// Helpers

function getCurrentRate(county) {
  const key = showChild ? "childFoodInsecurityRate" : "foodInsecurityRate";
  return county.data[selectedYear][key];
}

function getAverage() {
  const key = showChild ? "child" : "overall";
  return yearlyAverages[selectedYear]?.[key] ?? KY_AVERAGE;
}

function getTrend(county) {
  if (selectedYear === EARLIEST_YEAR) return null;
  const key = showChild ? "childFoodInsecurityRate" : "foodInsecurityRate";
  const diff = county.data[selectedYear][key] - county.data[EARLIEST_YEAR][key];
  if (diff > 0.5) return { symbol: "↑", label: `worsened since ${EARLIEST_YEAR}`, cls: "trend-up" };
  if (diff < -0.5) return { symbol: "↓", label: `improved since ${EARLIEST_YEAR}`, cls: "trend-down" };
  return { symbol: "→", label: `stable since ${EARLIEST_YEAR}`, cls: "trend-flat" };
}

function highlightMatch(text, term) {
  const idx = text.toLowerCase().indexOf(term);
  if (idx === -1) return document.createTextNode(text);
  const frag = document.createDocumentFragment();
  if (idx > 0) frag.appendChild(document.createTextNode(text.slice(0, idx)));
  const mark = document.createElement("mark");
  mark.textContent = text.slice(idx, idx + term.length);
  frag.appendChild(mark);
  if (idx + term.length < text.length) {
    frag.appendChild(document.createTextNode(text.slice(idx + term.length)));
  }
  return frag;
}

function applySortOrder() {
  const value = sort.value;
  if (value === "high") {
    counties.sort((a, b) => getCurrentRate(b) - getCurrentRate(a));
  } else if (value === "low") {
    counties.sort((a, b) => getCurrentRate(a) - getCurrentRate(b));
  } else {
    counties.sort((a, b) => a.county.localeCompare(b.county));
  }
}

// Search

function applySearch() {
  const term = search.value.toLowerCase();
  const items = ul.querySelectorAll("li");
  let visible = 0;

  items.forEach((li) => {
    const show = !term || li.dataset.county.includes(term);
    li.style.display = show ? "" : "none";
    if (show) visible++;

    const leftEl = li.querySelector(".card-left");
    const trendEl = leftEl.querySelector(".trend");
    const label = leftEl.dataset.label;

    while (leftEl.firstChild) leftEl.removeChild(leftEl.firstChild);
    leftEl.appendChild(
      term && show
        ? highlightMatch(label + " ", term)
        : document.createTextNode(label + " "),
    );
    if (trendEl) leftEl.appendChild(trendEl);
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

// Legend + summary + callout

function updateLegend() {
  const avg = getAverage().toFixed(1);
  document.querySelectorAll(".legend-avg").forEach((el) => {
    el.textContent = `(${avg}%)`;
  });
}

function updateSummary() {
  const summary = document.getElementById("summary");
  const avg = getAverage();
  const count = counties.filter((county) => getCurrentRate(county) > avg).length;
  summary.textContent = `${count} of ${counties.length} counties are above the Kentucky average`;
}

// Trend chart

function buildChart(county) {
  const years = Object.keys(county.data).sort();
  const svgNS = "http://www.w3.org/2000/svg";

  const W = 360, H = 120;
  const padL = 30, padR = 8, padT = 8, padB = 24;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const allRates = years.flatMap((y) => [
    county.data[y].foodInsecurityRate,
    county.data[y].childFoodInsecurityRate,
  ]);
  const maxRate = Math.ceil(Math.max(...allRates) / 5) * 5;

  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("class", "trend-chart");
  svg.setAttribute("role", "img");

  const title = document.createElementNS(svgNS, "title");
  title.textContent =
    `Food insecurity trend for ${county.county} county. ` +
    years
      .map(
        (y) =>
          `${y}: overall ${county.data[y].foodInsecurityRate}%, children ${county.data[y].childFoodInsecurityRate}%`,
      )
      .join(". ");
  svg.appendChild(title);

  // Gridlines and Y labels at 0%, 50%, and 100% of maxRate
  [0, 0.5, 1].forEach((frac) => {
    const yVal = Math.round(maxRate * frac);
    const y = padT + chartH - frac * chartH;

    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", padL);
    line.setAttribute("y1", y);
    line.setAttribute("x2", W - padR);
    line.setAttribute("y2", y);
    line.setAttribute("class", "chart-grid");
    svg.appendChild(line);

    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", padL - 4);
    label.setAttribute("y", y);
    label.setAttribute("class", "chart-y-label");
    label.setAttribute("text-anchor", "end");
    label.setAttribute("dominant-baseline", "middle");
    label.textContent = `${yVal}%`;
    svg.appendChild(label);
  });

  // Bars
  const groupW = chartW / years.length;
  const barPairW = groupW * 0.55;
  const barW = barPairW / 2 - 1;

  years.forEach((year, i) => {
    const overallRate = county.data[year].foodInsecurityRate;
    const childRate = county.data[year].childFoodInsecurityRate;
    const groupX = padL + i * groupW;
    const pairX = groupX + (groupW - barPairW) / 2;

    const overallH = (overallRate / maxRate) * chartH;
    const childH = (childRate / maxRate) * chartH;

    const overallRect = document.createElementNS(svgNS, "rect");
    overallRect.setAttribute("x", pairX);
    overallRect.setAttribute("y", padT + chartH - overallH);
    overallRect.setAttribute("width", barW);
    overallRect.setAttribute("height", overallH);
    overallRect.setAttribute("class", "chart-bar-overall");
    svg.appendChild(overallRect);

    const childRect = document.createElementNS(svgNS, "rect");
    childRect.setAttribute("x", pairX + barW + 2);
    childRect.setAttribute("y", padT + chartH - childH);
    childRect.setAttribute("width", barW);
    childRect.setAttribute("height", childH);
    childRect.setAttribute("class", "chart-bar-child");
    svg.appendChild(childRect);

    const yearLabel = document.createElementNS(svgNS, "text");
    yearLabel.setAttribute("x", groupX + groupW / 2);
    yearLabel.setAttribute("y", H - 8);
    yearLabel.setAttribute("class", "chart-year-label");
    yearLabel.setAttribute("text-anchor", "middle");
    yearLabel.textContent = year;
    svg.appendChild(yearLabel);
  });

  // KY average reference line for selected year
  const avg = getAverage();
  if (avg <= maxRate) {
    const avgY = padT + chartH - (avg / maxRate) * chartH;

    const avgLine = document.createElementNS(svgNS, "line");
    avgLine.setAttribute("x1", padL);
    avgLine.setAttribute("y1", avgY);
    avgLine.setAttribute("x2", W - padR);
    avgLine.setAttribute("y2", avgY);
    avgLine.setAttribute("class", "chart-avg-line");
    svg.appendChild(avgLine);

    const avgLabel = document.createElementNS(svgNS, "text");
    avgLabel.setAttribute("x", W - padR - 2);
    avgLabel.setAttribute("y", avgY - 3);
    avgLabel.setAttribute("class", "chart-avg-label");
    avgLabel.setAttribute("text-anchor", "end");
    avgLabel.textContent = `KY avg ${selectedYear}`;
    svg.appendChild(avgLabel);
  }

  return svg;
}

// Render

function renderList(data) {
  ul.innerHTML = "";
  const avg = getAverage();
  data.forEach((county) => {
    const li = document.createElement("li");
    const header = document.createElement("span");
    const div = document.createElement("div");

    li.dataset.county = county.county.toLowerCase();

    // Chart
    div.appendChild(buildChart(county));

    // Chart legend
    const chartLegend = document.createElement("div");
    chartLegend.className = "chart-legend";
    chartLegend.setAttribute("aria-hidden", "true");
    const overallItem = document.createElement("span");
    overallItem.className = "chart-legend-item chart-legend-overall";
    overallItem.textContent = "Overall";
    const childItem = document.createElement("span");
    childItem.className = "chart-legend-item chart-legend-child";
    childItem.textContent = "Children";
    chartLegend.appendChild(overallItem);
    chartLegend.appendChild(childItem);
    div.appendChild(chartLegend);

    const rate = getCurrentRate(county);
    li.classList.add(rate > avg ? "above-average" : "below-average");

    const leftEl = document.createElement("span");
    leftEl.className = "card-left";
    const label = `${county.county}: ${rate}%`;
    leftEl.dataset.label = label;
    leftEl.appendChild(document.createTextNode(label + " "));

    const trend = getTrend(county);
    if (trend) {
      const trendEl = document.createElement("span");
      trendEl.className = `trend ${trend.cls}`;
      trendEl.setAttribute("aria-label", trend.label);
      trendEl.textContent = trend.symbol;
      leftEl.appendChild(trendEl);
    }

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

// Data

async function getData() {
  try {
    const response = await fetch("ky-food-access.json");
    if (!response.ok) {
      throw new Error("Something went wrong");
    }
    counties = await response.json();

    const years = Object.keys(counties[0].data).sort();
    years.forEach((year) => {
      yearlyAverages[year] = {
        overall: parseFloat(
          (
            counties.reduce((sum, c) => sum + c.data[year].foodInsecurityRate, 0) /
            counties.length
          ).toFixed(1),
        ),
        child: parseFloat(
          (
            counties.reduce(
              (sum, c) => sum + c.data[year].childFoodInsecurityRate,
              0,
            ) / counties.length
          ).toFixed(1),
        ),
      };
    });

    applySortOrder();
    renderList(counties);
    updateSummary();
  } catch (error) {
    console.error(error);
    document.getElementById("summary").textContent =
      "Failed to load county data. Please refresh the page.";
  }
}

// URL state

function pushState() {
  const params = new URLSearchParams();
  if (selectedYear !== "2023") params.set("year", selectedYear);
  if (sort.value !== "alpha") params.set("sort", sort.value);
  if (showChild) params.set("rate", "child");
  if (search.value) params.set("search", search.value);
  const query = params.toString();
  history.replaceState(null, "", query ? `?${query}` : location.pathname);
}

function restoreState() {
  const params = new URLSearchParams(location.search);

  const year = params.get("year");
  if (VALID_YEARS.includes(year)) {
    selectedYear = year;
    yearSelect.value = year;
  }

  const sortVal = params.get("sort");
  if (VALID_SORTS.includes(sortVal)) {
    sort.value = sortVal;
  }

  if (params.get("rate") === "child") {
    showChild = true;
    toggleRate.setAttribute("aria-pressed", "true");
    toggleRate.textContent = "Show overall rates";
  }

  const searchVal = params.get("search");
  if (searchVal) {
    search.value = searchVal;
  }
}

// Initialize
restoreState();
getData();

// Event listeners

button.addEventListener("click", () => {
  const expanded = explainer.classList.toggle("expanded");
  button.setAttribute("aria-expanded", String(expanded));
});

search.addEventListener("input", () => {
  applySearch();
  pushState();
});

sort.addEventListener("change", () => {
  applySortOrder();
  renderList(counties);
  pushState();
});

yearSelect.addEventListener("change", () => {
  selectedYear = yearSelect.value;
  applySortOrder();
  renderList(counties);
  updateSummary();
  pushState();
});

toggleRate.addEventListener("click", () => {
  showChild = !showChild;
  toggleRate.setAttribute("aria-pressed", String(showChild));
  toggleRate.textContent = showChild ? "Show overall rates" : "Show child rates";
  applySortOrder();
  renderList(counties);
  updateSummary();
  pushState();
});
