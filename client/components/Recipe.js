import React from 'react'
import "./Recipe.css"

const Recipe = ({ title, image, ingredients }) => {
    return(
        <div className="recipe">
            <h1>{title}</h1>
            <ol>
                {ingredients.map((ingredient, index) => (
                    <li key={ingredient+index}>
                        {ingredient.text}
                    </li>
                ))}
            </ol>
            <img className='image' src={image} alt="alt_text" />
        </div>
    )
}

export default Recipe