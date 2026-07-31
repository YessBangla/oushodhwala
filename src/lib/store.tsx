import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { products, type Product } from "@/data/catalog";

export type CartLine = { id: string; qty: number; kind: "product" | "lab"; name: string; price: number };

export type Order = {
  id: string;
  date: string;
  items: CartLine[];
  total: number;
  status: string;
  payment: string;
  address: string;
  phone: string;
};

export type Address = { id: string; label: string; area: string; details: string; phone: string };

type Store = {
  cart: CartLine[];
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  discount: number;
  wishlist: string[];
  toggleWish: (id: string) => void;
  orders: Order[];
  placeOrder: (o: Omit<Order, "id" | "date" | "status">) => Order;
  addresses: Address[];
  addAddress: (a: Omit<Address, "id">) => void;
  removeAddress: (id: string) => void;
  activeAddress: string;
  setActiveAddress: (id: string) => void;
  prescriptions: { id: string; name: string; date: string; status: string }[];
  addPrescription: (name: string) => void;
  user: { name: string; phone: string } | null;
  login: (name: string, phone: string) => void;
  logout: () => void;
};

const Ctx = createContext<Store | null>(null);

const KEY = "oushodhwala-store-v1";

type Persisted = {
  cart: CartLine[];
  wishlist: string[];
  orders: Order[];
  addresses: Address[];
  activeAddress: string;
  prescriptions: { id: string; name: string; date: string; status: string }[];
  user: { name: string; phone: string } | null;
};

const empty: Persisted = {
  cart: [],
  wishlist: [],
  orders: [],
  addresses: [
    { id: "a1", label: "বাসা", area: "ধানমন্ডি, ঢাকা", details: "রোড ৭, বাড়ি ২৩, ফ্ল্যাট ৪বি", phone: "017XXXXXXXX" },
  ],
  activeAddress: "a1",
  prescriptions: [],
  user: null,
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(empty);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...empty, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const value = useMemo<Store>(() => {
    const patch = (u: Partial<Persisted>) => setState((s) => ({ ...s, ...u }));
    const subtotal = state.cart.reduce((t, l) => t + l.price * l.qty, 0);
    const mrpTotal = state.cart.reduce((t, l) => {
      const pr = products.find((x) => x.id === l.id);
      return t + (pr ? pr.mrp : l.price) * l.qty;
    }, 0);
    return {
      cart: state.cart,
      count: state.cart.reduce((t, l) => t + l.qty, 0),
      subtotal,
      discount: Math.max(0, mrpTotal - subtotal),
      add: (line, qty = 1) =>
        setState((s) => {
          const found = s.cart.find((l) => l.id === line.id);
          return {
            ...s,
            cart: found
              ? s.cart.map((l) => (l.id === line.id ? { ...l, qty: l.qty + qty } : l))
              : [...s.cart, { ...line, qty }],
          };
        }),
      setQty: (id, qty) =>
        setState((s) => ({
          ...s,
          cart: qty <= 0 ? s.cart.filter((l) => l.id !== id) : s.cart.map((l) => (l.id === id ? { ...l, qty } : l)),
        })),
      remove: (id) => setState((s) => ({ ...s, cart: s.cart.filter((l) => l.id !== id) })),
      clear: () => patch({ cart: [] }),
      wishlist: state.wishlist,
      toggleWish: (id) =>
        setState((s) => ({
          ...s,
          wishlist: s.wishlist.includes(id) ? s.wishlist.filter((x) => x !== id) : [...s.wishlist, id],
        })),
      orders: state.orders,
      placeOrder: (o) => {
        const order: Order = {
          ...o,
          id: "OW" + Math.floor(100000 + Math.random() * 899999),
          date: new Date().toISOString(),
          status: "নিশ্চিত হয়েছে",
        };
        setState((s) => ({ ...s, orders: [order, ...s.orders], cart: [] }));
        return order;
      },
      addresses: state.addresses,
      addAddress: (a) =>
        setState((s) => {
          const id = "a" + Date.now();
          return { ...s, addresses: [...s.addresses, { ...a, id }], activeAddress: id };
        }),
      removeAddress: (id) => setState((s) => ({ ...s, addresses: s.addresses.filter((a) => a.id !== id) })),
      activeAddress: state.activeAddress,
      setActiveAddress: (id) => patch({ activeAddress: id }),
      prescriptions: state.prescriptions,
      addPrescription: (name) =>
        setState((s) => ({
          ...s,
          prescriptions: [
            { id: "rx" + Date.now(), name, date: new Date().toISOString(), status: "ফার্মাসিস্ট যাচাই করছেন" },
            ...s.prescriptions,
          ],
        })),
      user: state.user,
      login: (name, phone) => patch({ user: { name, phone } }),
      logout: () => patch({ user: null }),
    };
  }, [state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be used within StoreProvider");
  return c;
}

export const toLine = (pr: Product): Omit<CartLine, "qty"> => ({
  id: pr.id,
  kind: "product",
  name: pr.name,
  price: pr.price,
});
