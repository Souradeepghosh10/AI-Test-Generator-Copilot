package com.demoshop.mobile;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.Menu;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.InputMethodManager;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.PopupMenu;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Demo Shop: the native Android twin of demo-app/ (same users, products, prices, messages and order numbers),
 * so the same manual test cases work on web and mobile.
 *
 * Every screen is built from plain Android widgets, and every element has a resource id
 * (com.demoshop.mobile:id/...) and, where useful, an accessibility label (content description).
 * State lives in memory only: closing the app (as test tools do between tests) starts a fresh shop,
 * and the first order is always DS-1001.
 */
public class MainActivity extends Activity {

    static final class Product {
        final String id, name;
        final int price;

        Product(String id, String name, int price) {
            this.id = id;
            this.name = name;
            this.price = price;
        }
    }

    static final class User {
        final String name, email, password;

        User(String name, String email, String password) {
            this.name = name;
            this.email = email;
            this.password = password;
        }
    }

    static final User DEMO_USER = new User("Demo User", "demo@shop.test", "Demo@123");

    static final Product[] PRODUCTS = {
        new Product("notebook", "Notebook A5", 249),
        new Product("pen", "Fountain Pen", 899),
        new Product("lamp", "Desk Lamp", 1499),
        new Product("pencils", "Pencil Set", 199),
        new Product("bookmark", "Leather Bookmark", 149),
        new Product("calendar", "Wall Calendar", 349),
    };

    static final String[] SORT_OPTIONS = {"Name (A-Z)", "Price: low to high", "Price: high to low"};
    static final String[] STATES = {"Select a state", "Karnataka", "Maharashtra", "Tamil Nadu", "West Bengal"};
    static final String[] PAYMENTS = {"Cash on delivery", "Card", "UPI"};

    // App state (in memory only, see the class comment)
    static final List<User> signups = new ArrayList<>();
    static final Map<String, Integer> cart = new LinkedHashMap<>();
    static final List<String> history = new ArrayList<>();
    static User user;
    static String flash;
    static int ordersPlaced;
    static String lastOrderMessage, lastOrderSummary;

    static final int ACCENT = Color.rgb(37, 99, 235);
    static final int ERROR = Color.rgb(185, 28, 28);
    static final int SUCCESS = Color.rgb(21, 128, 61);
    static final int MUTED = Color.rgb(75, 85, 99);

    private final Handler handler = new Handler(Looper.getMainLooper());
    private LinearLayout content;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (history.isEmpty()) history.add("login");
        render();
    }

    @Override
    public void onBackPressed() {
        if (history.size() > 1) {
            history.remove(history.size() - 1);
            render();
        } else {
            super.onBackPressed();
        }
    }

    // ---- Navigation ----

    /** Opens a screen on top of the current one (Back returns). */
    private void open(String screen) {
        history.add(screen);
        render();
    }

    /** Replaces the whole history with these screens (Back does not return to the old ones). */
    private void reset(String... screens) {
        history.clear();
        for (String s : screens) history.add(s);
        render();
    }

    private void render() {
        handler.removeCallbacksAndMessages(null);
        String screen = history.get(history.size() - 1);
        boolean shop = !screen.equals("login") && !screen.equals("signup");
        // Shop screens need a signed-in user; without one, go back to the sign in screen
        if (shop && user == null) {
            reset("login");
            return;
        }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.WHITE);
        root.setFitsSystemWindows(true);
        if (shop) root.addView(header());

        ScrollView scroll = new ScrollView(this);
        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(16), dp(16), dp(16), dp(24));
        scroll.addView(content);
        root.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));

        switch (screen) {
            case "login": showLogin(); break;
            case "signup": showSignup(); break;
            case "products": showProducts(); break;
            case "cart": showCart(); break;
            case "checkout": showCheckout(); break;
            case "confirmation": showConfirmation(); break;
        }
        setContentView(root);
    }

    // ---- Screens ----

    private void showLogin() {
        content.addView(heading("Sign in"));
        TextView flashText = message(R.id.flash, SUCCESS);
        if (flash != null) {
            flashText.setText(flash);
            flash = null;
        }
        content.addView(flashText);

        EditText email = field(R.id.email, "Email", "Enter your email",
            InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        EditText password = field(R.id.password, "Password", "Enter your password",
            InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        TextView error = message(R.id.error, ERROR);
        content.addView(error);

        content.addView(primaryButton(R.id.sign_in, "Sign in", v -> {
            String e = email.getText().toString().trim();
            String p = password.getText().toString();
            if (e.isEmpty()) { error.setText("Email is required"); return; }
            if (p.isEmpty()) { error.setText("Password is required"); return; }

            User found = null;
            List<User> users = new ArrayList<>();
            users.add(DEMO_USER);
            users.addAll(signups);
            for (User u : users) {
                if (u.email.equalsIgnoreCase(e) && u.password.equals(p)) found = u;
            }
            if (found == null) { error.setText("Invalid email or password"); return; }

            hideKeyboard();
            user = found;
            reset("products");
        }));
        content.addView(linkButton(R.id.signup_link, "New user? Sign up", v -> open("signup")));
        content.addView(text("Demo account: demo@shop.test / Demo@123", 14, MUTED));
    }

    private void showSignup() {
        content.addView(heading("Create account"));
        EditText name = field(R.id.name, "Full name", "Enter your name",
            InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PERSON_NAME);
        EditText email = field(R.id.email, "Email", "Enter your email",
            InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        EditText password = field(R.id.password, "Password", "At least 6 characters",
            InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);

        content.addView(label("Interests"));
        content.addView(checkBox(R.id.interest_playwright, "Playwright"));
        content.addView(checkBox(R.id.interest_selenium, "Selenium"));
        content.addView(checkBox(R.id.interest_cypress, "Cypress"));

        content.addView(label("State"));
        content.addView(spinner(R.id.state, "State", STATES));

        TextView error = message(R.id.error, ERROR);
        content.addView(error);
        TextView result = message(R.id.result, SUCCESS);
        Button goToSignIn = linkButton(R.id.go_to_sign_in, "Go to sign in", v -> reset("login"));
        goToSignIn.setVisibility(View.GONE);

        Button create = primaryButton(R.id.create_account, "Create account", null);
        create.setOnClickListener(v -> {
            String n = name.getText().toString().trim();
            String e = email.getText().toString().trim();
            String p = password.getText().toString();
            error.setText("");
            result.setText("");
            if (n.isEmpty() || e.isEmpty() || p.isEmpty()) { error.setText("Name, email and password are required"); return; }
            if (p.length() < 6) { error.setText("Password must be at least 6 characters"); return; }
            boolean exists = e.equalsIgnoreCase(DEMO_USER.email);
            for (User u : signups) exists |= u.email.equalsIgnoreCase(e);
            if (exists) { error.setText("An account with this email already exists"); return; }

            // The account is "saved" after a short delay, like a real server call
            hideKeyboard();
            create.setEnabled(false);
            result.setText("Creating account...");
            handler.postDelayed(() -> {
                signups.add(new User(n, e, p));
                result.setText("Account created for " + n + ". You can now sign in.");
                goToSignIn.setVisibility(View.VISIBLE);
                create.setEnabled(true);
            }, 800);
        });
        content.addView(create);
        content.addView(result);
        content.addView(goToSignIn);
        content.addView(linkButton(R.id.sign_in_link, "Already have an account? Sign in", v -> reset("login")));
    }

    private void showProducts() {
        content.addView(heading("Products"));
        content.addView(withId(text("Welcome, " + user.name, 16, Color.BLACK), R.id.welcome));

        EditText search = field(R.id.search, "Search products", "Search by name", InputType.TYPE_CLASS_TEXT);
        content.addView(label("Sort by"));
        Spinner sort = spinner(R.id.sort, "Sort by", SORT_OPTIONS);
        content.addView(sort);

        TextView count = message(R.id.result_count, MUTED);
        content.addView(count);
        // Above the list, so the message is on screen right after tapping any product's button
        TextView status = message(R.id.cart_status, SUCCESS);
        content.addView(status);
        LinearLayout list = new LinearLayout(this);
        list.setId(R.id.product_list);
        list.setOrientation(LinearLayout.VERTICAL);
        list.setContentDescription("Products");
        content.addView(list);

        Runnable show = () -> {
            String query = search.getText().toString().trim().toLowerCase(Locale.ROOT);
            List<Product> shown = new ArrayList<>();
            for (Product p : PRODUCTS) if (p.name.toLowerCase(Locale.ROOT).contains(query)) shown.add(p);
            int order = sort.getSelectedItemPosition();
            if (order == 1) shown.sort(Comparator.comparingInt(p -> p.price));
            else if (order == 2) shown.sort((a, b) -> b.price - a.price);
            else shown.sort(Comparator.comparing(p -> p.name));

            count.setText(shown.size() == 1 ? "1 product found" : shown.size() + " products found");
            list.removeAllViews();
            // One compact row per product (name and price, then the button), so all six fit on one screen
            for (Product p : shown) {
                LinearLayout row = card();
                row.setOrientation(LinearLayout.HORIZONTAL);
                row.setGravity(Gravity.CENTER_VERTICAL);
                LinearLayout details = new LinearLayout(this);
                details.setOrientation(LinearLayout.VERTICAL);
                details.addView(text(p.name, 17, Color.BLACK, true));
                details.addView(text(rupees(p.price), 15, MUTED));
                row.addView(details, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
                Button add = primaryButton(id("add_" + p.id), "Add to cart", v -> {
                    cart.put(p.id, cart.containsKey(p.id) ? cart.get(p.id) + 1 : 1);
                    updateCartButton();
                    status.setText(p.name + " added to cart");
                });
                add.setContentDescription("Add " + p.name + " to cart");
                row.addView(add);
                list.addView(row);
            }
        };
        search.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {}
            @Override public void afterTextChanged(Editable s) { show.run(); }
        });
        sort.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override public void onItemSelected(AdapterView<?> parent, View view, int position, long id) { show.run(); }
            @Override public void onNothingSelected(AdapterView<?> parent) {}
        });
        show.run();
    }

    private void showCart() {
        content.addView(heading("Your cart"));
        if (cartCount() == 0) {
            content.addView(withId(text("Your cart is empty.", 16, Color.BLACK), R.id.cart_empty));
            content.addView(linkButton(R.id.continue_shopping, "Continue shopping", v -> reset("products")));
            return;
        }
        for (Product p : PRODUCTS) {
            if (!cart.containsKey(p.id)) continue;
            int qty = cart.get(p.id);
            LinearLayout row = card();
            row.addView(text(p.name, 18, Color.BLACK, true));
            row.addView(text("Price: " + rupees(p.price), 15, MUTED));
            row.addView(text("Quantity: " + qty, 15, MUTED));
            row.addView(text("Subtotal: " + rupees(p.price * qty), 15, Color.BLACK));
            Button remove = secondaryButton(id("remove_" + p.id), "Remove", v -> {
                cart.remove(p.id);
                render();
            });
            remove.setContentDescription("Remove " + p.name);
            row.addView(remove);
            content.addView(row);
        }
        content.addView(withId(text("Total: " + rupees(cartTotal()), 18, Color.BLACK, true), R.id.cart_total));
        content.addView(primaryButton(R.id.checkout_button, "Proceed to checkout", v -> open("checkout")));
        content.addView(linkButton(R.id.continue_shopping, "Continue shopping", v -> reset("products")));
    }

    private void showCheckout() {
        content.addView(heading("Checkout"));
        content.addView(withId(text("Order total: " + rupees(cartTotal()), 18, Color.BLACK, true), R.id.order_total));

        EditText fullName = field(R.id.full_name, "Full name", null,
            InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PERSON_NAME);
        EditText address = field(R.id.address, "Address", null,
            InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_POSTAL_ADDRESS);
        EditText city = field(R.id.city, "City", null, InputType.TYPE_CLASS_TEXT);
        EditText pin = field(R.id.pin, "PIN code", null, InputType.TYPE_CLASS_NUMBER);

        content.addView(label("Payment method"));
        RadioGroup payment = new RadioGroup(this);
        payment.setId(R.id.payment);
        payment.setContentDescription("Payment method");
        int[] ids = {R.id.pay_cod, R.id.pay_card, R.id.pay_upi};
        for (int i = 0; i < PAYMENTS.length; i++) {
            RadioButton option = new RadioButton(this);
            option.setId(ids[i]);
            option.setText(PAYMENTS[i]);
            option.setTextSize(16);
            payment.addView(option);
        }
        payment.check(R.id.pay_cod);
        content.addView(payment);

        TextView error = message(R.id.error, ERROR);
        content.addView(error);
        content.addView(primaryButton(R.id.place_order, "Place order", v -> {
            String n = fullName.getText().toString().trim();
            String[] values = {n, address.getText().toString().trim(), city.getText().toString().trim(),
                pin.getText().toString().trim()};
            if (cartCount() == 0) { error.setText("Your cart is empty"); return; }
            for (String value : values) {
                if (value.isEmpty()) { error.setText("Please fill in all shipping fields"); return; }
            }
            if (!values[3].matches("\\d{6}")) { error.setText("PIN code must be 6 digits"); return; }

            // Order numbers start at DS-1001 on every app launch, so tests can check the exact number
            String number = "DS-" + (1001 + ordersPlaced++);
            String paidBy = ((RadioButton) findViewById(payment.getCheckedRadioButtonId())).getText().toString();
            lastOrderMessage = "Thank you, " + n + ". Your order number is " + number + ".";
            lastOrderSummary = "Paid " + rupees(cartTotal()) + " by " + paidBy + ".";
            cart.clear();
            hideKeyboard();
            reset("products", "confirmation");
        }));
    }

    private void showConfirmation() {
        content.addView(heading("Order placed"));
        content.addView(withId(text(lastOrderMessage, 16, SUCCESS), R.id.order_message));
        content.addView(withId(text(lastOrderSummary, 16, Color.BLACK), R.id.order_summary));
        content.addView(linkButton(R.id.continue_shopping, "Continue shopping", v -> reset("products")));
    }

    // ---- Header with the cart button and the account menu ----

    private View header() {
        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(16), dp(4), dp(8), dp(4));
        bar.setBackgroundColor(Color.rgb(243, 244, 246));

        TextView brand = text("Demo Shop", 18, Color.BLACK, true);
        brand.setId(R.id.brand);
        brand.setOnClickListener(v -> reset("products"));
        bar.addView(brand, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));

        bar.addView(linkButton(R.id.cart_button, "Cart (" + cartCount() + ")", v -> open("cart")));
        // "Sign out" is only visible after opening the Account menu
        bar.addView(linkButton(R.id.account_button, "Account", v -> {
            PopupMenu menu = new PopupMenu(this, v);
            menu.getMenu().add(Menu.NONE, 1, 1, "Signed in as " + user.email).setEnabled(false);
            menu.getMenu().add(Menu.NONE, 2, 2, "Sign out");
            menu.setOnMenuItemClickListener(item -> {
                if (item.getItemId() != 2) return false;
                user = null;
                cart.clear();
                flash = "You have signed out";
                reset("login");
                return true;
            });
            menu.show();
        }));
        return bar;
    }

    private void updateCartButton() {
        Button button = findViewById(R.id.cart_button);
        if (button != null) button.setText("Cart (" + cartCount() + ")");
    }

    // ---- Cart maths ----

    static int cartCount() {
        int sum = 0;
        for (int qty : cart.values()) sum += qty;
        return sum;
    }

    static int cartTotal() {
        int sum = 0;
        for (Product p : PRODUCTS) if (cart.containsKey(p.id)) sum += p.price * cart.get(p.id);
        return sum;
    }

    static String rupees(int amount) {
        return "₹" + NumberFormat.getIntegerInstance(new Locale("en", "IN")).format(amount);
    }

    // ---- Widgets ----

    private TextView heading(String title) {
        TextView view = text(title, 26, Color.BLACK, true);
        view.setAccessibilityHeading(true);
        view.setPadding(0, 0, 0, dp(8));
        return view;
    }

    private TextView label(String title) {
        TextView view = text(title, 15, Color.BLACK, true);
        view.setPadding(0, dp(12), 0, dp(2));
        return view;
    }

    /** A labelled text field: the label above it, and the same label as its accessibility label. */
    private EditText field(int id, String title, String hint, int inputType) {
        TextView label = label(title);
        EditText input = new EditText(this);
        input.setId(id);
        input.setContentDescription(title);
        input.setInputType(inputType);
        input.setTypeface(Typeface.DEFAULT); // password fields default to a monospace font
        input.setSingleLine(true);
        input.setTextSize(16);
        if (hint != null) input.setHint(hint);
        label.setLabelFor(id);
        content.addView(label);
        content.addView(input);
        return input;
    }

    private TextView text(String value, int sp, int color) {
        return text(value, sp, color, false);
    }

    private TextView text(String value, int sp, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(sp);
        view.setTextColor(color);
        if (bold) view.setTypeface(Typeface.DEFAULT_BOLD);
        view.setPadding(0, dp(4), 0, dp(4));
        return view;
    }

    /** A text that changes after an action (error, status): screen readers announce it. */
    private TextView message(int id, int color) {
        TextView view = text("", 15, color);
        view.setId(id);
        view.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        return view;
    }

    private Button primaryButton(int id, String title, View.OnClickListener onClick) {
        Button button = baseButton(id, title, onClick);
        button.setTextColor(Color.WHITE);
        button.setBackground(rounded(ACCENT));
        return button;
    }

    private Button secondaryButton(int id, String title, View.OnClickListener onClick) {
        Button button = baseButton(id, title, onClick);
        button.setTextColor(ACCENT);
        GradientDrawable border = rounded(Color.WHITE);
        border.setStroke(dp(1), ACCENT);
        button.setBackground(border);
        return button;
    }

    private Button linkButton(int id, String title, View.OnClickListener onClick) {
        Button button = baseButton(id, title, onClick);
        button.setTextColor(ACCENT);
        button.setBackground(null);
        return button;
    }

    private Button baseButton(int id, String title, View.OnClickListener onClick) {
        Button button = new Button(this);
        button.setId(id);
        button.setText(title);
        button.setAllCaps(false);
        button.setTextSize(16);
        button.setOnClickListener(onClick);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.setMargins(0, dp(6), dp(6), dp(6));
        button.setLayoutParams(params);
        return button;
    }

    private CheckBox checkBox(int id, String title) {
        CheckBox box = new CheckBox(this);
        box.setId(id);
        box.setText(title);
        box.setTextSize(16);
        return box;
    }

    private Spinner spinner(int id, String title, String[] options) {
        Spinner spinner = new Spinner(this, Spinner.MODE_DROPDOWN);
        spinner.setId(id);
        spinner.setContentDescription(title);
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, options);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinner.setAdapter(adapter);
        return spinner;
    }

    private LinearLayout card() {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(12), dp(8), dp(12), dp(8));
        GradientDrawable border = rounded(Color.WHITE);
        border.setStroke(dp(1), Color.rgb(209, 213, 219));
        card.setBackground(border);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.setMargins(0, dp(6), 0, dp(6));
        card.setLayoutParams(params);
        return card;
    }

    private GradientDrawable rounded(int color) {
        GradientDrawable shape = new GradientDrawable();
        shape.setColor(color);
        shape.setCornerRadius(dp(8));
        return shape;
    }

    // ---- Helpers ----

    private <T extends View> T withId(T view, int id) {
        view.setId(id);
        return view;
    }

    private int id(String name) {
        return getResources().getIdentifier(name, "id", getPackageName());
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void hideKeyboard() {
        View focus = getCurrentFocus();
        if (focus == null) return;
        ((InputMethodManager) getSystemService(INPUT_METHOD_SERVICE)).hideSoftInputFromWindow(focus.getWindowToken(), 0);
    }
}
