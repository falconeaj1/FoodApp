import React, { useState, useEffect } from "react";
import Recipe from "../components/Recipe";
// Probably not necessary since Recipe uses css file in it
import "../components/Recipe.css";
import axios from "axios";

const SearchPage = () => {
  const [recipes, setRecipes] = useState([]);
  const [search, setSearch] = useState([]);
  const [query, setQuery] = useState("");

  const getRecipes = async () => {
    if (!query.trim()) {
      setRecipes([]);
      return;
    }
    try {
      const response = await axios.get(
        `http://localhost:5000/recipes/${query}`
      );
      setRecipes(response.data);
    } catch (error) {
      console.error("ERROR fetching recipes:", error);
    }
  };

  useEffect(() => {
    getRecipes();
  }, [query]);

  const getSearch = (e) => {
    e.preventDefault();
    setQuery(search);
    // TODO: change highlighting on text if old text
    // setSearch("");
  };

  return (
    <div className="Search">
      <form onSubmit={getSearch} className="search-form">
        <input
          className="search-bar"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="search-button" type="submit">
          Search
        </button>
      </form>
      <div className="recipes">
        {recipes.map((recipe) => (
          <Recipe
            key={recipe.recipe.uri}
            title={recipe.recipe.label}
            image={recipe.recipe.image}
            ingredients={recipe.recipe.ingredients}
          />
        ))}
      </div>
    </div>
  );
};

export default SearchPage;