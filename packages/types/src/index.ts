// Shared domain types used by apps/api, apps/customer, and apps/admin.
// Keeping these in one place is what stops the frontend and backend from
// drifting out of sync as the schema evolves.

export type OrderStatus =
  | "PENDING_PAYMENT" // Razorpay flow only - see Section 8 of the plan
  | "RECEIVED"
  | "PREPARING"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentMethod = "COUNTER" | "ONLINE";

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  timezone: string;
}

export interface MealSlot {
  id: string;
  restaurantId: string;
  name: "breakfast" | "lunch" | "dinner";
  startTime: string; // "07:00"
  endTime: string; // "10:00"
  cutoffMinutes: number; // orders close this many minutes before endTime
}

export interface TableLocation {
  id: string;
  restaurantId: string;
  label: string;
  qrCodeValue: string;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  isAvailable: boolean;
  imageUrl?: string;
}

export interface OrderItemInput {
  menuItemId: string;
  quantity: number;
}

export interface CreateOrderInput {
  restaurantSlug: string;
  tableId: string;
  mealSlotId: string;
  customerName: string;
  phone: string;
  addressOrFlat: string;
  paymentMethod: PaymentMethod;
  specialInstructions?: string;
  tipAmount?: number;
  items: OrderItemInput[];
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  priceAtOrder: number;
  menuItem?: { name: string };
}

export interface Order {
  id: string;
  restaurantId: string;
  mealSlotId: string;
  tableId?: string;
  customerName: string;
  phone: string;
  addressOrFlat: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  specialInstructions?: string;
  tipAmount: number;
  createdAt: string;
  items: OrderItem[];
}

// ---- Real-time event contracts (shared between ws server and both clients) ----

export interface DemandUpdateEvent {
  type: "demand:update";
  restaurantId: string;
  mealSlotId: string;
  menuItemId: string;
  count: number;
}

export interface NewOrderEvent {
  type: "order:new";
  restaurantId: string;
  order: Order;
}

export interface OrderStatusChangedEvent {
  type: "order:status_changed";
  restaurantId: string;
  orderId: string;
  status: OrderStatus;
}

export type RealtimeEvent =
  | DemandUpdateEvent
  | NewOrderEvent
  | OrderStatusChangedEvent
  | LoungeScoreEvent;

// ---- Waiting Lounge (Section 11) ----

export interface LoungeScoreEvent {
  type: "lounge:score";
  restaurantId: string;
  mealSlotId: string;
  name: string;
  score: number;
}

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}
