import React, { useState, useEffect } from 'react';
import 'normalize.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import Login from './Login';

const API_BASE = 'http://localhost:4000';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [custList, setCustList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [searchColumn, setSearchColumn] = useState('name');
  const [searchInput, setSearchInput] = useState('');
  const [error, setError] = useState('');

  // Check session on load
  useEffect(() => {
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) setIsLoggedIn(true);
  }, []);

  // Load customer data on login
  useEffect(() => {
    if (!isLoggedIn) return;

    const sessionId = localStorage.getItem('sessionId');
    fetch(`${API_BASE}/query/cust`, { headers: { Authorization: sessionId } })
      .then(res => {
        console.log("📡 API response status:", res.status);
        return res.ok ? res.json() : Promise.reject(`Status ${res.status}`);
      })
      .then(data => {
        console.log("✅ Loaded customers:", data.length);
        console.table(data);
        setCustList(data);
        setFilteredList(data);
      })
      .catch(err => {
        console.error('❌ Error loading customers:', err);
        setError('Failed to load customer data');
      });
  }, [isLoggedIn]);

  const handleLogout = async () => {
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        headers: { Authorization: sessionId }
      });
    }
    localStorage.removeItem('sessionId');
    setIsLoggedIn(false);
    setCustList([]);
    setFilteredList([]);
    setSearchInput('');
    setError('');
  };

 const performSearch = () => {
  const term = searchInput.trim().toLowerCase();
  if (!term) {
    console.log("🔁 Empty search, showing top 100 again.");
    setFilteredList(custList);
    return;
  }

  const sessionId = localStorage.getItem('sessionId');
  console.log(`🔎 Searching '${term}' in column '${searchColumn}'`);

  fetch(`${API_BASE}/query/cust/search?column=${searchColumn}&term=${encodeURIComponent(term)}`, {
    headers: { Authorization: sessionId }
  })
    .then(res => {
      console.log("Search response status:", res.status);
      return res.ok ? res.json() : Promise.reject(`Status ${res.status}`);
    })
    .then(data => {
      console.log("✅ Search results:", data.length);
      console.table(data);
      setFilteredList(data);
    })
    .catch(err => {
      console.error("❌ Search failed:", err);
      setError("Failed to search customers");
    });
};

  if (!isLoggedIn) {
    return <Login onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="app-container">
      <div className="logout-container">
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </div>

      <h2 className="app-title">Customer Search Directory</h2>

      <form
        onSubmit={e => {
          e.preventDefault();
          performSearch();
        }}
        className="search-form"
      >
        <input
          type="text"
          placeholder={`Search by ${searchColumn}`}
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="search-input"
        />
        <select
          value={searchColumn}
          onChange={e => setSearchColumn(e.target.value)}
          className="search-input"
        >
          <option value="no_">Account #</option>
          <option value="name">Name</option>
          <option value="surname">Surname</option>
           <option value="addr1">Address</option>
             <option value="addr2">City</option>
               <option value="pc">Postal Code</option>
                      <option value="formatted_phone">Phone</option>
                <option value="email">Email</option>
        </select>
        <button type="submit" className="search-button">Search</button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {filteredList.length > 0 ? (
        <div className="table-wrapper">
          <table className="results-table">
            <thead>
              <tr>
                <th>No_</th>
                <th>Name</th>
                <th>Surname</th>
                <th>Address</th>
                <th>City</th>
                <th>Postal Code</th>
                <th>Email</th>
                <th>Phone</th>
                 <th>PB</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((cust, i) => (
                <tr key={i}>
                  <td>{cust.no_}</td>
                  <td>{cust.name}</td>
                  <td>{cust.surname}</td>
                  <td>{cust.addr1}</td>
                  <td>{cust.addr2}</td>
                   <td>{cust.pc}</td>
                  <td>{cust.email}</td>
                  <td>{cust.formatted_phone}</td>
                   <td>{cust.pb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ textAlign: 'center', marginTop: '20px' }}>No customers found.</p>
      )}

      <footer className="app-footer">
        <div className="footer-content">
          &copy; {new Date().getFullYear()} Oppacu Bank — All Rights Reserved
        </div>
      </footer>
    </div>
  );
}
