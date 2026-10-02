import { tax } from "../common/tax";

export const priceOf = (n: number) => n * 100 + tax(n);
