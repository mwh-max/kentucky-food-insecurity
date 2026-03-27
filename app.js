const ul = document.getElementById("list");

const LATEST_YEAR = "2023";
const KY_AVERAGE = 18.4;

let counties = [];

function applySearch() {
  const term = search.value.toLowerCase();
  ul.querySelectorAll("li").forEach((li) => {
    const name = li.querySelector("span").textContent.toLowerCase();
    li.style.display = name.includes(term) ? "" : "none";
  });
}

function renderList(data) {
  ul.innerHTML = "";
  data.forEach((county) => {
    const li = document.createElement("li");
    const div = document.createElement("div");
    const span = document.createElement("span");

    Object.keys(county.data)
      .sort()
      .forEach((year) => {
        const p = document.createElement("p");
        p.textContent = `Year: ${year} - Overall: ${county.data[year].foodInsecurityRate}% | Children: ${county.data[year].childFoodInsecurityRate}%`;
        div.appendChild(p);
      });

    const rate = county.data[LATEST_YEAR].foodInsecurityRate;
    li.classList.add(rate > KY_AVERAGE ? "above-average" : "below-average");

    span.textContent = `${county.county}: ${rate}%`;
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

    li.appendChild(span);
    li.appendChild(div);
    ul.appendChild(li);
  });

  applySearch();
}

function updateSummary() {
  const summary = document.getElementById("summary");
  const count = counties.filter(
    (county) => county.data[LATEST_YEAR].foodInsecurityRate > KY_AVERAGE,
  ).length;
  summary.textContent = `${count} of 120 counties are above the Kentucky average`;
}

async function getData() {
  try {
    const response = await fetch("ky-food-access.json");
    if (!response.ok) {
      throw new Error("Something went wrong");
    }
    counties = await response.json();
    renderList(counties);
    updateSummary();
  } catch (error) {
    console.error(error);
    const summary = document.getElementById("summary");
    summary.textContent = "Failed to load county data. Please refresh the page.";
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
    counties.sort(
      (a, b) =>
        b.data[LATEST_YEAR].foodInsecurityRate -
        a.data[LATEST_YEAR].foodInsecurityRate,
    );
  } else if (value === "low") {
    counties.sort(
      (a, b) =>
        a.data[LATEST_YEAR].foodInsecurityRate -
        b.data[LATEST_YEAR].foodInsecurityRate,
    );
  } else {
    counties.sort((a, b) => a.county.localeCompare(b.county));
  }
  renderList(counties);
});
