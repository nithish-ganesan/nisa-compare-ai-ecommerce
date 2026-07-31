export type ProductIntent = {
  productName: string;
  brand: string;
  variant: string;
  storage: string;
  color: string;
};

export type ProductOffer = {
  platform: string;
  productName: string;
  price: number;
  discount: number;
  deliveryCharges: number;
  estimatedDeliveryDate: string;
  sellerName: string;
  rating: number;
  availableOffers: string[];
  bankOffers: string[];
  exchangeOffer: string;
  emi: string;
  warranty: string;
  stockAvailability: string;
  productUrl: string;
  score: number;
  badges: string[];
};

export type ComparisonResponse = {
  intent: ProductIntent;
  recommendation: string;
  summary: string;
  offers: ProductOffer[];
};

export type SaleEvent = {
  platform: string;
  saleName: string;
  productCategory: string;
  discountText: string;
  bankOffer: string;
  startsOn: string;
  endsOn: string;
  saleUrl: string;
};

export type AuthResult = {
  token: string;
  username: string;
  email: string;
  expiresAt: number;
};
