import { apiKey } from './utils/config.js';
import { displayResults } from './components/displayResults.js';

const recipeInput = document.getElementById("recipe-input");
const searchButton = document.getElementById("search-button");

searchButton.addEventListener("click", async () => {
    const query = recipeInput.value;
    const encodedQuery = encodeURIComponent(query);
    document.getElementById("loading").style.display = "block";
    const response = await fetch(`https://api.spoonacular.com/recipes/complexSearch?query=${encodedQuery}&number=10&apiKey=${apiKey}&instructionsRequired=true&addRecipeInformation=true`);
    const data = await response.json();
    document.getElementById("loading").style.display = "none";
    displayResults(data.results);
});