const ul = document.getElementById("list");
const searchStatus = document.getElementById("search-status");

const EARLIEST_YEAR = "2020";
const KY_AVERAGE = 18.4;

let selectedYear = "2023";
let yearlyAverages = {};
let counties = [];
let showChild = false;

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

function updateLegend() {
  const avg = getAverage().toFixed(1);
  document.querySelectorAll(".legend-avg").forEach((el) => {
    el.textContent = `(${avg}%)`;
  });
}

function updateCallout() {
  const callout = document.getElementById("callout");
  if (selectedYear === EARLIEST_YEAR || counties.length === 0) {
    callout.hidden = true;
    return;
  }
  callout.hidden = false;

  const key = showChild ? "childFoodInsecurityRate" : "foodInsecurityRate";
  let mostImproved = counties[0];
  let mostWorsened = counties[0];

  counties.forEach((county) => {
    const diff = county.data[selectedYear][key] - county.data[EARLIEST_YEAR][key];
    const bestDiff =
      mostImproved.data[selectedYear][key] - mostImproved.data[EARLIEST_YEAR][key];
    const worstDiff =
      mostWorsened.data[selectedYear][key] - mostWorsened.data[EARLIEST_YEAR][key];
    if (diff < bestDiff) mostImproved = county;
    if (diff > worstDiff) mostWorsened = county;
  });

  const improvedDiff =
    mostImproved.data[selectedYear][key] - mostImproved.data[EARLIEST_YEAR][key];
  const worsenedDiff =
    mostWorsened.data[selectedYear][key] - mostWorsened.data[EARLIEST_YEAR][key];

  document.getElementById("callout-improved-county").textContent = mostImproved.county;
  document.getElementById("callout-improved-change").textContent =
    `${improvedDiff.toFixed(1)} pts since ${EARLIEST_YEAR}`;

  document.getElementById("callout-worsened-county").textContent = mostWorsened.county;
  document.getElementById("callout-worsened-change").textContent =
    `+${worsenedDiff.toFixed(1)} pts since ${EARLIEST_YEAR}`;
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

    renderList(counties);
    updateSummary();
    updateCallout();
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

const yearSelect = document.getElementById("year");
yearSelect.addEventListener("change", () => {
  selectedYear = yearSelect.value;
  if (sort.value === "high") {
    counties.sort((a, b) => getCurrentRate(b) - getCurrentRate(a));
  } else if (sort.value === "low") {
    counties.sort((a, b) => getCurrentRate(a) - getCurrentRate(b));
  }
  renderList(counties);
  updateSummary();
  updateCallout();
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
  updateCallout();
});
