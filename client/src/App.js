import React from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import HomePage from "../pages/HomePage"
import SearchPage from "../pages/SearchPage";
// import CartPage from "../pages/CartPage"
// import SettingsPage from "../pages/SettingsPage";

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/" exact component={HomePage} />
        <Route path="/" exact component={SearchPage} />
        <Route path="/" exact component={CartPage} />
        <Route path="/" exact component={SettingsPage} />
      </Switch>
    </Router>
  );
}

export default App;
