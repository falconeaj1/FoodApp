import { apiKey } from "./config.js";
import { gptKey } from "./config.js";
import { addToCart } from "./cart.js";

const resultsDiv = document.getElementById("results");

export async function displayResults(results) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";
  let validResults = 0;
  let resultIndex = 0;
  while (validResults < 3 && resultIndex < results.length) {
    const result = results[resultIndex];
    const recipeId = result.id;
    const recipeDetails = await fetch(
      `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${apiKey}`
    );
    const recipeData = await recipeDetails.json();
    if (
      recipeData.analyzedInstructions &&
      recipeData.analyzedInstructions.length > 0 &&
      recipeData.extendedIngredients &&
      recipeData.extendedIngredients.length > 0 &&
      recipeData.image &&
      !recipeData.image.includes("149627")
    ) {
      const resultElement = document.createElement("div");
      resultElement.classList.add("result");
      resultElement.innerHTML = `
            <img src="${recipeData.image}" alt="${recipeData.title}" width="200" height="200">
            <h3>${recipeData.title}</h3>
        `;
      resultElement.querySelector("img").addEventListener("click", () => {
        displaySelectedRecipe(recipeData);
      });
      resultsDiv.appendChild(resultElement);
      validResults++;
    }
    resultIndex++;
  }
  if (validResults === 0) {
    resultsDiv.innerHTML = "<p>No results found.</p>";
  }
}

async function displaySelectedRecipe(recipeData) {
  recipeData.originalIngredients = recipeData.originalIngredients || [
    ...recipeData.extendedIngredients,
  ];
  const instructionText =
    recipeData.analyzedInstructions[0]?.steps
      .map((step) => step.step)
      .join("\n") || "";
  const kitchenTools = await getKitchenTools(instructionText);
  const ingredients = recipeData.extendedIngredients.map((ingredient) =>
    ingredient.original.toLowerCase()
  );
  const kitchenToolsList = document.createElement("ol");
  kitchenTools.split("\n").forEach((tool) => {
    const cleanedTool = tool.replace(/^- /, "").replace(/^\d+\. /, ""); // Updated this line to remove the numbering as well
    const lowerCaseTool = cleanedTool.toLowerCase();
    if (!ingredients.some((ingredient) => ingredient.includes(lowerCaseTool))) {
      const li = document.createElement("li");
      li.textContent = cleanedTool;
      kitchenToolsList.appendChild(li);
    }
  });
  const smallAmountKeywords = ["pinch", "garnish", "dash"];
  const ingredientList = recipeData.extendedIngredients
    .map((ingredient) => {
      const original = ingredient.original;
      const smallAmount = smallAmountKeywords.some((keyword) =>
        original.toLowerCase().includes(keyword)
      );
      return `<li>${original}${
        smallAmount ? " <em>(small amount)</em>" : ""
      }</li>`;
    })
    .join("");
  const selectedRecipeDiv = document.createElement("div");
  selectedRecipeDiv.classList.add("selected-recipe");

  const servingsContainer = document.createElement("div");
  servingsContainer.classList.add("servings-container");
  // Create servings label
  const servingsLabel = document.createElement("label");
  servingsLabel.textContent = "Desired Servings:";
  servingsLabel.htmlFor = "servings-input";

  let updatedIngredients = [...recipeData.originalIngredients];
  // Create servings input
  const servingsInput = document.createElement("input");
  servingsInput.type = "number";
  servingsInput.value = recipeData.servings;
  servingsInput.id = "servings-input";

  // selectedRecipeDiv.appendChild(servingsLabel);
  const originalServingsLabel = document.createElement("p");
  originalServingsLabel.textContent = `Original Servings (for shown recipe): ${recipeData.servings}`;
  // selectedRecipeDiv.appendChild(originalServingsLabel);

  servingsContainer.appendChild(servingsLabel);
  servingsContainer.appendChild(servingsInput);
  servingsContainer.appendChild(originalServingsLabel);

  selectedRecipeDiv.appendChild(servingsContainer);

  servingsInput.addEventListener("input", () => {
    const newServings = parseInt(servingsInput.value, 10) || 1;

    if (newServings < 1) {
      servingsInput.value = 1;
      alert("Please enter a number greater than or equal to 1.");
      return;
    } else if (newServings > 100) {
      servingsInput.value = 100;
      alert("Please enter a number less than or equal to 100.");
      return;
    }

    const originalServings = recipeData.servings;
    updatedIngredients = recipeData.originalIngredients.map((ingredient) => {
      const newAmount = (ingredient.amount / originalServings) * newServings;
      return { ...ingredient, amount: newAmount };
    });
  });

  selectedRecipeDiv.insertAdjacentHTML(
    "beforeend",
    `
    <h2>${recipeData.title}</h2>
    <h4>Ingredients:</h4>
    <ul>
      ${ingredientList}
    </ul>
    <h4>Instructions:</h4>
    <ol>
      ${
        recipeData.analyzedInstructions[0]?.steps
          .map((step) => `<li>${step.step}</li>`)
          .join("") || "No instructions available."
      }
    </ol>
    <h4>Items You'll Need:</h4>
    ${kitchenToolsList.outerHTML}
  `
  );

  // Append servings label and input after innerHTML assignment
  //   servingsLabel.insertAdjacentHTML('afterend', servingsInput.outerHTML);
  //   selectedRecipeDiv.insertAdjacentHTML('beforeend', servingsLabel.outerHTML);

  const addToOrderButton = document.createElement("button");
  addToOrderButton.textContent = "Add to Order";
  addToOrderButton.onclick = () => {
    console.log("addToCart function:", addToCart);
    console.log("Button clicked, recipe data:", {
      ...recipeData,
      extendedIngredients: updatedIngredients,
    });
    console.log(
      "Button clicked, servings:",
      parseInt(servingsInput.value, 10) || 1
    );
    addToCart(
      { ...recipeData, extendedIngredients: updatedIngredients },
      parseInt(servingsInput.value, 10) || 1
    );
  };

  selectedRecipeDiv.appendChild(addToOrderButton);

  const existingSelectedRecipe = document.querySelector(".selected-recipe");
  if (existingSelectedRecipe) {
    resultsDiv.replaceChild(selectedRecipeDiv, existingSelectedRecipe);
  } else {
    resultsDiv.appendChild(selectedRecipeDiv);
  }
}

async function getKitchenTools(instructionText) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${gptKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an AI that provides a list of kitchen tools needed for a recipe.",
        },
        {
          role: "user",
          content: `List kitchen tools needed for the following instructions:\n${instructionText}\nExclude basic items like oven and oil.`,
        },
      ],
      max_tokens: 150,
      temperature: 0.25,
    }),
  });
  const data = await response.json();
  if (data.choices && data.choices[0] && data.choices[0].message) {
    const toolsText = data.choices[0].message.content.trim();

    if (data.choices[0].finish_reason === "length") {
      console.warn(
        "API response might have been cut off. Consider increasing max_tokens or check the output."
      );
    }

    return toolsText;
  } else {
    throw new Error("Error fetching data from the OpenAI API");
  }
}
