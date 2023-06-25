const apiKey = '6c6423d7ee184c9cb9151c65c1671ec4';
const gptKey = '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'
const recipeInput = document.getElementById("recipe-input");
const searchButton = document.getElementById("search-button");
const resultsDiv = document.getElementById("results");
let cart = [];
function addToCart(recipeData) {
    const cartItems = recipeData.extendedIngredients.map(ingredient => {
        const unit = ingredient.unit ? ingredient.unit : '';
        const quantity = ingredient.amount ? ingredient.amount : '';
        const foodCategory = ingredient.aisle ? ingredient.aisle : 'Other';
        return {
            name: ingredient.name,
            quantity: parseFloat(quantity),
            unit: unit,
            recipeTitle: recipeData.title,
            recipeImage: recipeData.image,
            category: foodCategory
        };
    });

    cart.push(cartItems);
    updateCartDisplay();
}


function removeFromCart(recipeData) {
    cart = cart.filter(recipeItems => recipeItems[0].recipeTitle !== recipeData.recipeTitle);
    updateCartDisplay();
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




searchButton.addEventListener("click", async () => {
    const query = recipeInput.value;
    const encodedQuery = encodeURIComponent(query);
    document.getElementById("loading").style.display = "block";
    const response = await fetch(`https://api.spoonacular.com/recipes/complexSearch?query=${encodedQuery}&number=10&apiKey=${apiKey}&instructionsRequired=true&addRecipeInformation=true`);
    // const response = await fetch(`https://api.spoonacular.com/recipes/complexSearch?query=${encodedQuery}&number=10&apiKey=${apiKey}`);
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





async function displaySelectedRecipe(recipeData) {
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

    selectedRecipeDiv.innerHTML = `
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
    `;
    const addToOrderButton = document.createElement("button");
    addToOrderButton.textContent = "Add to Order";
    addToOrderButton.addEventListener("click", () => {
      addToCart(recipeData);
    });
    selectedRecipeDiv.appendChild(addToOrderButton);
    const existingSelectedRecipe = document.querySelector(".selected-recipe");
    if (existingSelectedRecipe) {
      resultsDiv.replaceChild(selectedRecipeDiv, existingSelectedRecipe);
    } else {
      resultsDiv.appendChild(selectedRecipeDiv);
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
  
  
