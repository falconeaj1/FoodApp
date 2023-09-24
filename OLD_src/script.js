
const recipeInput = document.getElementById("recipe-input");
const searchButton = document.getElementById("search-button");
const resultsDiv = document.getElementById("results");
let cart = [];

searchButton.addEventListener("click", async () => {
    const query = recipeInput.value;
    const encodedQuery = encodeURIComponent(query);
    document.getElementById("loading").style.display = "block";
    const response = await fetch(`https://api.spoonacular.com/recipes/complexSearch?query=${encodedQuery}&number=10&apiKey=${apiKey}&instructionsRequired=true&addRecipeInformation=true`);
    const data = await response.json();
    document.getElementById("loading").style.display = "none";
    displayResults(data.results);
});

async function displayResults(results) {
  resultsDiv.innerHTML = "";
  let validResults = 0;
  let resultIndex = 0;
  while (validResults < 3 && resultIndex < results.length) {
      const result = results[resultIndex];
      const recipeId = result.id;
      const recipeDetails = await fetch(`https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${apiKey}`);
      const recipeData = await recipeDetails.json();
      if (recipeData.analyzedInstructions && recipeData.analyzedInstructions.length > 0 &&
          recipeData.extendedIngredients && recipeData.extendedIngredients.length > 0 &&
          recipeData.image && !recipeData.image.includes("149627")) {
      
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

function addToCart(recipeData, servings) {
  const recipe = {...recipeData, originalIngredients: [...recipeData.extendedIngredients]};
  const cartItem = {
    recipeData: recipeData,
    servings: servings,
    originalServings: recipeData.servings,
    ingredientQuantities: []
  };
  recipeData.extendedIngredients.forEach(ingredient => {
    const ingredientQuantity = {
      id: ingredient.id,
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit
    };
    cartItem.ingredientQuantities.push(ingredientQuantity);
  });
  cart.push(cartItem);
  renderCart();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

function updateCartDisplay() {
    const cartDiv = document.getElementById("cart");
    cartDiv.innerHTML = "<h3>Cart</h3>";
    cart.forEach(recipeItems => {
        const cartItem = document.createElement("div");
        cartItem.innerHTML = `
        <img src="${recipeItems[0].recipeImage}" alt="${recipeItems[0].recipeTitle}" title="${recipeItems[0].recipeSummary}" width="50" height="50">
        <h4>${recipeItems[0].recipeTitle}</h4>
        <button class="remove-from-cart">Remove</button>
        `;
        cartItem.querySelector(".remove-from-cart").addEventListener("click", () => {
            removeFromCart(recipeItems[0]);
        });
        cartDiv.appendChild(cartItem);
    });
    updateGroceryList();
}




async function displaySelectedRecipe(recipeData) {
  recipeData.originalIngredients = recipeData.originalIngredients || [...recipeData.extendedIngredients];

  const instructionText = recipeData.analyzedInstructions[0]?.steps.map(step => step.step).join("\n") || "";
  const kitchenTools = await getKitchenTools(instructionText);
  const ingredients = recipeData.extendedIngredients.map(ingredient => ingredient.original.toLowerCase());
  const kitchenToolsList = document.createElement("ol");
  kitchenTools.split('\n').forEach(tool => {
      const cleanedTool = tool.replace(/^- /, "").replace(/^\d+\. /, ""); // Updated this line to remove the numbering as well
      const lowerCaseTool = cleanedTool.toLowerCase();
      if (!ingredients.some(ingredient => ingredient.includes(lowerCaseTool))) {
        const li = document.createElement("li");
        li.textContent = cleanedTool;
        kitchenToolsList.appendChild(li);
      }
    });
  const smallAmountKeywords = ['pinch', 'garnish', 'dash'];
  const ingredientList = recipeData.extendedIngredients.map(ingredient => {
      const original = ingredient.original;
      const smallAmount = smallAmountKeywords.some(keyword => original.toLowerCase().includes(keyword));
      return `<li>${original}${smallAmount ? ' <em>(small amount)</em>' : ''}</li>`;
    }).join("");
  const selectedRecipeDiv = document.createElement("div");
  selectedRecipeDiv.classList.add("selected-recipe");

  // Create servings label
  const servingsLabel = document.createElement("label");
  servingsLabel.textContent = "Servings:";
  servingsLabel.htmlFor = "servings-input";
  selectedRecipeDiv.appendChild(servingsLabel);


  let updatedIngredients = [...recipeData.originalIngredients];
  // Create servings input
  const servingsInput = document.createElement("input");
  servingsInput.type = "number";
  servingsInput.value = recipeData.servings;
  servingsInput.id = "servings-input";
  selectedRecipeDiv.appendChild(servingsInput);


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
    updatedIngredients = recipeData.originalIngredients.map(ingredient => {
      const newAmount = (ingredient.amount / originalServings) * newServings;
      return { ...ingredient, amount: newAmount };
    });
  });
  
  selectedRecipeDiv.insertAdjacentHTML('beforeend', `
    <h2>${recipeData.title}</h2>
    <h4>Ingredients:</h4>
    <ul>
      ${ingredientList}
    </ul>
    <h4>Instructions:</h4>
    <ol>
      ${recipeData.analyzedInstructions[0]?.steps.map(step => `<li>${step.step}</li>`).join("") || "No instructions available."}
    </ol>
    <h4>Items You'll Need:</h4>
    ${kitchenToolsList.outerHTML}
  `);

  // Append servings label and input after innerHTML assignment
  servingsLabel.insertAdjacentHTML('afterend', servingsInput.outerHTML);
  selectedRecipeDiv.insertAdjacentHTML('beforeend', servingsLabel.outerHTML);

  const addToOrderButton = document.createElement("button");
  addToOrderButton.textContent = "Add to Order";
  addToOrderButton.addEventListener("click", () => {
    addToCart({ ...recipeData, extendedIngredients: updatedIngredients });
  });

  selectedRecipeDiv.insertAdjacentHTML('beforeend', addToOrderButton.outerHTML);

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
            "Authorization": `Bearer ${gptKey}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
                {role: "system", content: "You are an AI that provides a list of kitchen tools needed for a recipe."},
                {role: "user", content: `List kitchen tools needed for the following instructions:\n${instructionText}\nExclude basic items like oven and oil.`}
            ],
            max_tokens: 150,
            temperature: 0.5
        })
    });
    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
        const toolsText = data.choices[0].message.content.trim();

        if (data.choices[0].finish_reason === 'length') {
            console.warn('API response might have been cut off. Consider increasing max_tokens or check the output.');
        }

        return toolsText;
    } else {
        throw new Error("Error fetching data from the OpenAI API");
    }
}



function updateGroceryList() {
    const groceryList = {};
    cart.forEach(recipeItems => {
      recipeItems.forEach(item => {
        const itemKey = `${item.name}:${item.unit}:${item.category}`;
        if (groceryList[itemKey]) {
          groceryList[itemKey] += item.quantity;
        } else {
          groceryList[itemKey] = item.quantity;
        }
      });
    });

    const categorizedItems = categorizeGroceryItems(groceryList);
    const groceryListDiv = document.getElementById("grocery-list");
    groceryListDiv.innerHTML = "<h3>Grocery List</h3>";
  
    for (const [category, items] of Object.entries(categorizedItems)) {
      const categoryElement = document.createElement("div");
      categoryElement.classList.add("category");
      categoryElement.innerHTML = `<h4>${category}</h4>`;
      groceryListDiv.appendChild(categoryElement);
  
      const itemList = document.createElement("ul");
      categoryElement.appendChild(itemList);
  
      items.forEach(item => {
        const li = document.createElement("li");
        li.textContent = `${item.name}: ${item.quantity || ''} ${item.unit || ''}`;
        itemList.appendChild(li);
      });
    }
  }


  function categorizeGroceryItems(groceryList) {
    const categorizedItems = {};
    
    for (const [key, value] of Object.entries(groceryList)) {
      const [name, unit, category] = key.split(':');
      if (!categorizedItems[category]) {
        categorizedItems[category] = [];
      }
      categorizedItems[category].push({ name, quantity: value, unit });
    }
  
    return categorizedItems;
  }


  async function getCleanedGroceryList(groceryList) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${gptKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {role: "system", content: "You are an AI that provides a cleaned-up and combined grocery list."},
          {role: "user", content: `Clean up and combine the following grocery list:\n${Object.entries(groceryList).map(([key, count]) => {
            const [name, unit, category] = key.split(':');
            return `${name}:${count} ${unit}:${category}`;
          }).join('\n')}`}
        ],
        max_tokens: 300,
        temperature: 0.5
      })
    });
    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const cleanedList = data.choices[0].message.content.trim();
  
      if (data.choices[0].finish_reason === 'length') {
        console.warn('API response might have been cut off. Consider increasing max_tokens or check the output.');
      }
  
      return cleanedList.split('\n');
    } else {
      throw new Error("Error fetching data from the OpenAI API");
    }
  }


  function renderCart() {
    const cartList = document.querySelector(".cart-list");
    cartList.innerHTML = "";
  
    const quantities = {};
  
    for (const item of cart) {
      const recipeQuantity = item.recipe.servings;
      recipeServings.textContent = `Servings original = ${recipeQuantity}`;
      const userQuantity = item.quantity;
      const quantityRatio = userQuantity / recipeQuantity;
  
      const recipeItem = document.createElement("li");
      recipeItem.classList.add("cart-item");
  
      const recipeTitle = document.createElement("h3");
      recipeTitle.textContent = item.recipe.title;
      recipeItem.appendChild(recipeTitle);
  
      const servingsContainer = document.createElement("div");
      servingsContainer.classList.add("servings-container");
  
      const recipeServings = document.createElement("p");
      recipeServings.textContent = `Servings: ${userQuantity}`;
      servingsContainer.appendChild(recipeServings);
  
    
  
      recipeItem.appendChild(servingsContainer);
  
      const ingredientsList = document.createElement("ul");
      for (const ingredient of item.recipe.extendedIngredients) {
        const originalQuantity = ingredient.amount;
        const originalUnit = ingredient.unit;
        const originalName = ingredient.name;
        const ingredientId = `${originalName}-${originalQuantity}-${originalUnit}`;
        const userQuantity = originalQuantity * quantityRatio;
        const roundedQuantity = Math.round(userQuantity * 100) / 100;
        if (quantities[ingredientId]) {
          quantities[ingredientId] += roundedQuantity;
        } else {
          quantities[ingredientId] = roundedQuantity;
        }
        const ingredientItem = document.createElement("li");
        ingredientItem.innerHTML = `${roundedQuantity} ${originalUnit} ${originalName}`;
        ingredientsList.appendChild(ingredientItem);
      }
      recipeItem.appendChild(ingredientsList);
  
      const removeButton = document.createElement("button");
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => {
        removeRecipeFromCart(item.recipe);
      });
      recipeItem.appendChild(removeButton);
  
      cartList.appendChild(recipeItem);
    }
  
    const totalIngredients = Object.entries(quantities).map(([ingredientId, quantity]) => {
      const [name, amount, unit] = ingredientId.split("-");
      return `${quantity} ${unit} ${name}`;
    }).join("\n");
  
    const totalIngredientsArea = document.querySelector("#total-ingredients");
    totalIngredientsArea.textContent = totalIngredients;
  }



function updateIngredient(ingredient, newServings) {
  const originalServings = ingredient.originalAmount.unit === "serving" ? ingredient.originalAmount.value : 1;
  const newAmount = (ingredient.amount / originalServings) * newServings;
  if (newAmount < 1) {
    newAmount = 1;
    console.warn("Number of servings is too low. Minimum is 1.");
  } else if (newAmount > 100) {
    newAmount = 100;
    console.warn("Number of servings is too high. Maximum is 100.");
  }
  return {
    name: ingredient.name,
    amount: newAmount,
    unit: ingredient.unit,
    originalAmount: {
      value: ingredient.originalAmount.value,
      unit: ingredient.originalAmount.unit
    }
  };
}
