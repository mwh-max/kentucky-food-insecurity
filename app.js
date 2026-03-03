const ul = document.getElementById("list");

async function getData() {
  try {
    const response = await fetch("ky-food-access.json");
    if (!response.ok) {
      throw new Error("Something went wrong");
    }
    const data = await response.json();
    console.log(data);
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
  } catch (error) {
    console.log(error);
  }
}

getData();

const button = document.getElementById("toggle-explainer");
const explainer = document.getElementById("explainer");
button.addEventListener("click", () => {
  explainer.classList.toggle("explainer");
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
