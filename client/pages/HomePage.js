import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
    return (
        <div className="HomePage">
            <h1>Welcome to Falcon Foods!</h1>
            <div>
                <Link to="/search">
                    <button>Search Recipes</button>
                </Link>
            </div>
        </div>
    );
}

export default HomePage;