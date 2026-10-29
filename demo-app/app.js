// Demo Shop: shared logic for every page. Each page sets <body data-page="..."> and this file runs its setup.
// State lives in the browser only: the signed-in user and the cart in sessionStorage,
// sign-ups and placed orders in localStorage. A fresh Playwright browser always starts empty.

const DEMO_USER = { name: "Demo User", email: "demo@shop.test", password: "Demo@123" };

const PRODUCTS = [
  { id: "notebook", name: "Notebook A5", price: 249 },
  { id: "pen", name: "Fountain Pen", price: 899 },
  { id: "lamp", name: "Desk Lamp", price: 1499 },
  { id: "pencils", name: "Pencil Set", price: 199 },
  { id: "bookmark", name: "Leather Bookmark", price: 149 },
  { id: "calendar", name: "Wall Calendar", price: 349 },
];

function rupees(amount) {
  return "₹" + amount.toLocaleString("en-IN");
}

function readJson(storage, key, fallback) {
  try {
    return JSON.parse(storage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(storage, key, value) {
  storage.setItem(key, JSON.stringify(value));
}

function currentUser() {
  return readJson(sessionStorage, "user", null);
}

function requireLogin() {
  // Shop pages need a signed-in user; without one, go back to the login page
  const user = currentUser();
  if (!user) location.replace("login.html");
  return user;
}

function getCart() {
  return readJson(sessionStorage, "cart", {});
}

function cartCount(cart) {
  return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
}

function cartItems(cart) {
  return PRODUCTS.filter((p) => cart[p.id]).map((p) => ({ ...p, qty: cart[p.id], subtotal: p.price * cart[p.id] }));
}

function cartTotal(cart) {
  return cartItems(cart).reduce((sum, item) => sum + item.subtotal, 0);
}

function renderHeader(user) {
  // Header with the cart link and an account menu; "Sign out" is only visible after opening the menu
  const header = document.querySelector(".site-header");
  if (!header) return;
  header.innerHTML = `
    <a class="brand" href="products.html">Demo Shop</a>
    <nav aria-label="Main">
      <a id="cart-link" href="cart.html">Cart (${cartCount(getCart())})</a>
      <div class="menu-wrap">
        <button type="button" id="account-button" class="secondary" aria-haspopup="menu" aria-expanded="false" aria-controls="account-menu">Account</button>
        <ul id="account-menu" class="menu" role="menu" aria-labelledby="account-button" hidden>
          <li role="none" class="menu-label">Signed in as ${user.email}</li>
          <li role="none"><button type="button" role="menuitem" id="sign-out">Sign out</button></li>
        </ul>
      </div>
    </nav>`;

  const button = document.getElementById("account-button");
  const menu = document.getElementById("account-menu");
  const setOpen = (open) => {
    menu.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  };
  button.addEventListener("click", () => setOpen(menu.hidden));
  document.addEventListener("keydown", (e) => e.key === "Escape" && setOpen(false));
  document.addEventListener("click", (e) => !e.target.closest(".menu-wrap") && setOpen(false));

  document.getElementById("sign-out").addEventListener("click", () => {
    sessionStorage.clear();
    sessionStorage.setItem("flash", "You have signed out");
    location.href = "login.html";
  });
}

function updateCartLink() {
  const link = document.getElementById("cart-link");
  if (link) link.textContent = `Cart (${cartCount(getCart())})`;
}

// ---- Pages ----

function initLogin() {
  const flash = sessionStorage.getItem("flash");
  if (flash) {
    document.getElementById("flash").textContent = flash;
    sessionStorage.removeItem("flash");
  }

  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const error = document.getElementById("error");

    if (!email) return (error.textContent = "Email is required");
    if (!password) return (error.textContent = "Password is required");

    const users = [DEMO_USER, ...readJson(localStorage, "users", [])];
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) return (error.textContent = "Invalid email or password");

    writeJson(sessionStorage, "user", { name: user.name, email: user.email });
    location.href = "products.html";
  });
}

function initSignup() {
  document.getElementById("signup-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const error = document.getElementById("error");
    const result = document.getElementById("result");
    error.textContent = "";
    result.textContent = "";

    if (!name || !email || !password) return (error.textContent = "Name, email and password are required");
    if (password.length < 6) return (error.textContent = "Password must be at least 6 characters");

    const users = readJson(localStorage, "users", []);
    if (email.toLowerCase() === DEMO_USER.email || users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return (error.textContent = "An account with this email already exists");
    }

    // The account is "saved" after a short delay, like a real server call
    const button = document.getElementById("create-account");
    button.disabled = true;
    result.textContent = "Creating account...";
    setTimeout(() => {
      users.push({ name, email, password });
      writeJson(localStorage, "users", users);
      result.innerHTML = `Account created for ${name}. You can now sign in. <a href="login.html">Go to sign in</a>`;
      button.disabled = false;
    }, 800);
  });
}

function initProducts() {
  const user = requireLogin();
  if (!user) return;
  renderHeader(user);
  document.getElementById("welcome").textContent = `Welcome, ${user.name}`;

  const list = document.getElementById("product-list");
  const search = document.getElementById("search");
  const sort = document.getElementById("sort");
  const count = document.getElementById("result-count");
  const status = document.getElementById("cart-status");

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const shown = PRODUCTS.filter((p) => p.name.toLowerCase().includes(query));
    if (sort.value === "price-asc") shown.sort((a, b) => a.price - b.price);
    else if (sort.value === "price-desc") shown.sort((a, b) => b.price - a.price);
    else shown.sort((a, b) => a.name.localeCompare(b.name));

    count.textContent = shown.length === 1 ? "1 product found" : `${shown.length} products found`;
    list.innerHTML = shown
      .map(
        (p) => `
      <li class="product">
        <h2>${p.name}</h2>
        <span class="price">${rupees(p.price)}</span>
        <button type="button" data-id="${p.id}" aria-label="Add ${p.name} to cart">Add to cart</button>
      </li>`
      )
      .join("");
  };

  list.addEventListener("click", (e) => {
    const id = e.target.closest("button[data-id]")?.dataset.id;
    if (!id) return;
    const cart = getCart();
    cart[id] = (cart[id] || 0) + 1;
    writeJson(sessionStorage, "cart", cart);
    updateCartLink();
    status.textContent = `${PRODUCTS.find((p) => p.id === id).name} added to cart`;
  });
  search.addEventListener("input", render);
  sort.addEventListener("change", render);
  render();
}

function initCart() {
  const user = requireLogin();
  if (!user) return;
  renderHeader(user);

  const body = document.getElementById("cart-body");
  const render = () => {
    const cart = getCart();
    const items = cartItems(cart);
    document.getElementById("cart-empty").hidden = items.length > 0;
    document.getElementById("cart-content").hidden = items.length === 0;
    body.innerHTML = items
      .map(
        (item) => `
      <tr>
        <td>${item.name}</td>
        <td class="num">${rupees(item.price)}</td>
        <td class="num">${item.qty}</td>
        <td class="num">${rupees(item.subtotal)}</td>
        <td><button type="button" class="secondary" data-id="${item.id}" aria-label="Remove ${item.name}">Remove</button></td>
      </tr>`
      )
      .join("");
    document.getElementById("cart-total").textContent = `Total: ${rupees(cartTotal(cart))}`;
    updateCartLink();
  };

  body.addEventListener("click", (e) => {
    const id = e.target.closest("button[data-id]")?.dataset.id;
    if (!id) return;
    const cart = getCart();
    delete cart[id];
    writeJson(sessionStorage, "cart", cart);
    render();
  });
  render();
}

function initCheckout() {
  const user = requireLogin();
  if (!user) return;
  renderHeader(user);

  const cart = getCart();
  document.getElementById("order-total").textContent = `Order total: ${rupees(cartTotal(cart))}`;

  document.getElementById("checkout-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const error = document.getElementById("error");
    const fields = ["full-name", "address", "city", "pin"].map((id) => document.getElementById(id).value.trim());
    const [fullName, , , pin] = fields;

    if (cartCount(cart) === 0) return (error.textContent = "Your cart is empty");
    if (fields.some((v) => !v)) return (error.textContent = "Please fill in all shipping fields");
    if (!/^\d{6}$/.test(pin)) return (error.textContent = "PIN code must be 6 digits");

    // Order numbers start at DS-1001 in a fresh browser, so tests can check the exact number
    const orders = readJson(localStorage, "orders", []);
    const number = `DS-${1001 + orders.length}`;
    const payment = document.querySelector('input[name="payment"]:checked').value;
    orders.push({ number, total: cartTotal(cart), payment });
    writeJson(localStorage, "orders", orders);
    writeJson(sessionStorage, "lastOrder", { number, name: fullName, total: cartTotal(cart), payment });
    sessionStorage.removeItem("cart");
    location.href = "confirmation.html";
  });
}

function initConfirmation() {
  const user = requireLogin();
  if (!user) return;
  renderHeader(user);

  const order = readJson(sessionStorage, "lastOrder", null);
  if (!order) return location.replace("products.html");
  document.getElementById("order-message").textContent = `Thank you, ${order.name}. Your order number is ${order.number}.`;
  document.getElementById("order-summary").textContent = `Paid ${rupees(order.total)} by ${order.payment}.`;
}

const PAGES = {
  login: initLogin,
  signup: initSignup,
  products: initProducts,
  cart: initCart,
  checkout: initCheckout,
  confirmation: initConfirmation,
};
PAGES[document.body.dataset.page]?.();
