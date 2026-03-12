const ul = document.getElementById("list");

let counties = [];

function renderList(data) {
  ul.innerHTML = "";
  data.forEach((county) => {
    const li = document.createElement("li");
    const div = document.createElement("div");
    const span = document.createElement("span");
    Object.keys(county.data).forEach((year) => {
      const p = document.createElement("p");
      p.textContent = `Year: ${year} - Overall: ${county.data[year].foodInsecurityRate} | Children: ${county.data[year].childFoodInsecurityRate}`;
      div.appendChild(p);
    });

    const rate2023 = county.data["2023"].foodInsecurityRate;
    if (rate2023 > 18.4) {
      li.classList.add("above-average");
    } else {
      li.classList.add("below-average");
    }
    span.textContent = `${county.county}: ${county.data["2023"].foodInsecurityRate}%`;
    li.appendChild(span);
    li.appendChild(div);
    li.addEventListener("click", () => {
      li.classList.toggle("expanded");
    });
    ul.appendChild(li);
  });
}

function updateSummary() {
  const summary = document.getElementById("summary");
  const countyNumber = counties.filter(
    (county) => county.data["2023"].foodInsecurityRate > 18.4,
  );
  summary.textContent = `${countyNumber.length} of 120 counties are above the Kentucky average`;
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
    console.log(error);
  }
}

getData();

const button = document.getElementById("toggle-explainer");
const explainer = document.getElementById("explainer");
button.addEventListener("click", () => {
  explainer.classList.toggle("expanded");
});

const search = document.getElementById("search");

search.addEventListener("input", () => {
  const term = search.value.toLowerCase();
  const items = ul.querySelectorAll("li");
  items.forEach((li) => {
    if (li.textContent.toLowerCase().includes(term)) {
      li.style.display = "";
    } else {
      li.style.display = "none";
    }
  });
});

const sort = document.getElementById("sort");

sort.addEventListener("change", () => {
  const value = sort.value;
  if (value === "high") {
    counties.sort(
      (a, b) =>
        b.data["2023"].foodInsecurityRate - a.data["2023"].foodInsecurityRate,
    );
  } else if (value === "low") {
    counties.sort(
      (a, b) =>
        a.data["2023"].foodInsecurityRate - b.data["2023"].foodInsecurityRate,
    );
  } else {
    counties.sort((a, b) => a.county.localeCompare(b.county));
  }
  renderList(counties);
  updateSummary();
});
