export interface VipPriceCalculation {
  price: number;
  discount: number | string | null;
  calculatedPrice: number;
  amount: string;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

/** 80% means an 80% reduction (multiply by 0.2); a plain 20 means subtract HK$20. */
export function calculateVipPrice(priceValue: unknown, discountValue: unknown): VipPriceCalculation | null {
  const price = readNumber(priceValue);
  if (price === null || price < 0) return null;
  let discount: number | string | null = null;
  let calculatedPrice = price;
  if (discountValue !== null && discountValue !== undefined) {
    if (typeof discountValue === 'string' && discountValue.trim().endsWith('%')) {
      const text = discountValue.trim();
      const percentage = readNumber(text.slice(0, -1).trim());
      if (percentage === null || percentage < 0 || percentage > 100) return null;
      discount = `${percentage}%`;
      calculatedPrice = price * (1 - percentage / 100);
    } else {
      const deduction = readNumber(discountValue);
      if (deduction === null || deduction < 0 || deduction > price) return null;
      discount = deduction;
      calculatedPrice = price - deduction;
    }
  }
  // Round the final payable amount to the nearest whole HK dollar; .50 rounds up.
  calculatedPrice = Math.round(calculatedPrice);
  if (!Number.isSafeInteger(calculatedPrice) || calculatedPrice < 0) return null;
  return { price, discount, calculatedPrice, amount: `HK$ ${calculatedPrice}` };
}
