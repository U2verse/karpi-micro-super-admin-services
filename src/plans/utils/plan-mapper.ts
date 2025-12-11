// Convert DB numeric → UI string
export const toUIValue = (value: number | null) => {
  if (value === null) return null;
  return value === -1 ? "Unlimited" : value.toString();
};

// Convert UI string/number → DB numeric
export const toDBValue = (value: string | number | null | undefined): number => {
  // If frontend sends nothing → default to -1 = Unlimited
  if (value === null || value === undefined || value === "") {
    return -1;
  }

  // Already number
  if (typeof value === "number") {
    return value;
  }

  // "Unlimited"
  if (value.toLowerCase() === "unlimited") {
    return -1;
  }

  return Number(value);
};

