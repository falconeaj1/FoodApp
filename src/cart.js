export let cart = [];

export function addToCart(recipeData, servings) {
  console.log("Adding to cart:", recipeData, servings);
  console.log("RecipeData:", recipeData);
  console.log("Servings:", servings);
  const recipe = {
    ...recipeData,
    originalIngredients: [...recipeData.extendedIngredients],
  };
  const cartItem = {
    recipeData: recipeData,
    servings: servings,
    originalServings: recipeData.servings,
    ingredientQuantities: [],
  };
  recipeData.extendedIngredients.forEach((ingredient) => {
    const ingredientQuantity = {
      id: ingredient.id,
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
    };
    cartItem.ingredientQuantities.push(ingredientQuantity);
  });
  cart.push(cartItem);
  renderCart();
}

export function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

export function updateCartDisplay() {
  const cartDiv = document.getElementById("cart");
  cartDiv.innerHTML = "<h3>Cart</h3>";
  cart.forEach((cartItem) => {
    const itemElement = document.createElement("div");
    itemElement.innerHTML = `
        <img src="${cartItem.recipeData.image}" alt="${cartItem.recipeData.title}" title="${cartItem.recipeData.summary}" width="50" height="50">
        <h4>${cartItem.recipeData.title}</h4>
        <button class="remove-from-cart">Remove</button>
        `;
    itemElement
      .querySelector(".remove-from-cart")
      .addEventListener("click", () => {
        removeFromCart(cart.indexOf(cartItem));
      });
    cartDiv.appendChild(itemElement);
  });
  updateGroceryList();
}


export function updateGroceryList() {
  const groceryList = {};
  cart.forEach((recipeItems) => {
    recipeItems.forEach((item) => {
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

    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.name}: ${item.quantity || ""} ${
        item.unit || ""
      }`;
      itemList.appendChild(li);
    });
  }
}

export function categorizeGroceryItems(groceryList) {
  const categorizedItems = {};

  for (const [key, value] of Object.entries(groceryList)) {
    const [name, unit, category] = key.split(":");
    if (!categorizedItems[category]) {
      categorizedItems[category] = [];
    }
    categorizedItems[category].push({ name, quantity: value, unit });
  }

  return categorizedItems;
}

export async function getCleanedGroceryList(groceryList) {
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
            "You are an AI that provides a cleaned-up and combined grocery list.",
        },
        {
          role: "user",
          content: `Clean up and combine the following grocery list:\n${Object.entries(
            groceryList
          )
            .map(([key, count]) => {
              const [name, unit, category] = key.split(":");
              return `${name}:${count} ${unit}:${category}`;
            })
            .join("\n")}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.5,
    }),
  });
  const data = await response.json();
  if (data.choices && data.choices[0] && data.choices[0].message) {
    const cleanedList = data.choices[0].message.content.trim();

    if (data.choices[0].finish_reason === "length") {
      console.warn(
        "API response might have been cut off. Consider increasing max_tokens or check the output."
      );
    }

    return cleanedList.split("\n");
  } else {
    throw new Error("Error fetching data from the OpenAI API");
  }
}

export function renderCart() {
  const cartList = document.querySelector(".cart-list");
  cartList.innerHTML = "";

  const quantities = {};


  console.log("Cart:", cart);



  for (const item of cart) {
    console.log("Item:", item);

    
    const recipeQuantity = item.originalServings;//recipe.servings;
    const userQuantity = item.servings;//quantity;
    const quantityRatio = userQuantity / recipeQuantity;

    const recipeItem = document.createElement("li");
    recipeItem.classList.add("cart-item");

    const recipeTitle = document.createElement("h3");
    recipeTitle.textContent = item.recipe.title;
    recipeItem.appendChild(recipeTitle);

    const servingsContainer = document.createElement("div");
    servingsContainer.classList.add("servings-container");

    const recipeServings = document.createElement("p");
    recipeServings.textContent = `Servings original = ${recipeQuantity}`;
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

  const totalIngredients = Object.entries(quantities)
    .map(([ingredientId, quantity]) => {
      const [name, amount, unit] = ingredientId.split("-");
      return `${quantity} ${unit} ${name}`;
    })
    .join("\n");

  const totalIngredientsArea = document.querySelector("#total-ingredients");
  totalIngredientsArea.textContent = totalIngredients;
}

function updateIngredient(ingredient, newServings) {
  const originalServings =
    ingredient.originalAmount.unit === "serving"
      ? ingredient.originalAmount.value
      : 1;
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
      unit: ingredient.originalAmount.unit,
    },
  };
}
